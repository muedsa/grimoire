/**
 * crypto/hash 模块 — 哈希摘要和 HMAC 消息认证码
 *
 * 提供 hash 和 hmac 两个自定义函数，供 rune 规则引擎使用:
 *   hash(algorithm, data)       — 计算哈希摘要
 *   hmac(algorithm, data, key)  — 计算 HMAC
 *
 * 所有输入/输出均为 Uint8Array 字节数组
 * 错误策略: fail-fast，参数类型/算法不合法时抛出 Error
 */

import type { AllowedValue } from "@grimoire/rune";
import { md5 } from "@noble/hashes/legacy.js";
import { sha1 } from "@noble/hashes/legacy.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { sha384 } from "@noble/hashes/sha2.js";
import { sha512 } from "@noble/hashes/sha2.js";
import { hmac as nobleHmac } from "@noble/hashes/hmac.js";

/** 哈希算法类型 */
type HashAlgorithm = "md5" | "sha1" | "sha256" | "sha384" | "sha512";
const HASH_ALGORITHMS: readonly string[] = [
  "md5",
  "sha1",
  "sha256",
  "sha384",
  "sha512",
];

/** HMAC 算法类型（排除安全强度较弱的 md5/sha1） */
type HmacAlgorithm = "sha256" | "sha384" | "sha512";
const HMAC_ALGORITHMS: readonly string[] = ["sha256", "sha384", "sha512"];

/** 根据算法名获取对应的哈希实现 */
function getHashImpl(algorithm: HashAlgorithm) {
  switch (algorithm) {
    case "md5":
      return md5;
    case "sha1":
      return sha1;
    case "sha256":
      return sha256;
    case "sha384":
      return sha384;
    case "sha512":
      return sha512;
    default:
      throw new Error(`hash: 不支持的哈希算法 "${algorithm}"`);
  }
}

/**
 * 计算哈希摘要
 *
 * @param args - args[0] 算法名, args[1] Uint8Array 待哈希数据
 * @returns Uint8Array 哈希值
 * @throws 参数类型错误或算法不支持时抛出
 */
export function hash(...args: AllowedValue[]): AllowedValue {
  const algorithm = args[0];
  const data = args[1];

  if (typeof algorithm !== "string" || !HASH_ALGORITHMS.includes(algorithm)) {
    throw new TypeError(
      `hash: 第一个参数 algorithm 必须是以下之一: ${HASH_ALGORITHMS.join(", ")}`,
    );
  }
  if (!(data instanceof Uint8Array)) {
    throw new TypeError("hash: 第二个参数 data 必须是 Uint8Array");
  }

  const impl = getHashImpl(algorithm as HashAlgorithm);
  return impl(data) as unknown as AllowedValue;
}

/**
 * 计算 HMAC 消息认证码
 *
 * @param args - args[0] 算法名 (sha256|sha384|sha512), args[1] Uint8Array 数据, args[2] Uint8Array 密钥
 * @returns Uint8Array HMAC 值
 * @throws 参数类型错误或算法不支持时抛出
 */
export function hmac(...args: AllowedValue[]): AllowedValue {
  const algorithm = args[0];
  const data = args[1];
  const key = args[2];

  if (typeof algorithm !== "string" || !HMAC_ALGORITHMS.includes(algorithm)) {
    throw new TypeError(
      `hmac: 第一个参数 algorithm 必须是以下之一: ${HMAC_ALGORITHMS.join(", ")}`,
    );
  }
  if (!(data instanceof Uint8Array)) {
    throw new TypeError("hmac: 第二个参数 data 必须是 Uint8Array");
  }
  if (!(key instanceof Uint8Array)) {
    throw new TypeError("hmac: 第三个参数 key 必须是 Uint8Array");
  }

  const hashImpl = getHashImpl(algorithm as HmacAlgorithm);
  return nobleHmac(hashImpl, key, data) as unknown as AllowedValue;
}
