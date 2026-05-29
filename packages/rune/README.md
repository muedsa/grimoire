# @grimoire/rune

JSON 规则引擎 — 通过 JSON 配置驱动条件分支、循环、变量操作和自定义业务逻辑，适用于规则流编排场景。

## 特性

- **纯 JSON 规则**：规则以 JSON 格式定义，易于存储、传输和动态加载
- **环境无关**：纯 TypeScript 实现，无平台依赖，支持 Node.js、浏览器、React Native
- **可扩展**：支持自定义节点注册，注入任意业务逻辑
- **类型安全**：完整的 TypeScript 类型定义
- **预编译**：规则执行前预解析所有表达式并校验结构，在加载阶段发现错误
- **调试支持**：内置步进控制器，支持单步执行和断点调试

## 安装

```bash
npm install @grimoire/rune
# 或
yarn add @grimoire/rune
```

## 快速开始

```typescript
import { RuleEngine } from "@grimoire/rune";

const engine = new RuleEngine();

const rule = {
  variables: { data: { level: 5 } },
  nodes: {
    main: [
      {
        type: "if",
        condition: "data.level > 3",
        then: [{ type: "set", variable: "result.tier", value: "premium" }],
        else: [{ type: "set", variable: "result.tier", value: "basic" }],
      },
    ],
  },
};

const result = await engine.execute(rule);
// { status: "success", data: { data: { level: 5 }, result: { tier: "premium" } } }
```

---

## 节点类型

所有节点共享基础字段 `type`（节点类型）和 `label`（可选调试标识）。

### Exec — 执行表达式

执行表达式并丢弃返回值，用于副作用函数。

```json
{ "type": "exec", "expression": "log(data.result)" }
```

| 字段         | 说明                                    |
| ------------ | --------------------------------------- |
| `expression` | 纯表达式字符串，如 `"log(data.result)"` |

### Set — 设置变量值

```json
{ "type": "set", "variable": "result.greeting", "value": "Hello, ${data.name}" }
```

| 字段       | 说明                                                              |
| ---------- | ----------------------------------------------------------------- |
| `variable` | 目标变量路径，支持点路径如 `result.user.name`、数组索引 `items.0` |
| `value`    | 赋值模板，支持表达式 `${expr}`、字面量、嵌套对象/数组             |

**模板语法：**

- `${expr}` — 求值表达式
- 不含 `${}` 的字符串 — 作为字面量保留
- 单个 `${expr}` — 返回求值后的原始类型（数字、布尔不转字符串）
- 混合文本或多个 `${}` — 拼接为字符串
- 支持嵌套对象和数组

### If — 条件分支

```json
{
  "type": "if",
  "condition": "data.level > 3",
  "then": [{ "type": "set", "variable": "result.tier", "value": "premium" }],
  "else": [{ "type": "set", "variable": "result.tier", "value": "basic" }]
}
```

| 字段        | 说明                             |
| ----------- | -------------------------------- |
| `condition` | 条件表达式，求值为真/假          |
| `then`      | 条件为真时执行的节点数组         |
| `else`      | 条件为假时执行的节点数组（可选） |

分支在子作用域中执行，`set` 自动向上查找父级变量并写入。

### Foreach — 遍历集合

```json
{
  "type": "foreach",
  "collection": "data.items",
  "item": "item",
  "index": "idx",
  "body": [
    {
      "type": "set",
      "variable": "result.total",
      "value": "${result.total + item.price}"
    }
  ]
}
```

| 字段         | 说明                   |
| ------------ | ---------------------- |
| `collection` | 求值为数组的表达式     |
| `item`       | 当前项的变量名         |
| `index`      | 索引的变量名（可选）   |
| `body`       | 每次迭代执行的节点数组 |

每次迭代创建子作用域，`set` 自动向上查找父级变量。循环局部变量（`item`、`index`）在结束后不可见。

### While — 条件循环

```json
{
  "type": "while",
  "condition": "i < 10",
  "body": [{ "type": "set", "variable": "i", "value": "${i + 1}" }]
}
```

| 字段        | 说明                       |
| ----------- | -------------------------- |
| `condition` | 条件表达式，每次迭代前求值 |
| `body`      | 条件为真时执行的节点数组   |

### Break — 跳出循环

```json
{ "type": "break" }
```

跳出最近的一层 foreach 或 while 循环。

### Continue — 跳过当前迭代

```json
{ "type": "continue" }
```

跳过当前迭代的剩余节点，进入下一轮循环。

### Return — 终止执行

```json
{ "type": "return", "value": "result" }
```

| 字段    | 说明               |
| ------- | ------------------ |
| `value` | 可选的返回值表达式 |

### Custom — 自定义节点

```json
{
  "type": "custom",
  "name": "http.get",
  "params": {
    "url": "${data.apiUrl}",
    "headers": { "Authorization": "Bearer ${data.token}" }
  }
}
```

| 字段     | 说明                                                       |
| -------- | ---------------------------------------------------------- |
| `name`   | 注册的处理器名称                                           |
| `params` | 参数，使用赋值模板（支持字面量、嵌套对象/数组、`${expr}`） |

---

## 表达式语法

表达式是字符串形式的代码，在引擎执行时求值。

### 字面量

| 类型   | 示例                                       |
| ------ | ------------------------------------------ |
| 字符串 | `'hello'`、`"hello"`                       |
| 数字   | `42`、`3.14`、`.5`                         |
| 布尔   | `true`、`false`                            |
| null   | `null`                                     |
| 数组   | `[1, 2, 3]`、`["a", "b"]`                  |
| 对象   | `{name: "Alice", age: 30}`、`{"key": val}` |

### 路径引用

```
data.user.name               — 点路径访问对象属性
data.items.0                 — 点数字访问数组元素
data.items[idx]              — 方括号变量索引
data.items[idx + 1]          — 方括号表达式索引
data.rows[i].name            — 点括号混合访问
arr[len(arr) - 1]            — 方括号内可调用函数
```

### 运算符

| 类别 | 运算符                      | 示例                |
| ---- | --------------------------- | ------------------- |
| 算术 | `+` `-` `*` `/` `%`         | `data.a + data.b`   |
| 比较 | `>` `<` `>=` `<=` `==` `!=` | `data.level >= 3`   |
| 逻辑 | `&&` `\|\|` `!`             | `flag && value > 0` |
| 括号 | `(...)`                     | `(a + b) * c`       |

优先级：`||` < `&&` < `==`/`!=` < `>`/`<`/`>=`/`<=` < `+`/`-` < `*`/`/`/`%` < `!` < 括号

### 函数调用

```
len(data.items)                    — 单参数
arr_push(items, 'new')             — 多参数
arr_join(arr_sort(nums), ', ')     — 嵌套调用
regex_replace(str, '\\d+', 'NUM')  — 需要转义的参数字符串
```

---

## 内置函数

### 通用函数

| 函数                  | 说明                            | 示例                     | 返回值                                                                                    |
| --------------------- | ------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------- |
| `len(val)`            | 数组/字符串/对象长度            | `len(data.items)`        | `number`                                                                                  |
| `exists(val)`         | 值不为 undefined/null           | `exists(data.user)`      | `boolean`                                                                                 |
| `empty(val)`          | 空数组/空字符串/空对象          | `empty(data.name)`       | `boolean`                                                                                 |
| `str(val)`            | 转为字符串                      | `str(data.id)`           | `string`                                                                                  |
| `num(val)`            | 转为数字，失败返回 0            | `num(data.count)`        | `number`                                                                                  |
| `typeof(val)`         | 返回类型字符串                  | `typeof(data.arr)`       | `"string"` / `"number"` / `"boolean"` / `"object"` / `"array"` / `"null"` / `"undefined"` |
| `type(val)`           | `typeof` 的别名                 | `type(data.val)`         | 同上                                                                                      |
| `json_stringify(val)` | 序列化为 JSON 字符串            | `json_stringify(result)` | `string`                                                                                  |
| `json_parse(val)`     | 解析 JSON 字符串，失败返回 null | `json_parse(data.raw)`   | `any \| null`                                                                             |

### 字符串函数 — `str_*`

| 函数                           | 说明                       | 示例                            |
| ------------------------------ | -------------------------- | ------------------------------- |
| `str_starts_with(str, prefix)` | 是否以 prefix 开头         | `str_starts_with(url, 'https')` |
| `str_ends_with(str, suffix)`   | 是否以 suffix 结尾         | `str_ends_with(file, '.pdf')`   |
| `str_contains(str, item)`      | 是否包含子串（也支持数组） | `str_contains(text, 'error')`   |
| `str_index_of(str, item)`      | 查找子串位置（也支持数组） | `str_index_of(text, '@')`       |
| `str_slice(str, start, end?)`  | 切片（也支持数组）         | `str_slice(name, 0, 5)`         |
| `str_to_upper_case(str)`       | 转大写                     | `str_to_upper_case(code)`       |
| `str_to_lower_case(str)`       | 转小写                     | `str_to_lower_case(code)`       |
| `str_replace(str, old, new)`   | 替换所有匹配子串           | `str_replace(text, '-', '_')`   |
| `str_split(str, delimiter)`    | 按分隔符拆分               | `str_split(tags, ',')`          |
| `str_trim(str)`                | 去除首尾空白               | `str_trim(input)`               |

### 数学函数 — `math_*`

| 函数                  | 说明     | 示例                |
| --------------------- | -------- | ------------------- |
| `math_min(...args)`   | 取最小值 | `math_min(a, b, c)` |
| `math_max(...args)`   | 取最大值 | `math_max(a, b, c)` |
| `math_abs(val)`       | 绝对值   | `math_abs(diff)`    |
| `math_round(val)`     | 四舍五入 | `math_round(price)` |
| `math_floor(val)`     | 向下取整 | `math_floor(price)` |
| `math_ceil(val)`      | 向上取整 | `math_ceil(price)`  |
| `math_pow(base, exp)` | 幂运算   | `math_pow(x, 2)`    |
| `math_sqrt(val)`      | 平方根   | `math_sqrt(area)`   |
| `math_sum(...args)`   | 求和     | `math_sum(a, b, c)` |
| `math_avg(...args)`   | 求平均值 | `math_avg(a, b, c)` |

所有数学函数对非数字参数调用 `Number()` 转换，NaN 被过滤。

### 数组函数 — `arr_*`

所有函数为不可变纯函数，返回新数组，不修改入参。

| 函数                     | 说明                      | 示例                          |
| ------------------------ | ------------------------- | ----------------------------- |
| `arr_push(arr, item)`    | 末尾追加，返回新数组      | `arr_push(items, 'new')`      |
| `arr_pop(arr)`           | 移除末尾，返回新数组      | `arr_pop(items)`              |
| `arr_unshift(arr, item)` | 头部插入，返回新数组      | `arr_unshift(items, 'first')` |
| `arr_shift(arr)`         | 移除头部，返回新数组      | `arr_shift(items)`            |
| `arr_concat(a, b)`       | 合并两个数组              | `arr_concat([1,2], [3,4])`    |
| `arr_join(arr, sep)`     | 用分隔符连接为字符串      | `arr_join(items, ', ')`       |
| `arr_reverse(arr)`       | 反转顺序                  | `arr_reverse([1,2,3])`        |
| `arr_sort(arr, order?)`  | 排序，order 可选 `"desc"` | `arr_sort(nums, 'desc')`      |

`arr_sort` 全数字元素按数值排序，否则按字符串排序。非数组入参返回安全默认值。

### 正则函数 — `regex_*`

| 函数                            | 说明                   | 返回值                             |
| ------------------------------- | ---------------------- | ---------------------------------- |
| `regex_test(str, pattern)`      | 测试是否匹配正则       | `boolean`                          |
| `regex_match(str, pattern)`     | 返回第一个匹配及捕获组 | `{ match, groups, index } \| null` |
| `regex_match_all(str, pattern)` | 返回所有匹配           | `Array<{ match, groups, index }>`  |

非法正则或非字符串入参返回安全默认值（`false` / `null` / `[]`），不抛异常。

```
// 格式验证
regex_test(data.phone, "^\\d{11}$")

// 提取键值对
regex_match(data.line, "(\\w+)=(\\d+)")
// → { match: "x=1", groups: ["x", "1"], index: 0 }

// 提取所有匹配
regex_match_all(data.text, "\\d+")
// → [{ match: "123", ... }, { match: "456", ... }]
```

---

## API

### RuleEngine

```typescript
constructor(options?: { registry?: CustomNodeRegistry; logger?: Logger })
```

- `registry`：可选的自定义节点注册表
- `logger`：可选的日志实现（不传则使用 NoopLogger）

```typescript
async execute(rule: RuleDefinition, options?: ExecuteOptions): Promise<ExecuteResult>
```

执行规则定义。内部先调用 `compileRule` 预编译所有表达式并校验结构，再执行。

### RuleDefinition

```typescript
interface RuleDefinition {
  name?: string; // 规则名称（可选）
  entry?: string; // 入口节点组名，默认 "main"
  variables?: Record<string, AllowedValue>; // 初始变量
  nodes: Record<string, RuleNode[]>; // 命名节点组
}
```

### ExecuteResult

```typescript
type ExecuteResult = {
  status: "success" | "failed";
  data?: AllowedValue;
  error?: EngineError;
};
```

成功时 `data` 包含 `ctx.toJSON()`（上下文所有变量快照）；失败时 `error` 包含错误详情。

### AllowedValue

```typescript
type AllowedValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | AllowedObject // { [key: string]: AllowedValue }
  | AllowedValue[]; // 数组
```

### 错误码

| 错误码                  | 说明                                     |
| ----------------------- | ---------------------------------------- |
| `NODE_TYPE_ERROR`       | 节点结构无效（如空 variable、未知 type） |
| `EXECUTE_ERROR`         | 执行期间发生异常                         |
| `EXPRESSION_ERROR`      | 表达式解析失败                           |
| `CUSTOM_NODE_NOT_FOUND` | 未注册的自定义处理器                     |

### compileRule

预编译规则中的所有表达式，并校验结构完整性。可在执行前单独调用以提前发现错误。

```typescript
import { compileRule } from "@grimoire/rune";

compileRule(rule); // 结构无效时抛出 EngineError
```

### CustomNodeRegistry

```typescript
import { CustomNodeRegistry } from "@grimoire/rune";

const registry = new CustomNodeRegistry();

registry.register("http.get", async (params, ctx) => {
  const url = params.url as string;
  const res = await fetch(url);
  const data = await res.json();
  return { status: "success", data };
});

const engine = new RuleEngine({ registry });
```

处理器类型：

```typescript
type CustomNodeHandler = (
  params: AllowedValue,
  ctx: ExecutionContext,
) => ExecuteResult | Promise<ExecuteResult>;
```

### ExecutionContext

自定义处理器中读写变量的上下文。

```typescript
class ExecutionContext {
  get(path: string): AllowedValue;
  set(path: string, value: AllowedValue): void;
  fork(overrides?: Record<string, AllowedValue>): ExecutionContext;
  toJSON(): AllowedObject;
}
```

`set` 沿 parent 链查找第一个包含根键的作用域并写入，符合块级作用域直觉。

### DebugStepController

调试步进控制器，用于单步执行和断点式调试。

```typescript
import { DebugStepController } from "@grimoire/rune";

const controller = new DebugStepController();

// 监听节点执行后回调
controller.onAfterStep = (stepCtx, execCtx, result) => {
  console.log(stepCtx.node.type, execCtx.toJSON());
};

const result = await engine.execute(rule, { stepController: controller });
```

| 模式               | 说明                                 |
| ------------------ | ------------------------------------ |
| `stepping`（默认） | 每节点执行前暂停，等待 `step()` 调用 |
| `running`          | 连续执行，不暂停                     |

```typescript
controller.step(); // 执行下一步
controller.runToCompletion(); // 切换到 running 模式，连续执行
controller.abort(); // 中止执行
```

### Logger

可插入的日志接口，不传则使用 NoopLogger（静默）。

```typescript
interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}
```

---

## 示例

### 示例 1：用户等级判断

```json
{
  "name": "user-tier",
  "variables": { "data": { "totalSpend": 5000 } },
  "nodes": {
    "main": [
      {
        "type": "if",
        "condition": "data.totalSpend >= 10000",
        "then": [
          { "type": "set", "variable": "result.tier", "value": "gold" },
          { "type": "set", "variable": "result.discount", "value": 0.2 }
        ],
        "else": [
          {
            "type": "if",
            "condition": "data.totalSpend >= 1000",
            "then": [
              { "type": "set", "variable": "result.tier", "value": "silver" },
              { "type": "set", "variable": "result.discount", "value": 0.1 }
            ],
            "else": [
              { "type": "set", "variable": "result.tier", "value": "bronze" }
            ]
          }
        ]
      },
      { "type": "return", "value": "result" }
    ]
  }
}
```

### 示例 2：数组求和

```json
{
  "name": "array-sum",
  "variables": { "data": { "items": [10, 20, 30, 40, 50] } },
  "nodes": {
    "main": [
      { "type": "set", "variable": "result.total", "value": 0 },
      {
        "type": "foreach",
        "collection": "data.items",
        "item": "item",
        "body": [
          {
            "type": "set",
            "variable": "result.total",
            "value": "${result.total + item}"
          }
        ]
      },
      { "type": "return", "value": "result.total" }
    ]
  }
}
```

### 示例 3：查找第一个匹配（break）

```json
{
  "name": "find-first",
  "variables": {
    "data": {
      "items": [
        { "id": 1, "active": false },
        { "id": 2, "active": true },
        { "id": 3, "active": true }
      ]
    }
  },
  "nodes": {
    "main": [
      { "type": "set", "variable": "result.found", "value": null },
      {
        "type": "foreach",
        "collection": "data.items",
        "item": "item",
        "body": [
          {
            "type": "if",
            "condition": "item.active == true",
            "then": [
              { "type": "set", "variable": "result.found", "value": "item" },
              { "type": "break" }
            ]
          }
        ]
      },
      { "type": "return", "value": "result.found" }
    ]
  }
}
```

### 示例 4：while 循环计数

```json
{
  "name": "while-counter",
  "variables": { "data": { "limit": 5 } },
  "nodes": {
    "main": [
      { "type": "set", "variable": "i", "value": 0 },
      { "type": "set", "variable": "result.sum", "value": 0 },
      {
        "type": "while",
        "condition": "i < data.limit",
        "body": [
          {
            "type": "set",
            "variable": "result.sum",
            "value": "${result.sum + i}"
          },
          { "type": "set", "variable": "i", "value": "${i + 1}" }
        ]
      },
      { "type": "return", "value": "result.sum" }
    ]
  }
}
```

### 示例 5：自定义节点 HTTP 请求

```json
{
  "name": "http-fetch",
  "variables": { "data": { "apiUrl": "https://api.example.com/users" } },
  "nodes": {
    "main": [
      {
        "type": "custom",
        "name": "http.get",
        "params": { "url": "${data.apiUrl}" }
      },
      {
        "type": "if",
        "condition": "exists(result.data) && len(result.data) > 0",
        "then": [{ "type": "return", "value": "result.data" }],
        "else": [{ "type": "return", "value": "null" }]
      }
    ]
  }
}
```

```typescript
import { RuleEngine, CustomNodeRegistry } from "@grimoire/rune";

const registry = new CustomNodeRegistry();

registry.register("http.get", async (params, ctx) => {
  const url = params.url as string;
  try {
    const res = await fetch(url);
    const data = await res.json();
    ctx.set("result.data", data);
    return { status: "success", data };
  } catch (err) {
    return { status: "failed", data: null };
  }
});

const engine = new RuleEngine({ registry });
const result = await engine.execute(rule);
```

### 示例 6：正则验证与提取

```json
{
  "name": "phone-validate",
  "variables": {
    "data": { "phone": "13812345678", "text": "订单 ORD-001 金额 99.00" }
  },
  "nodes": {
    "main": [
      {
        "type": "if",
        "condition": "regex_test(data.phone, '^\\\\d{11}$')",
        "then": [{ "type": "set", "variable": "result.valid", "value": true }],
        "else": [{ "type": "set", "variable": "result.valid", "value": false }]
      },
      {
        "type": "set",
        "variable": "result.numbers",
        "value": "${regex_match_all(data.text, '\\\\d+\\\\.?\\\\d*')}"
      }
    ]
  }
}
```

### 示例 7：数组操作链

```json
{
  "name": "array-pipeline",
  "variables": { "data": { "raw": ["c", "a", "d", "b"] } },
  "nodes": {
    "main": [
      { "type": "set", "variable": "items", "value": "${arr_sort(data.raw)}" },
      {
        "type": "set",
        "variable": "items",
        "value": "${arr_push(items, 'e')}"
      },
      {
        "type": "set",
        "variable": "items",
        "value": "${arr_unshift(items, '_')}"
      },
      {
        "type": "set",
        "variable": "result.csv",
        "value": "${arr_join(items, ',')}"
      },
      { "type": "return", "value": "result.csv" }
    ]
  }
}
// → "_a,b,c,d,e"
```

### 示例 8：Exec 节点日志

```json
{
  "name": "with-logging",
  "variables": { "data": { "name": "Alice" } },
  "nodes": {
    "main": [
      { "type": "exec", "expression": "log(data.name)" },
      {
        "type": "set",
        "variable": "result.upper",
        "value": "${str_to_upper_case(data.name)}"
      },
      { "type": "return", "value": "result.upper" }
    ]
  }
}
```

---

## 错误处理

```typescript
try {
  const result = await engine.execute(rule);
  if (result.status === "failed") {
    console.error(`[${result.error?.code}] ${result.error?.message}`);
  }
} catch (err) {
  // 引擎内部已 try-catch，通常不会 throw
  // 此层用于兜底非 EngineError 的意外异常
}
```

---

## 开发

```bash
# 类型检查
yarn workspace @grimoire/rune exec tsc --noEmit

# 构建
yarn workspace @grimoire/rune build

# 运行测试
yarn workspace @grimoire/rune vitest run

# 测试覆盖率
yarn workspace @grimoire/rune vitest run --coverage
```

## License

MIT
