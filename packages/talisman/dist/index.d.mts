import { AllowedValue, CustomFunction } from '@grimoire/rune';

/**
 * 将 HTML 字符串解析为 Document 对象
 * 作为 rune 表达式自定义函数，签名符合 CustomFunction 类型
 *
 * @param args - 可变参数，第一个参数应为 HTML 字符串
 * @returns 解析后的 Document 对象，解析失败或输入非法时返回 null
 */
declare function html_parse(...args: AllowedValue[]): AllowedValue;

/**
 * 使用 XPath 表达式查询 Document，返回结果类型由表达式动态决定
 *
 * 返回值类型映射：
 * - 节点集表达式（如 //div, //h1/text()） → Node[]
 * - 字符串表达式（如 string(//@title)） → string
 * - 数字表达式（如 count(//a)） → number
 * - 布尔表达式（如 count(//a) > 0） → boolean
 *
 * @param args - 可变参数，args[0] 为 Document 对象，args[1] 为 XPath 表达式字符串
 * @returns 查询结果，输入非法或表达式有误时返回 null
 */
declare function xpath_select(...args: AllowedValue[]): AllowedValue;
/**
 * 使用 XPath 表达式查询 Document，只返回第一个匹配节点
 *
 * 与 xpath_select 的区别：
 * - 有匹配时返回单个节点（Node | Attr | string | number | boolean）
 * - 无匹配时返回 undefined（区别于 xpath_select 返回空数组）
 *
 * @param args - 可变参数，args[0] 为 Document 对象，args[1] 为 XPath 表达式字符串
 * @returns 第一个匹配节点，输入非法或表达式有误时返回 null，无匹配返回 undefined
 */
declare function xpath_select1(...args: AllowedValue[]): AllowedValue;

/**
 * HTML/XPath 模块自定义函数集合
 * 注入 rune 引擎使用：
 *   new RuleEngine(rule, { functions: htmlFunctions })
 */
declare const htmlFunctions: Record<string, CustomFunction>;

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

/**
 * 将字符串从指定编码格式解码为 Uint8Array 字节数组
 *
 * @param args - args[0] 为待解码字符串, args[1] 为编码格式 ('utf8'|'hex'|'base64'|'base64url')
 * @returns Uint8Array 字节数组（以 AllowedValue 透传）
 * @throws {TypeError} 参数类型错误时抛出
 * @throws {Error} 字符串格式与编码不匹配时抛出
 */
declare function decode(...args: AllowedValue[]): AllowedValue;
/**
 * 将 Uint8Array 字节数组编码为指定格式的字符串
 *
 * @param args - args[0] 为 Uint8Array 字节数组, args[1] 为目标编码格式
 * @returns 编码后的字符串
 * @throws {TypeError} 参数类型错误时抛出
 */
declare function encode(...args: AllowedValue[]): AllowedValue;
/**
 * encoding 模块自定义函数集合
 * 注入 rune 引擎: new RuleEngine(rule, { functions: { ...encodingFunctions } })
 */
declare const encodingFunctions: Record<string, CustomFunction>;

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

/**
 * 计算哈希摘要
 *
 * @param args - args[0] 算法名, args[1] Uint8Array 待哈希数据
 * @returns Uint8Array 哈希值
 * @throws 参数类型错误或算法不支持时抛出
 */
declare function hash(...args: AllowedValue[]): AllowedValue;
/**
 * 计算 HMAC 消息认证码
 *
 * @param args - args[0] 算法名 (sha256|sha384|sha512), args[1] Uint8Array 数据, args[2] Uint8Array 密钥
 * @returns Uint8Array HMAC 值
 * @throws 参数类型错误或算法不支持时抛出
 */
declare function hmac(...args: AllowedValue[]): AllowedValue;

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

/**
 * AES 加密
 *
 * @param args - args[0] 算法模式, args[1] Uint8Array 明文, args[2] Uint8Array 密钥, args[3] Uint8Array IV, args[4] 可选填充模式 (默认 pkcs7)
 * @returns Uint8Array 密文（GCM 模式尾部 16 字节为认证标签）
 * @throws 参数错误或加密失败时抛出
 */
declare function aes_encrypt(...args: AllowedValue[]): AllowedValue;
/**
 * AES 解密
 *
 * @param args - args[0] 算法模式, args[1] Uint8Array 密文, args[2] Uint8Array 密钥, args[3] Uint8Array IV, args[4] 可选填充模式 (默认 pkcs7)
 * @returns Uint8Array 明文
 * @throws 参数错误或解密失败（含 GCM 认证失败）时抛出
 */
declare function aes_decrypt(...args: AllowedValue[]): AllowedValue;

/**
 * crypto 模块 — 哈希、HMAC、AES 加解密
 *
 * 为 rune 规则引擎提供加解密相关自定义函数的聚合出口:
 *   cryptoFunctions — 注入 rune 引擎的对象
 *     new RuleEngine(rule, { functions: { ...cryptoFunctions } })
 */

/** crypto 模块自定义函数集合 */
declare const cryptoFunctions: Record<string, CustomFunction>;

export { aes_decrypt, aes_encrypt, cryptoFunctions, decode, encode, encodingFunctions, hash, hmac, htmlFunctions, html_parse, xpath_select, xpath_select1 };
