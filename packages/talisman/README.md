# @grimoire/talisman

[@grimoire/rune](./../rune) 辅助工具库 — 为规则引擎提供编码转换、加解密、HTML/XPath 解析等自定义表达式函数，供 **sigil** 与 **grimoire** 等媒体提供者规则使用。

## 特性

- **与 rune 无缝集成**：所有函数均实现 `CustomFunction` 接口，可按模块批量注入 `RuleEngine`
- **环境无关**：纯 TypeScript 实现，基于 `@noble/hashes` / `@noble/ciphers`，支持 Node.js、浏览器、React Native
- **fail-fast**：参数类型或格式错误时抛出明确异常，便于在规则加载/调试阶段发现问题
- **三模块划分**：`encoding`、`crypto`、`html`，可按需单独或组合引入

## 快速开始

将全部 talisman 函数注入 rune 引擎：

```typescript
import { RuleEngine } from '@grimoire/rune';
import {
  encodingFunctions,
  cryptoFunctions,
  htmlFunctions,
} from '@grimoire/talisman';

const engine = new RuleEngine({
  functions: {
    ...encodingFunctions,
    ...cryptoFunctions,
    ...htmlFunctions,
  },
});

const rule = {
  variables: { data: { text: 'SGVsbG8=' } },
  nodes: {
    main: [
      {
        type: 'set',
        variable: 'result.bytes',
        value: '${decode(data.text, "base64")}',
      },
      {
        type: 'set',
        variable: 'result.plain',
        value: '${encode(result.bytes, "utf8")}',
      },
    ],
  },
};

const result = await engine.execute(rule);
// result.data.result.plain === "Hello"
```

---

## 模块概览

| 模块 | 导出集合 | 函数 |
|------|----------|------|
| encoding | `encodingFunctions` | `decode`, `encode` |
| crypto | `cryptoFunctions` | `hash`, `hmac`, `aes_encrypt`, `aes_decrypt` |
| html | `htmlFunctions` | `html_parse`, `xpath_select`, `xpath_select1` |

也可按需单独导入函数或集合：

```typescript
import { decode, encode } from '@grimoire/talisman';
import { hash, aes_encrypt } from '@grimoire/talisman';
import { html_parse, xpath_select } from '@grimoire/talisman';
```

---

## encoding 模块

在字符串与 `Uint8Array` 字节数组之间转换，常用于与 `hash` / `aes_*` 等二进制函数配合。

### decode(data, from)

将字符串从指定编码解码为 `Uint8Array`。

| 参数 | 类型 | 说明 |
|------|------|------|
| `data` | `string` | 待解码字符串 |
| `from` | `string` | 源编码：`utf8` \| `hex` \| `base64` \| `base64url` |

**返回值**：`Uint8Array`

**示例（规则表达式）**：

```
decode(data.token, "base64url")
decode(data.hexKey, "hex")
```

### encode(data, to)

将 `Uint8Array` 编码为指定格式的字符串。

| 参数 | 类型 | 说明 |
|------|------|------|
| `data` | `Uint8Array` | 字节数组 |
| `to` | `string` | 目标编码：`utf8` \| `hex` \| `base64` \| `base64url` |

**返回值**：`string`

**示例**：

```
encode(hash("sha256", decode(data.body, "utf8")), "hex")
```

---

## crypto 模块

基于 [@noble/hashes](https://github.com/paulmillr/noble-hashes) 与 [@noble/ciphers](https://github.com/paulmillr/noble-ciphers)。所有输入/输出均为 `Uint8Array`，通常与 `decode` / `encode` 链式使用。

### hash(algorithm, data)

计算哈希摘要。

| 参数 | 说明 |
|------|------|
| `algorithm` | `md5` \| `sha1` \| `sha256` \| `sha384` \| `sha512` |
| `data` | `Uint8Array` 待哈希数据 |

**返回值**：`Uint8Array` 摘要

### hmac(algorithm, data, key)

计算 HMAC 消息认证码（不支持 `md5` / `sha1`）。

| 参数 | 说明 |
|------|------|
| `algorithm` | `sha256` \| `sha384` \| `sha512` |
| `data` | `Uint8Array` 消息 |
| `key` | `Uint8Array` 密钥 |

**返回值**：`Uint8Array` HMAC 值

### aes_encrypt(algorithm, data, key, iv, padding?)

AES 对称加密。

| 参数 | 说明 |
|------|------|
| `algorithm` | 见下表 |
| `data` | `Uint8Array` 明文 |
| `key` | `Uint8Array`（128 位模式 16 字节，256 位模式 32 字节） |
| `iv` | `Uint8Array`（CBC/CTR 16 字节；GCM 12 字节） |
| `padding` | 可选，仅 CBC：`pkcs7`（默认）\| `zero` \| `none` |

**支持的 algorithm**：

| 算法 | 密钥长度 | IV 长度 |
|------|----------|---------|
| `aes-128-cbc` / `aes-256-cbc` | 16 / 32 字节 | 16 字节 |
| `aes-128-gcm` / `aes-256-gcm` | 16 / 32 字节 | 12 字节 |
| `aes-128-ctr` / `aes-256-ctr` | 16 / 32 字节 | 16 字节 |

**返回值**：`Uint8Array` 密文（GCM 模式含认证标签）

### aes_decrypt(algorithm, data, key, iv, padding?)

AES 对称解密，参数与 `aes_encrypt` 一致。

**返回值**：`Uint8Array` 明文

**规则示例（伪代码链式）**：

```json
{
  "type": "set",
  "variable": "result.digest",
  "value": "${encode(hash(\"sha256\", decode(data.input, \"utf8\")), \"hex\")}"
}
```

---

## html 模块

解析 HTML 并通过 XPath 提取内容，适用于从网页/HTML 片段中抓取结构化数据。

### html_parse(html)

将 HTML 字符串解析为 DOM `Document` 对象。

| 参数 | 类型 | 说明 |
|------|------|------|
| `html` | `string` | HTML 源码 |

**返回值**：`Document`；参数非字符串或解析失败时返回 `null`

> 内部使用 `@xmldom/xmldom` 解析，并自动剥离 XHTML 命名空间，以便后续 XPath 能匹配无命名空间前缀的标签名。

### xpath_select(doc, expr)

执行 XPath 查询，返回全部匹配结果。

| 参数 | 类型 | 说明 |
|------|------|------|
| `doc` | `Document` | `html_parse` 的返回值 |
| `expr` | `string` | XPath 表达式 |

**返回值**（由表达式类型决定）：

| 表达式类型 | 示例 | 返回类型 |
|------------|------|----------|
| 节点集 | `//div[@class='title']` | `Node[]` |
| 字符串 | `string(//title)` | `string` |
| 数字 | `count(//a)` | `number` |
| 布尔 | `count(//a) > 0` | `boolean` |

输入非法或表达式错误时返回 `null`。

### xpath_select1(doc, expr)

与 `xpath_select` 类似，但只返回第一个匹配项；无匹配时返回 `undefined`（区别于 `xpath_select` 的空数组）。

**规则示例**：

```json
{
  "variables": {
    "data": {
      "html": "<html><body><h1>标题</h1><p>正文</p></body></html>"
    }
  },
  "nodes": {
    "main": [
      {
        "type": "set",
        "variable": "doc",
        "value": "${html_parse(data.html)}"
      },
      {
        "type": "set",
        "variable": "result.title",
        "value": "${xpath_select1(doc, \"string(//h1)\")}"
      }
    ]
  }
}
```

---

## 与 rune 集成

talisman 函数通过 `RuleEngine` 的 `functions` 选项注册，在规则的 `set` / `exec` 等节点的 `${...}` 表达式中直接调用：

```typescript
import { RuleEngine } from '@grimoire/rune';
import { encodingFunctions, cryptoFunctions, htmlFunctions } from '@grimoire/talisman';

// 仅注册部分模块
const engine = new RuleEngine({
  functions: {
    ...encodingFunctions,
    ...htmlFunctions,
  },
});
```

函数签名符合 rune 的 `CustomFunction` 类型：`(...args: AllowedValue[]) => AllowedValue`。

---

## 错误处理

encoding 与 crypto 模块采用 **fail-fast** 策略：参数类型错误抛出 `TypeError`，格式/算法/长度不合法抛出 `Error`。

html 模块采用 **容错** 策略：`html_parse` / `xpath_*` 在输入非法或 XPath 错误时返回 `null`（`xpath_select1` 无匹配返回 `undefined`），避免单条抓取规则导致整段流程失败。

---

## 开发

```bash
# 类型检查
yarn workspace @grimoire/talisman typecheck

# 构建
yarn workspace @grimoire/talisman build

# 运行测试
yarn workspace @grimoire/talisman test

# 监听模式
yarn workspace @grimoire/talisman test:watch

# 测试覆盖率
yarn workspace @grimoire/talisman test:coverage
```

## 依赖

| 包 | 用途 |
|----|------|
| `@grimoire/rune` | `CustomFunction`、`AllowedValue` 类型 |
| `@noble/hashes` | 哈希、HMAC |
| `@noble/ciphers` | AES 加解密 |
| `@xmldom/xmldom` | HTML 解析 |
| `xpath` | XPath 查询 |

## License

MIT
