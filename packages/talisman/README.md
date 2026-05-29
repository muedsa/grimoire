# @grimoire/talisman

[@grimoire/rune](./../rune) 辅助工具库 — 为规则引擎提供编码转换、加解密、DOM 解析/查询等自定义表达式函数，供 **sigil** 与 **grimoire** 等媒体提供者规则使用。

## 特性

- **与 rune 无缝集成**：所有函数均实现 `CustomFunction` 接口，可按模块批量注入 `RuleEngine`
- **环境无关**：纯 TypeScript 实现，基于 `@noble/hashes` / `@noble/ciphers`，支持 Node.js、浏览器、React Native
- **fail-fast**：参数类型或格式错误时抛出明确异常，便于在规则加载/调试阶段发现问题
- **三模块划分**：`encoding`、`crypto`、`dom`，可按需单独或组合引入

## 快速开始

将全部 talisman 函数注入 rune 引擎：

```typescript
import { RuleEngine } from "@grimoire/rune";
import {
  encodingFunctions,
  cryptoFunctions,
  domFunctions,
} from "@grimoire/talisman";

const engine = new RuleEngine({
  functions: {
    ...encodingFunctions,
    ...cryptoFunctions,
    ...domFunctions,
  },
});

const rule = {
  variables: { data: { text: "SGVsbG8=" } },
  nodes: {
    main: [
      {
        type: "set",
        variable: "result.bytes",
        value: '${decode(data.text, "base64")}',
      },
      {
        type: "set",
        variable: "result.plain",
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

| 模块     | 导出集合            | 函数                                                                                                                                       |
| -------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| encoding | `encodingFunctions` | `decode`, `encode`, `encode_uri_component`, `decode_uri_component`, `encode_uri`, `decode_uri`, `html_entity_decode`, `html_entity_encode` |
| crypto   | `cryptoFunctions`   | `hash`, `hmac`, `aes_encrypt`, `aes_decrypt`                                                                                               |
| dom      | `domFunctions`      | `xml_parse`, `html_parse`, `xpath_select`, `xpath_select1`, `css_select`, `css_select1`                                                    |

也可按需单独导入函数或集合：

```typescript
import { decode, encode } from "@grimoire/talisman";
import { hash, aes_encrypt } from "@grimoire/talisman";
import {
  xml_parse,
  html_parse,
  xpath_select,
  css_select,
} from "@grimoire/talisman";
```

---

## encoding 模块

在字符串与 `Uint8Array` 字节数组之间转换，常用于与 `hash` / `aes_*` 等二进制函数配合。

### decode(data, from)

将字符串从指定编码解码为 `Uint8Array`。

| 参数   | 类型     | 说明                                               |
| ------ | -------- | -------------------------------------------------- |
| `data` | `string` | 待解码字符串                                       |
| `from` | `string` | 源编码：`utf8` \| `hex` \| `base64` \| `base64url` |

**返回值**：`Uint8Array`

**示例（规则表达式）**：

```
decode(data.token, "base64url")
decode(data.hexKey, "hex")
```

### encode(data, to)

将 `Uint8Array` 编码为指定格式的字符串。

| 参数   | 类型         | 说明                                                 |
| ------ | ------------ | ---------------------------------------------------- |
| `data` | `Uint8Array` | 字节数组                                             |
| `to`   | `string`     | 目标编码：`utf8` \| `hex` \| `base64` \| `base64url` |

**返回值**：`string`

**示例**：

```
encode(hash("sha256", decode(data.body, "utf8")), "hex")
```

### encode_uri_component(str)

URI 组件编码 — 对特殊字符进行百分号编码，等价于 JavaScript 全局 `encodeURIComponent`。

| 参数  | 类型     | 说明         |
| ----- | -------- | ------------ |
| `str` | `string` | 待编码字符串 |

**返回值**：`string`

保留字符（不编码）：`A-Z a-z 0-9 - _ . ! ~ * ' ( )`

**示例**：

```
encode_uri_component("hello world")        → "hello%20world"
encode_uri_component("搜索?q=你好")         → "%E6%90%9C%E7%B4%A2%3Fq%3D%E4%BD%A0%E5%A5%BD"
```

### decode_uri_component(str)

URI 组件解码 — 将百分号编码的字符串还原，等价于 `decodeURIComponent`。

| 参数  | 类型     | 说明               |
| ----- | -------- | ------------------ |
| `str` | `string` | 百分号编码的字符串 |

**返回值**：`string`

**示例**：

```
decode_uri_component("hello%20world")      → "hello world"
decode_uri_component(result.encoded)
```

### encode_uri(str)

URI 编码 — 编码完整 URI，保留协议、域名等保留字符，等价于 `encodeURI`。

与 `encode_uri_component` 的区别：`encode_uri` 不会编码 `: / ? # @ & = + $ , ;` 等 URI 结构保留字符，适合对整个 URL 编码。

| 参数  | 类型     | 说明             |
| ----- | -------- | ---------------- |
| `str` | `string` | 待编码的完整 URI |

**返回值**：`string`

**示例**：

```
encode_uri("https://example.com/搜索?q=你好")
  → "https://example.com/%E6%90%9C%E7%B4%A2?q=%E4%BD%A0%E5%A5%BD"
```

### decode_uri(str)

URI 解码 — 将 `encodeURI` 编码的字符串还原，等价于 `decodeURI`。

| 参数  | 类型     | 说明                     |
| ----- | -------- | ------------------------ |
| `str` | `string` | `encodeURI` 编码的字符串 |

**返回值**：`string`

**示例**：

```
decode_uri("https://example.com/%E6%90%9C%E7%B4%A2?q=%E4%BD%A0%E5%A5%BD")
  → "https://example.com/搜索?q=你好"
```

### html_entity_decode(str)

HTML 实体解码 — 将 HTML 数字字符引用（`&#x6DE1;` / `&#28129;`）和命名实体（`&amp;` / `&lt;` 等）还原为原始字符。基于 [he](https://github.com/mathiasbynens/he) 库，支持所有 HTML5 命名实体。

| 参数  | 类型     | 说明                 |
| ----- | -------- | -------------------- |
| `str` | `string` | 含 HTML 实体的字符串 |

**返回值**：`string`

**示例**：

```
html_entity_decode("&#x6DE1;&#x96EA;&#x7F51;")     → "淡雪网"
html_entity_decode("&#28129;&#38634;&#32593;")       → "淡雪网"
html_entity_decode("&amp;lt;div&amp;gt;")           → "&lt;div&gt;"
```

### html_entity_encode(str)

HTML 实体编码 — 将需要转义的字符（`< > & " '`）编码为 HTML 命名实体。

| 参数  | 类型     | 说明         |
| ----- | -------- | ------------ |
| `str` | `string` | 待编码字符串 |

**返回值**：`string`

**示例**：

```
html_entity_encode('<div class="name">&copy;</div>')
  → "&lt;div class=&quot;name&quot;&gt;&amp;copy;&lt;/div&gt;"
```

---

## crypto 模块

基于 [@noble/hashes](https://github.com/paulmillr/noble-hashes) 与 [@noble/ciphers](https://github.com/paulmillr/noble-ciphers)。所有输入/输出均为 `Uint8Array`，通常与 `decode` / `encode` 链式使用。

### hash(algorithm, data)

计算哈希摘要。

| 参数        | 说明                                                |
| ----------- | --------------------------------------------------- |
| `algorithm` | `md5` \| `sha1` \| `sha256` \| `sha384` \| `sha512` |
| `data`      | `Uint8Array` 待哈希数据                             |

**返回值**：`Uint8Array` 摘要

### hmac(algorithm, data, key)

计算 HMAC 消息认证码（不支持 `md5` / `sha1`）。

| 参数        | 说明                             |
| ----------- | -------------------------------- |
| `algorithm` | `sha256` \| `sha384` \| `sha512` |
| `data`      | `Uint8Array` 消息                |
| `key`       | `Uint8Array` 密钥                |

**返回值**：`Uint8Array` HMAC 值

### aes_encrypt(algorithm, data, key, iv, padding?)

AES 对称加密。

| 参数        | 说明                                                   |
| ----------- | ------------------------------------------------------ |
| `algorithm` | 见下表                                                 |
| `data`      | `Uint8Array` 明文                                      |
| `key`       | `Uint8Array`（128 位模式 16 字节，256 位模式 32 字节） |
| `iv`        | `Uint8Array`（CBC/CTR 16 字节；GCM 12 字节）           |
| `padding`   | 可选，仅 CBC：`pkcs7`（默认）\| `zero` \| `none`       |

**支持的 algorithm**：

| 算法                          | 密钥长度     | IV 长度 |
| ----------------------------- | ------------ | ------- |
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

## dom 模块

提供 **两条独立轨道** 用于 HTML/XML 解析与查询：

| 轨道 | 解析函数     | 解析库           | 产出类型              | 查询方法                         | 查询库       | 适用场景               |
| ---- | ------------ | ---------------- | --------------------- | -------------------------------- | ------------ | ---------------------- |
| XML  | `xml_parse`  | `@xmldom/xmldom` | W3C `Document`        | `xpath_select` / `xpath_select1` | `xpath`      | 严格 XML/XHTML + XPath |
| HTML | `html_parse` | `htmlparser2`    | domhandler `Document` | `css_select` / `css_select1`     | `css-select` | 容错 HTML + CSS 选择器 |

两条轨道的解析产物互不交叉 — 请使用 `xml_parse` 配合 xpath 方法，`html_parse` 配合 css 方法。

### XML 轨道（xml_parse + xpath）

#### xml_parse(xml)

将 XML/XHTML 字符串解析为 W3C `Document` 对象。

| 参数  | 类型     | 说明          |
| ----- | -------- | ------------- |
| `xml` | `string` | XML/HTML 源码 |

**返回值**：W3C `Document`；参数非字符串或解析失败时返回 `null`

> 内部使用 `@xmldom/xmldom` 解析，并自动剥离 XHTML 命名空间，以便后续 XPath 能匹配无命名空间前缀的标签名。

#### xpath_select(doc, expr)

执行 XPath 查询，返回全部匹配结果。

| 参数   | 类型       | 说明                 |
| ------ | ---------- | -------------------- |
| `doc`  | `Document` | `xml_parse` 的返回值 |
| `expr` | `string`   | XPath 表达式         |

**返回值**（由表达式类型决定）：

| 表达式类型 | 示例                    | 返回类型  |
| ---------- | ----------------------- | --------- |
| 节点集     | `//div[@class='title']` | `Node[]`  |
| 字符串     | `string(//title)`       | `string`  |
| 数字       | `count(//a)`            | `number`  |
| 布尔       | `count(//a) > 0`        | `boolean` |

输入非法或表达式错误时返回 `null`。

#### xpath_select1(doc, expr)

与 `xpath_select` 类似，但只返回第一个匹配项；无匹配时返回 `undefined`（区别于 `xpath_select` 的空数组）。

### HTML 轨道（html_parse + css-select）

#### html_parse(html)

将 HTML 字符串解析为 domhandler `Document` 对象（基于 `htmlparser2`）。

| 参数   | 类型     | 说明      |
| ------ | -------- | --------- |
| `html` | `string` | HTML 源码 |

**返回值**：domhandler `Document`；参数非字符串或解析失败时返回 `null`

> `htmlparser2` 对不规则 HTML 具有极强容错性，能正确处理未闭合标签、可选标签省略等真实世界 HTML，远优于 `@xmldom/xmldom`。

#### css_select(doc, selector)

使用 CSS 选择器查询，返回所有匹配的元素数组。

| 参数       | 类型       | 说明                  |
| ---------- | ---------- | --------------------- |
| `doc`      | `Document` | `html_parse` 的返回值 |
| `selector` | `string`   | CSS 选择器字符串      |

**返回值**：匹配的 `Element[]`；无匹配返回 `[]`；输入非法或选择器错误返回 `null`

#### css_select1(doc, selector)

与 `css_select` 类似，但只返回第一个匹配元素；无匹配时返回 `null`。

| 参数       | 类型       | 说明                  |
| ---------- | ---------- | --------------------- |
| `doc`      | `Document` | `html_parse` 的返回值 |
| `selector` | `string`   | CSS 选择器字符串      |

**返回值**：匹配的 `Element`；无匹配返回 `null`；输入非法或选择器错误返回 `null`

**规则示例（XML 轨道）**：

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
        "value": "${xml_parse(data.html)}"
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

**规则示例（HTML 轨道）**：

```json
{
  "variables": {
    "data": {
      "html": "<div class=\"main\"><h1>标题</h1><a href=\"/p1\">链接</a></div>"
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
        "value": "${css_select1(doc, \"h1\")}"
      },
      {
        "type": "set",
        "variable": "result.links",
        "value": "${css_select(doc, \"a[href]\")}"
      }
    ]
  }
}
```

---

## 与 rune 集成

talisman 函数通过 `RuleEngine` 的 `functions` 选项注册，在规则的 `set` / `exec` 等节点的 `${...}` 表达式中直接调用：

```typescript
import { RuleEngine } from "@grimoire/rune";
import {
  encodingFunctions,
  cryptoFunctions,
  domFunctions,
} from "@grimoire/talisman";

// 仅注册部分模块
const engine = new RuleEngine({
  functions: {
    ...encodingFunctions,
    ...domFunctions,
  },
});
```

函数签名符合 rune 的 `CustomFunction` 类型：`(...args: AllowedValue[]) => AllowedValue`。

---

## 错误处理

encoding 与 crypto 模块采用 **fail-fast** 策略：参数类型错误抛出 `TypeError`，格式/算法/长度不合法抛出 `Error`。

dom 模块采用 **容错** 策略：`xml_parse` / `html_parse` / `xpath_*` / `css_*` 在输入非法或解析/查询错误时返回 `null`（`xpath_select1` 无匹配返回 `undefined`，`css_select` 无匹配返回 `[]`，`css_select1` 无匹配返回 `null`），避免单条抓取规则导致整段流程失败。

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

| 包               | 用途                                   | 必选            |
| ---------------- | -------------------------------------- | --------------- |
| `@grimoire/rune` | `CustomFunction`、`AllowedValue` 类型  | 是              |
| `@noble/hashes`  | 哈希、HMAC（crypto 模块）              | 否（可选 peer） |
| `@noble/ciphers` | AES 加解密（crypto 模块）              | 否（可选 peer） |
| `@xmldom/xmldom` | XML 解析（dom 模块 — XML 轨道）        | 否（可选 peer） |
| `xpath`          | XPath 查询（dom 模块 — XML 轨道）      | 否（可选 peer） |
| `htmlparser2`    | HTML 解析（dom 模块 — HTML 轨道）      | 否（可选 peer） |
| `css-select`     | CSS 选择器查询（dom 模块 — HTML 轨道） | 否（可选 peer） |

> 第三方依赖均为可选的 peerDependencies，按需安装：
>
> - 仅用 `encoding` 模块 → 无需安装额外依赖
> - 使用 `crypto` 模块 → `yarn add @noble/hashes @noble/ciphers`
> - 使用 `dom` 模块（XML 轨道）→ `yarn add @xmldom/xmldom xpath`
> - 使用 `dom` 模块（HTML 轨道）→ `yarn add htmlparser2 css-select`

## License

MIT
