/**
 * crypto/aes 模块 — AES 对称加密 / 解密
 *
 * 提供 aes_encrypt 和 aes_decrypt 两个自定义函数，供 rune 规则引擎使用:
 *   aes_encrypt(algorithm, data, key, iv, padding?)  — AES 加密
 *   aes_decrypt(algorithm, data, key, iv, padding?)  — AES 解密
 *
 * 支持的算法模式: aes-128-cbc, aes-256-cbc, aes-128-gcm, aes-256-gcm, aes-128-ctr, aes-256-ctr
 * 支持的填充模式 (仅 CBC): pkcs7 (默认), zero, none
 * 所有输入/输出均为 Uint8Array 字节数组
 * 错误策略: fail-fast，参数类型/长度不合法时抛出 Error
 */

import type { AllowedValue } from "@grimoire/rune";
import { cbc } from "@noble/ciphers/aes.js";
import { gcm } from "@noble/ciphers/aes.js";
import { ctr } from "@noble/ciphers/aes.js";
import { unsafe } from "@noble/ciphers/aes.js";

/** AES 算法模式类型 */
type AesAlgorithm =
  | "aes-128-cbc"
  | "aes-256-cbc"
  | "aes-128-gcm"
  | "aes-256-gcm"
  | "aes-128-ctr"
  | "aes-256-ctr";

const AES_ALGORITHMS: readonly string[] = [
  "aes-128-cbc", "aes-256-cbc",
  "aes-128-gcm", "aes-256-gcm",
  "aes-128-ctr", "aes-256-ctr",
];

/** 填充模式类型 */
type PaddingMode = "pkcs7" | "zero" | "none";
const PADDING_MODES: readonly string[] = ["pkcs7", "zero", "none"];

/** AES 块大小: 16 字节 */
const AES_BLOCK_SIZE = 16;

/** GCM IV 大小: 12 字节 */
const GCM_IV_SIZE = 12;

/** 根据算法名获取密钥长度 */
function getKeySize(algorithm: AesAlgorithm): number {
  return algorithm.includes("128") ? 16 : 32;
}

/** 验证密钥/IV 长度并抛出友好错误 */
function validateSizes(algorithm: AesAlgorithm, key: Uint8Array, iv: Uint8Array): void {
  const expectedKeySize = getKeySize(algorithm);
  if (key.length !== expectedKeySize) {
    throw new Error(
      `aes: 密钥长度应为 ${expectedKeySize} 字节 (${algorithm})，实际为 ${key.length} 字节`,
    );
  }

  if (algorithm.includes("gcm")) {
    if (iv.length !== GCM_IV_SIZE) {
      throw new Error(
        `aes: GCM 模式 IV 长度应为 ${GCM_IV_SIZE} 字节，实际为 ${iv.length} 字节`,
      );
    }
  } else {
    if (iv.length !== AES_BLOCK_SIZE) {
      throw new Error(
        `aes: IV 长度应为 ${AES_BLOCK_SIZE} 字节，实际为 ${iv.length} 字节`,
      );
    }
  }
}

// ---- 填充处理 ----

/** PKCS#7 填充 */
function pkcs7Pad(data: Uint8Array): Uint8Array {
  const padLen = AES_BLOCK_SIZE - (data.length % AES_BLOCK_SIZE);
  const padded = new Uint8Array(data.length + padLen);
  padded.set(data);
  padded.fill(padLen, data.length);
  return padded;
}

/** PKCS#7 去填充，失败抛出 Error */
function pkcs7Unpad(data: Uint8Array): Uint8Array {
  if (data.length === 0) throw new Error("aes: 解密数据为空，无法去除填充");
  if (data.length % AES_BLOCK_SIZE !== 0) {
    throw new Error("aes: 解密数据长度不是块大小的整数倍");
  }
  const padLen = data[data.length - 1];
  if (padLen < 1 || padLen > AES_BLOCK_SIZE) {
    throw new Error(`aes: PKCS#7 填充值异常: ${padLen}`);
  }
  // 验证所有填充字节
  for (let i = data.length - padLen; i < data.length; i++) {
    if (data[i] !== padLen) {
      throw new Error("aes: PKCS#7 填充校验失败");
    }
  }
  return data.slice(0, data.length - padLen);
}

/** Zero 填充 */
function zeroPad(data: Uint8Array): Uint8Array {
  const padLen = AES_BLOCK_SIZE - (data.length % AES_BLOCK_SIZE);
  if (padLen === AES_BLOCK_SIZE) return data;
  const padded = new Uint8Array(data.length + padLen);
  padded.set(data);
  return padded;
}

/** Zero 去填充 */
function zeroUnpad(data: Uint8Array): Uint8Array {
  if (data.length === 0) throw new Error("aes: 解密数据为空，无法去除填充");
  let end = data.length;
  while (end > 0 && data[end - 1] === 0) {
    end--;
  }
  if (end === 0) {
    throw new Error("aes: Zero 填充去除后数据为空");
  }
  return data.slice(0, end);
}

/** 应用填充 */
function applyPadding(data: Uint8Array, mode: PaddingMode): Uint8Array {
  switch (mode) {
    case "pkcs7": return pkcs7Pad(data);
    case "zero":  return zeroPad(data);
    case "none":
      if (data.length % AES_BLOCK_SIZE !== 0) {
        throw new Error(
          `aes: 使用 "none" 填充模式时，明文长度必须是 ${AES_BLOCK_SIZE} 的整数倍，当前 ${data.length} 字节`,
        );
      }
      return data;
    default:
      throw new Error(`aes: 不支持的填充模式 "${mode}"`);
  }
}

/** 去除填充 */
function removePadding(data: Uint8Array, mode: PaddingMode): Uint8Array {
  switch (mode) {
    case "pkcs7": return pkcs7Unpad(data);
    case "zero":  return zeroUnpad(data);
    case "none":  return data;
    default:
      throw new Error(`aes: 不支持的填充模式 "${mode}"`);
  }
}

// ---- Raw CBC（无内置填充，用于 zero/none 模式） ----

/** Raw CBC 加密 — 使用 unsafe.encryptBlock 实现，调用方负责填充 */
function rawCbcEncrypt(key: Uint8Array, iv: Uint8Array, data: Uint8Array): Uint8Array {
  const expandedKey = unsafe.expandKeyLE(key);
  const result = new Uint8Array(data.length);
  // 从 iv 副本开始，避免修改原始 IV
  let prev = new Uint8Array(iv);

  for (let i = 0; i < data.length; i += AES_BLOCK_SIZE) {
    // 每轮创建新的输入 buffer，避免 encryptBlock 原地修改的副作用
    const input = new Uint8Array(AES_BLOCK_SIZE);
    for (let j = 0; j < AES_BLOCK_SIZE; j++) {
      input[j] = data[i + j] ^ prev[j];
    }
    const cipherBlock = unsafe.encryptBlock(expandedKey, input);
    // 复制密文作为下一轮的 prev（避免共享底层 buffer）
    prev = new Uint8Array(cipherBlock.buffer.slice(cipherBlock.byteOffset, cipherBlock.byteOffset + AES_BLOCK_SIZE));
    result.set(prev, i);
  }
  return result;
}

/** Raw CBC 解密 — 使用 unsafe.decryptBlock 实现，调用方负责去填充 */
function rawCbcDecrypt(key: Uint8Array, iv: Uint8Array, data: Uint8Array): Uint8Array {
  const expandedKey = unsafe.expandKeyDecLE(key);
  const result = new Uint8Array(data.length);
  let prev = new Uint8Array(iv);

  for (let i = 0; i < data.length; i += AES_BLOCK_SIZE) {
    // decryptBlock 会原地修改输入 buffer，因此需要两份独立的密文副本:
    // 一份传给 decryptBlock（会被修改），一份保存为下一轮的 prev（不可修改）
    const cipherForDecrypt = data.slice(i, i + AES_BLOCK_SIZE);
    const cipherForPrev = new Uint8Array(cipherForDecrypt);
    const decrypted = unsafe.decryptBlock(expandedKey, cipherForDecrypt);
    for (let j = 0; j < AES_BLOCK_SIZE; j++) {
      result[i + j] = decrypted[j] ^ prev[j];
    }
    prev = cipherForPrev;
  }
  return result;
}

// ---- AES 加密/解密主函数 ----

/**
 * AES 加密
 *
 * @param args - args[0] 算法模式, args[1] Uint8Array 明文, args[2] Uint8Array 密钥, args[3] Uint8Array IV, args[4] 可选填充模式 (默认 pkcs7)
 * @returns Uint8Array 密文（GCM 模式尾部 16 字节为认证标签）
 * @throws 参数错误或加密失败时抛出
 */
export function aes_encrypt(...args: AllowedValue[]): AllowedValue {
  const algorithm = args[0];
  const data = args[1];
  const key = args[2];
  const iv = args[3];
  const rawPadding = args[4];

  if (typeof algorithm !== "string" || !AES_ALGORITHMS.includes(algorithm)) {
    throw new TypeError(
      `aes_encrypt: 第一个参数 algorithm 必须是以下之一: ${AES_ALGORITHMS.join(", ")}`,
    );
  }
  if (!(data instanceof Uint8Array)) {
    throw new TypeError("aes_encrypt: 第二个参数 data 必须是 Uint8Array");
  }
  if (!(key instanceof Uint8Array)) {
    throw new TypeError("aes_encrypt: 第三个参数 key 必须是 Uint8Array");
  }
  if (!(iv instanceof Uint8Array)) {
    throw new TypeError("aes_encrypt: 第四个参数 iv 必须是 Uint8Array");
  }

  const algo = algorithm as AesAlgorithm;
  const isCbc = algo.includes("cbc");
  const isGcm = algo.includes("gcm");
  const isCtr = algo.includes("ctr");

  // 填充模式仅 CBC 需要
  let padding: PaddingMode = "pkcs7";
  if (isCbc && rawPadding !== undefined) {
    if (typeof rawPadding !== "string" || !PADDING_MODES.includes(rawPadding)) {
      throw new TypeError(
        `aes_encrypt: padding 必须是以下之一: ${PADDING_MODES.join(", ")}`,
      );
    }
    padding = rawPadding as PaddingMode;
  }

  validateSizes(algo, key, iv);

  try {
    if (isCbc && padding !== "pkcs7") {
      // Zero/None 填充: 手动填充 + raw CBC
      const padded = applyPadding(data, padding);
      return rawCbcEncrypt(key, iv, padded) as unknown as AllowedValue;
    }
    if (isCbc) {
      // PKCS#7: @noble/ciphers v2 的 cbc 内置 PKCS#7 处理
      return cbc(key, iv).encrypt(data) as unknown as AllowedValue;
    }
    if (isGcm) {
      return gcm(key, iv).encrypt(data) as unknown as AllowedValue;
    }
    // CTR
    return ctr(key, iv).encrypt(data) as unknown as AllowedValue;
  } catch (e) {
    throw new Error(`aes_encrypt: 加密失败 — ${(e as Error).message}`);
  }
}

/**
 * AES 解密
 *
 * @param args - args[0] 算法模式, args[1] Uint8Array 密文, args[2] Uint8Array 密钥, args[3] Uint8Array IV, args[4] 可选填充模式 (默认 pkcs7)
 * @returns Uint8Array 明文
 * @throws 参数错误或解密失败（含 GCM 认证失败）时抛出
 */
export function aes_decrypt(...args: AllowedValue[]): AllowedValue {
  const algorithm = args[0];
  const data = args[1];
  const key = args[2];
  const iv = args[3];
  const rawPadding = args[4];

  if (typeof algorithm !== "string" || !AES_ALGORITHMS.includes(algorithm)) {
    throw new TypeError(
      `aes_decrypt: 第一个参数 algorithm 必须是以下之一: ${AES_ALGORITHMS.join(", ")}`,
    );
  }
  if (!(data instanceof Uint8Array)) {
    throw new TypeError("aes_decrypt: 第二个参数 data 必须是 Uint8Array");
  }
  if (!(key instanceof Uint8Array)) {
    throw new TypeError("aes_decrypt: 第三个参数 key 必须是 Uint8Array");
  }
  if (!(iv instanceof Uint8Array)) {
    throw new TypeError("aes_decrypt: 第四个参数 iv 必须是 Uint8Array");
  }

  const algo = algorithm as AesAlgorithm;
  const isCbc = algo.includes("cbc");
  const isGcm = algo.includes("gcm");
  const isCtr = algo.includes("ctr");

  let padding: PaddingMode = "pkcs7";
  if (isCbc && rawPadding !== undefined) {
    if (typeof rawPadding !== "string" || !PADDING_MODES.includes(rawPadding)) {
      throw new TypeError(
        `aes_decrypt: padding 必须是以下之一: ${PADDING_MODES.join(", ")}`,
      );
    }
    padding = rawPadding as PaddingMode;
  }

  validateSizes(algo, key, iv);

  try {
    if (isCbc && padding !== "pkcs7") {
      // Zero/None 填充: raw CBC 解密 + 手动去填充
      const raw = rawCbcDecrypt(key, iv, data);
      return removePadding(raw, padding) as unknown as AllowedValue;
    }
    if (isCbc) {
      // PKCS#7: @noble/ciphers v2 的 cbc 内置 PKCS#7 处理
      return cbc(key, iv).decrypt(data) as unknown as AllowedValue;
    }
    if (isGcm) {
      return gcm(key, iv).decrypt(data) as unknown as AllowedValue;
    }
    // CTR
    return ctr(key, iv).decrypt(data) as unknown as AllowedValue;
  } catch (e) {
    throw new Error(`aes_decrypt: 解密失败 — ${(e as Error).message}`);
  }
}
