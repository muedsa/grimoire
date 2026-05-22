/**
 * encoding 模块 — 字符串与 bytes 之间的编码转换
 *
 * 为 rune 规则引擎提供 decode / encode 两个自定义函数:
 *   decode(data, from) — 将字符串从指定编码转换为 Uint8Array
 *   encode(data, to)   — 将 Uint8Array 转换为指定编码的字符串
 *
 * 支持的编码格式: utf8, hex, base64, base64url
 * 错误策略: fail-fast，参数类型/格式错误时抛出 TypeError/Error
 */

import type { AllowedValue, CustomFunction } from "@grimoire/rune";

// ---- 内部工具函数 ----

/** 支持的编码格式 */
type Encoding = "utf8" | "hex" | "base64" | "base64url";
const VALID_ENCODINGS: readonly string[] = ["utf8", "hex", "base64", "base64url"];

/** UTF-8 字符串 → Uint8Array */
function utf8ToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/** Uint8Array → UTF-8 字符串 */
function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

/** 十六进制字符串 → Uint8Array */
function hexToBytes(hex: string): Uint8Array {
  const normalized = hex.trim().toLowerCase();
  if (normalized.length % 2 !== 0) {
    throw new Error("decode: 十六进制字符串长度必须为偶数");
  }
  if (!/^[0-9a-f]*$/.test(normalized)) {
    throw new Error("decode: 十六进制字符串包含非法字符");
  }
  const len = normalized.length / 2;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = parseInt(normalized.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** Uint8Array → 十六进制字符串（小写） */
function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

/** Base64 字符集 */
const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Base64 字符串 → Uint8Array（兼容有无 = 填充两种格式） */
function base64ToBytes(b64: string): Uint8Array {
  const cleaned = b64.replace(/\s/g, "");

  // 去掉尾部等号，只保留有效 Base64 字符
  const stripped = cleaned.replace(/=+$/, "");

  // 计算输出字节数: 每 4 个 base64 字符 = 3 字节
  // 不完整组: 2 字符 → 1 字节, 3 字符 → 2 字节, 1 字符 → 错误
  const fullGroups = Math.floor(stripped.length / 4) * 3;
  const remainder = stripped.length % 4;
  let extraBytes = 0;
  if (remainder === 1) throw new Error("decode: Base64 字符串长度无效");
  if (remainder === 2) extraBytes = 1;
  if (remainder === 3) extraBytes = 2;

  // 部分组已通过字符数隐含了填充字节信息，无需再减 padCount
  const outLen = fullGroups + extraBytes;

  const bytes = new Uint8Array(outLen);
  let byteIdx = 0;

  for (let i = 0; i < stripped.length; i += 4) {
    const c0 = i < stripped.length ? BASE64_ALPHABET.indexOf(stripped[i]) : -1;
    const c1 = i + 1 < stripped.length ? BASE64_ALPHABET.indexOf(stripped[i + 1]) : 0;
    const c2 = i + 2 < stripped.length ? BASE64_ALPHABET.indexOf(stripped[i + 2]) : 0;
    const c3 = i + 3 < stripped.length ? BASE64_ALPHABET.indexOf(stripped[i + 3]) : 0;

    if (c0 === -1) {
      throw new Error("decode: Base64 字符串包含非法字符");
    }

    if (byteIdx < bytes.length) bytes[byteIdx++] = (c0 << 2) | (c1 >> 4);
    if (byteIdx < bytes.length) bytes[byteIdx++] = (c1 << 4) | (c2 >> 2);
    if (byteIdx < bytes.length) bytes[byteIdx++] = (c2 << 6) | c3;
  }

  return bytes;
}

/** Uint8Array → Base64 字符串 */
function bytesToBase64(bytes: Uint8Array): string {
  let result = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;

    result += BASE64_ALPHABET[b0 >> 2];
    result += BASE64_ALPHABET[((b0 & 0x03) << 4) | (b1 >> 4)];

    if (i + 1 < bytes.length) {
      result += BASE64_ALPHABET[((b1 & 0x0f) << 2) | (b2 >> 6)];
    } else {
      result += "=";
    }

    if (i + 2 < bytes.length) {
      result += BASE64_ALPHABET[b2 & 0x3f];
    } else {
      result += "=";
    }
  }
  return result;
}

/** Base64URL 字符串 → Uint8Array（先还原为标准 Base64 再解码） */
function base64urlToBytes(b64url: string): Uint8Array {
  const b64 = b64url
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  return base64ToBytes(b64);
}

/** Uint8Array → Base64URL 字符串 */
function bytesToBase64url(bytes: Uint8Array): string {
  return bytesToBase64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ---- 导出的自定义函数 ----

/**
 * 将字符串从指定编码格式解码为 Uint8Array 字节数组
 *
 * @param args - args[0] 为待解码字符串, args[1] 为编码格式 ('utf8'|'hex'|'base64'|'base64url')
 * @returns Uint8Array 字节数组（以 AllowedValue 透传）
 * @throws {TypeError} 参数类型错误时抛出
 * @throws {Error} 字符串格式与编码不匹配时抛出
 */
export function decode(...args: AllowedValue[]): AllowedValue {
  const data = args[0];
  const from = args[1];

  if (typeof data !== "string") {
    throw new TypeError("decode: 第一个参数 data 必须是字符串");
  }
  if (typeof from !== "string" || !VALID_ENCODINGS.includes(from)) {
    throw new TypeError(
      `decode: 第二个参数 from 必须是以下编码之一: ${VALID_ENCODINGS.join(", ")}`,
    );
  }

  switch (from as Encoding) {
    case "utf8":
      return utf8ToBytes(data) as unknown as AllowedValue;
    case "hex":
      return hexToBytes(data) as unknown as AllowedValue;
    case "base64":
      return base64ToBytes(data) as unknown as AllowedValue;
    case "base64url":
      return base64urlToBytes(data) as unknown as AllowedValue;
    default:
      throw new Error(`decode: 不支持的编码格式 "${from}"`);
  }
}

/**
 * 将 Uint8Array 字节数组编码为指定格式的字符串
 *
 * @param args - args[0] 为 Uint8Array 字节数组, args[1] 为目标编码格式
 * @returns 编码后的字符串
 * @throws {TypeError} 参数类型错误时抛出
 */
export function encode(...args: AllowedValue[]): AllowedValue {
  const data = args[0];
  const to = args[1];

  if (!(data instanceof Uint8Array)) {
    throw new TypeError("encode: 第一个参数 data 必须是 Uint8Array");
  }
  if (typeof to !== "string" || !VALID_ENCODINGS.includes(to)) {
    throw new TypeError(
      `encode: 第二个参数 to 必须是以下编码之一: ${VALID_ENCODINGS.join(", ")}`,
    );
  }

  switch (to as Encoding) {
    case "utf8":
      return bytesToUtf8(data);
    case "hex":
      return bytesToHex(data);
    case "base64":
      return bytesToBase64(data);
    case "base64url":
      return bytesToBase64url(data);
    default:
      throw new Error(`encode: 不支持的编码格式 "${to}"`);
  }
}

/**
 * encoding 模块自定义函数集合
 * 注入 rune 引擎: new RuleEngine(rule, { functions: { ...encodingFunctions } })
 */
export const encodingFunctions: Record<string, CustomFunction> = {
  decode,
  encode,
};
