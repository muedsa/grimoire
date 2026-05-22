/**
 * crypto 模块 — 哈希、HMAC、AES 加解密
 *
 * 为 rune 规则引擎提供加解密相关自定义函数的聚合出口:
 *   cryptoFunctions — 注入 rune 引擎的对象
 *     new RuleEngine(rule, { functions: { ...cryptoFunctions } })
 */
import type { CustomFunction } from "@grimoire/rune";
import { hash, hmac } from "./hash";
import { aes_encrypt, aes_decrypt } from "./aes";

/** crypto 模块自定义函数集合 */
export const cryptoFunctions: Record<string, CustomFunction> = {
  hash,
  hmac,
  aes_encrypt,
  aes_decrypt,
};

export { hash, hmac, aes_encrypt, aes_decrypt };
