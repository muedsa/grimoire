# @grimoire/rune 内置函数参考

## 核心工具

### `len(value) → number`

返回值的长度。

| 类型 | 行为 |
|------|------|
| `string` | 字符数量 |
| `array` | 元素数量 |
| `object` | 键数量 |
| 其他 | `0` |

```
len("hello")            → 5
len([1, 2, 3])          → 3
len({a: 1, b: 2})       → 2
len(42)                 → 0
len(null)               → 0
```

### `exists(value) → boolean`

值不为 `null` 且不为 `undefined` 时返回 `true`。

```
exists("hello")         → true
exists(0)               → true
exists(null)            → false
exists(undefined)       → false
```

### `empty(value) → boolean`

值视为空时返回 `true`：`null`/`undefined`、空字符串、空数组、空对象。

```
empty("")               → true
empty([])               → true
empty({})               → true
empty(null)             → true
empty("hello")          → false
empty([1])              → false
```

### `str(value) → string`

转为字符串。`null`/`undefined` 转为 `""`。

```
str(42)                 → "42"
str(true)               → "true"
str(null)               → ""
str([1, 2])             → "1,2"
```

### `num(value) → number`

转为数字，失败时返回 `0`。

```
num("42")               → 42
num("3.14")             → 3.14
num("abc")              → 0
num(null)               → 0
```

### `json_stringify(value) → string`

序列化为 JSON 字符串。

```
json_stringify({a: 1})  → '{"a":1}'
json_stringify([1,2])   → '[1,2]'
```

### `json_parse(str) → any`

解析 JSON 字符串。非字符串参数抛出 TypeError，非法 JSON 抛出 SyntaxError。

```
json_parse('{"a":1}')   → {a: 1}
json_parse('bad json')  // 抛出 SyntaxError
json_parse(123)         // 抛出 TypeError：非字符串参数
```

### `throw_err(code, message) → never`

抛出一个 `EngineError`，终止当前规则执行。

| 参数 | 说明 |
|------|------|
| `code` | 错误码，任意字符串。非字符串时默认 `"EXECUTE_ERROR"` |
| `message` | 错误描述。非字符串时默认 `""` |

```
throw_err('VALIDATION_FAILED', 'x must be greater than 0')

// 配合条件使用
$x > 0 ? $x : throw_err('E001', 'x must be positive')
```

抛出的 `EngineError` 会被引擎捕获，存入 `ExecuteResult.error`。

### `sleep(ms) → number`

等待指定毫秒。返回实际等待的毫秒数。负数或非法输入返回 `null`。

```
sleep(1000)             // 等待 1 秒 → 1000
sleep(-1)               → null
```

---

## 类型判断

### `typeof(value) → string`

返回值的运行时类型。

| 值 | 返回 |
|----|------|
| `null` | `"null"` |
| `undefined` | `"undefined"` |
| `[]` 或数组 | `"array"` |
| 其他 | JS typeof 结果 |

```
typeof(42)              → "number"
typeof("hello")         → "string"
typeof(null)            → "null"
typeof([1, 2])          → "array"
typeof({a: 1})          → "object"
```

### `type(value) → string`

`typeof` 的别名，语义完全相同。

---

## 字符串操作

以下函数的行为分为两类：`str_starts_with`、`str_ends_with`、`str_contains`、`str_index_of`、`str_split` 对非字符串安全降级（返回 `false`/`-1`/`[]` 等），不抛异常；其余函数（`str_replace`、`str_to_upper_case`、`str_to_lower_case`、`str_trim`、`str_slice`）的非字符串参数抛出 TypeError。

### `str_starts_with(str, prefix) → boolean`

```
str_starts_with("hello world", "hello")  → true
str_starts_with("hello world", "world")  → false
str_starts_with(123, "1")               → false
```

### `str_ends_with(str, suffix) → boolean`

```
str_ends_with("hello world", "world")    → true
str_ends_with("hello world", "hello")    → false
```

### `str_contains(val, item) → boolean`

字符串包含子串 / 数组包含元素。

```
str_contains("hello world", "lo")        → true
str_contains("hello world", "xyz")       → false
str_contains(["a", "b", "c"], "b")       → true
str_contains(42, 2)                      → false
```

### `str_index_of(val, item) → number`

返回子串/元素首次出现位置，不存在返回 `-1`。

```
str_index_of("hello world", "world")     → 6
str_index_of("hello world", "xyz")       → -1
str_index_of(["a", "b", "c"], "b")       → 1
```

### `str_slice(val, start, end?) → string | array`

截取子串或子数组。`end` 可选。非字符串/非数组参数抛出 TypeError。

```
str_slice("hello", 1, 4)                 → "ell"
str_slice("hello", 2)                    → "llo"
str_slice([1, 2, 3, 4], 1, 3)           → [2, 3]
str_slice(42, 0)                         // 抛出 TypeError：非字符串/非数组参数
```

### `str_to_upper_case(str) → string`

转为大写。非字符串参数抛出 TypeError。

```
str_to_upper_case("hello")               → "HELLO"
str_to_upper_case(123)                   // 抛出 TypeError：非字符串参数
```

### `str_to_lower_case(str) → string`

转为小写。非字符串参数抛出 TypeError。

```
str_to_lower_case("HELLO")               → "hello"
str_to_lower_case(123)                   // 抛出 TypeError：非字符串参数
```

### `str_replace(str, pattern, replacement) → string`

将 `pattern` 替换为 `replacement`（只替换**第一个**匹配项，非正则）。非字符串参数抛出 TypeError。

```
str_replace("hello world world", "world", "earth")  → "hello earth world"
str_replace(123, "1", "2")                          // 抛出 TypeError：非字符串参数
```

### `str_split(str, delimiter) → string[]`

按分隔符切分字符串。

```
str_split("a,b,c", ",")                  → ["a", "b", "c"]
str_split("hello", " ")                  → ["hello"]
str_split(123, ",")                      → []
```

### `str_trim(str) → string`

去除首尾空白字符。非字符串参数抛出 TypeError。

```
str_trim("  hello  ")                    → "hello"
str_trim(42)                             // 抛出 TypeError：非字符串参数
```

### `url_encode(str) → string`

URL 编码（`encodeURIComponent`）。非字符串返回 `""`。

```
url_encode("hello world")                → "hello%20world"
url_encode("你好&x=1")                   → "%E4%BD%A0%E5%A5%BD%26x%3D1"
```

### `url_decode(str) → string`

URL 解码（`decodeURIComponent`）。非字符串或非法编码返回 `""`。

```
url_decode("hello%20world")              → "hello world"
url_decode("%E4%BD%A0%E5%A5%BD")         → "你好"
url_decode("%E0%A4%B")                   → ""    // 非法 UTF-8 序列
```

---

## 数学函数

非法输入返回 `NaN`（而非降级为 `0`）。不定参函数（`math_min`、`math_max`、`math_sum`、`math_avg`）接受数组展开。

### `math_min(...values) → number`

返回最小值。空参数返回 `Infinity`，非法输入返回 `NaN`。

```
math_min(3, 1, 4, 2)                     → 1
math_min([3, 1, 4])                      → 1
math_min()                               → Infinity
math_min("a", 42)                        → NaN
```

### `math_max(...values) → number`

返回最大值。空参数返回 `-Infinity`，非法输入返回 `NaN`。

```
math_max(3, 1, 4, 2)                     → 4
math_max([3, 1, 4])                      → 4
math_max()                               → -Infinity
math_max("a", 42)                        → NaN
```

### `math_abs(value) → number`

绝对值。非法输入返回 `NaN`。

```
math_abs(-5)                             → 5
math_abs(3.14)                           → 3.14
math_abs("abc")                          → NaN
```

### `math_round(value) → number`

四舍五入。非法输入返回 `NaN`。

```
math_round(3.14)                         → 3
math_round(3.6)                          → 4
math_round("abc")                        → NaN
```

### `math_floor(value) → number`

向下取整。非法输入返回 `NaN`。

```
math_floor(3.9)                          → 3
math_floor(-3.1)                         → -4
math_floor("abc")                        → NaN
```

### `math_ceil(value) → number`

向上取整。非法输入返回 `NaN`。

```
math_ceil(3.1)                           → 4
math_ceil(-3.9)                          → -3
math_ceil("abc")                         → NaN
```

### `math_pow(base, exp) → number`

指数运算。非法输入返回 `NaN`。

```
math_pow(2, 3)                           → 8
math_pow(10, 2)                          → 100
math_pow("a", 2)                         → NaN
```

### `math_sqrt(value) → number`

平方根。非法输入返回 `NaN`。

```
math_sqrt(16)                            → 4
math_sqrt(2)                             → 1.414...
math_sqrt("abc")                         → NaN
```

### `math_sum(...values) → number`

求和。

```
math_sum(1, 2, 3, 4)                     → 10
math_sum([1, 2, 3])                      → 6
math_sum()                               → 0
```

### `math_avg(...values) → number`

平均值。

```
math_avg(1, 2, 3)                        → 2
math_avg(10, 20, 30)                     → 20
math_avg()                               → 0
```

---

## 数组操作

数组函数对齐 JavaScript 原生行为：修改原数组（原地操作）的函数返回对应结果（新长度或原数组引用），非数组参数抛出 TypeError。

### `arr_push(arr, ...items) → number`

追加元素到末尾。**修改原数组**，返回**新长度**（number）。支持多个参数。非数组参数抛出 TypeError。

```
arr_push(["a", "b"], "c")                → 3     // 原数组变为 ["a", "b", "c"]
arr_push(["x"], "y", "z")                → 3     // 原数组变为 ["x", "y", "z"]
arr_push(null, "x")                      // 抛出 TypeError：非数组参数
```

### `arr_pop(arr) → any`

移除末尾元素。**修改原数组**，返回**被移除的元素**。空数组返回 `undefined`。非数组参数抛出 TypeError。

```
arr_pop(["a", "b", "c"])                 → "c"   // 原数组变为 ["a", "b"]
arr_pop([])                              → undefined
arr_pop(null)                            // 抛出 TypeError：非数组参数
```

### `arr_unshift(arr, ...items) → number`

头部插入。**修改原数组**，返回**新长度**（number）。支持多个参数。非数组参数抛出 TypeError。

```
arr_unshift(["b", "c"], "a")             → 3     // 原数组变为 ["a", "b", "c"]
arr_unshift(["x"], "y", "z")             → 3     // 原数组变为 ["y", "z", "x"]
arr_unshift(42, "x")                     // 抛出 TypeError：非数组参数
```

### `arr_shift(arr) → any`

移除头部元素。**修改原数组**，返回**被移除的元素**。空数组返回 `undefined`。非数组参数抛出 TypeError。

```
arr_shift(["a", "b", "c"])               → "a"   // 原数组变为 ["b", "c"]
arr_shift([])                            → undefined
arr_shift(42)                            // 抛出 TypeError：非数组参数
```

### `arr_concat(arr, ...values) → array`

合并数组。返回**新数组**，不修改原数组。支持多个参数（可变参数），非数组参数直接拼接到结果中（JS 行为）。第一个参数非数组抛出 TypeError。

```
arr_concat([1, 2], [3, 4])               → [1, 2, 3, 4]
arr_concat([1], 42, "hello")             → [1, 42, "hello"]
arr_concat([1, 2], [3], [4, 5])          → [1, 2, 3, 4, 5]
arr_concat(42, [1])                      // 抛出 TypeError：第一个参数非数组
```

### `arr_join(arr, separator?) → string`

用分隔符连接数组元素。默认分隔符 `","`。非数组参数抛出 TypeError。

```
arr_join(["a", "b", "c"], "-")           → "a-b-c"
arr_join(["x", "y"])                     → "x,y"
arr_join(42)                             // 抛出 TypeError：非数组参数
```

### `arr_reverse(arr) → array`

**原地反转**数组，返回原数组引用。非数组参数抛出 TypeError。

```
arr_reverse([1, 2, 3])                   → [3, 2, 1]  // 原数组也被反转
arr_reverse(42)                          // 抛出 TypeError：非数组参数
```

### `arr_sort(arr, order?) → array`

**原地排序**，返回原数组引用。`order` 为 `"desc"` 时降序，默认升序。全数字按数值排序，否则按字符串排序。非数组参数抛出 TypeError。

```
arr_sort([3, 1, 2])                      → [1, 2, 3]  // 原数组也被排序
arr_sort([3, 1, 2], "desc")              → [3, 2, 1]
arr_sort(["b", "a", "c"])                → ["a", "b", "c"]
arr_sort([])                             → []
arr_sort(42)                             // 抛出 TypeError：非数组参数
```

---

## 正则表达式

### `regex_test(str, pattern) → boolean`

测试字符串是否匹配正则模式。

```
regex_test("hello123", "\\d+")           → true
regex_test("hello", "\\d+")              → false
regex_test(123, "\\d+")                  → false   // 非字符串
regex_test("hello", "[")                  → false   // 非法模式
```

### `regex_match(str, pattern) → object | null`

返回第一个匹配对象，无匹配返回 `null`。

```
regex_match("foo=123", "(\\w+)=(\\d+)")
// → { match: "foo=123", groups: ["foo", "123"], index: 0 }

regex_match("hello", "\\d+")             → null
```

| 返回字段 | 说明 |
|----------|------|
| `match` | 完整匹配字符串 |
| `groups` | 捕获组数组 |
| `index` | 起始位置 |

### `regex_match_all(str, pattern) → array`

返回所有匹配对象数组。

```
regex_match_all("a1 b2 c3", "(\\w)(\\d)")
// → [
//     { match: "a1", groups: ["a", "1"], index: 0 },
//     { match: "b2", groups: ["b", "2"], index: 3 },
//     { match: "c3", groups: ["c", "3"], index: 6 },
//   ]
```

---

## 日期时间

### `date_now() → number`

当前 Unix 时间戳（毫秒）。

```
date_now()                               → 1715761845123
```

### `date_format(ts, pattern) → string | null`

时间戳 → 格式化字符串。非法输入返回 `null`。

**占位符：**

| 占位符 | 含义 | 输出 |
|--------|------|------|
| `YYYY` | 四位年 | `2026` |
| `MM` | 两位月 | `05` |
| `DD` | 两位日 | `15` |
| `HH` | 24小时制时 | `14` |
| `mm` | 分 | `30` |
| `ss` | 秒 | `45` |
| `SSS` | 毫秒 | `123` |

```
date_format(ts, 'YYYY-MM-DD')            → "2026-05-15"
date_format(ts, 'HH:mm:ss')              → "14:30:45"
date_format(ts, 'YYYY-MM-DD HH:mm:ss')   → "2026-05-15 14:30:45"
date_format(ts, 'YYYY/MM/DD')            → "2026/05/15"
date_format(null, 'YYYY')                → null
```

### `date_parse(str, pattern) → number | null`

格式化字符串 → 时间戳。格式不匹配或非法输入返回 `null`。

```
date_parse('2026-05-15', 'YYYY-MM-DD')              → 1715712000000
date_parse('2026-05-15 14:30:45', 'YYYY-MM-DD HH:mm:ss')  → ...
date_parse('15/05/2026', 'DD/MM/YYYY')               → ...
date_parse('not a date', 'YYYY-MM-DD')               → null
date_parse(123, 'YYYY')                              → null
```

### `date_add(ts, value, unit) → number | null`

时间加减，返回新时间戳。非法输入返回 `null`。

**unit 可取值：** `"second"`, `"minute"`, `"hour"`, `"day"`, `"week"`, `"month"`, `"year"`

```
date_add(ts, 1, 'day')                   // 明天此时
date_add(ts, -2, 'hour')                 // 2 小时前
date_add(ts, 1, 'month')                 // 1 个月后
date_add(ts, -1, 'year')                 // 1 年前
date_add(ts, 30, 'minute')               // 30 分钟后

// 计算下周一
date_add(date_now(), 7 - date_get(date_now(), 'weekday'), 'day')
```

### `date_diff(ts1, ts2, unit) → number | null`

计算两个时间戳之差。`ts1 - ts2`。非法输入返回 `null`。

```
date_diff(end, start, 'day')             // 天数差
date_diff(ts1, ts2, 'hour')              // → 2.5  (可带小数)
date_diff(ts1, ts2, 'month')             // 整数月差
```

```
// 计算距今还有多少天
date_diff(date_parse('2026-06-01', 'YYYY-MM-DD'), date_now(), 'day')
```

**注意：** `month` 和 `year` 为整数差（基于日历），其余 unit 为精确小数差。

### `date_get(ts, field) → number | null`

提取日期字段。非法时间戳或非法字段名返回 `null`。

**field 可取值：** `"year"`, `"month"`, `"day"`, `"hour"`, `"minute"`, `"second"`, `"millisecond"`, `"weekday"`

| field | 说明 | 范围 |
|-------|------|------|
| `year` | 年 | 四位数字 |
| `month` | 月 | 1–12 |
| `day` | 日 | 1–31 |
| `hour` | 时 | 0–23 |
| `minute` | 分 | 0–59 |
| `second` | 秒 | 0–59 |
| `millisecond` | 毫秒 | 0–999 |
| `weekday` | 星期 | 0–6，0=周日 |

```
date_get(ts, 'year')                     → 2026
date_get(ts, 'month')                    → 5
date_get(ts, 'weekday')                  → 5    // 周五
```

---

## HTTP 请求

三个 HTTP 函数均为 async，返回 `HttpResponse` 对象。零第三方依赖，全平台原生 `fetch` + `AbortController`。

### 返回类型 `HttpResponse`

```ts
{ status: number; headers: object; body: string; error?: string }
```

| 场景 | status | body | error |
|------|--------|------|-------|
| 成功 | HTTP 状态码 | 响应文本 | 无 |
| 404/500 等 | 对应状态码 | 响应文本 | 无 |
| 网络故障 | `0` | `""` | `"network_error"` |
| 超时 | `0` | `""` | `"timeout"` |

### `http_get(url, headers?) → HttpResponse`

```
http_get('https://api.example.com/data')
http_get('https://api.example.com/data', {Authorization: 'Bearer xxx'})

// 配合 json_parse 解析 JSON 响应
json_parse(http_get('https://api.example.com/data').body)
```

### `http_post(url, body?, headers?) → HttpResponse`

`body` 为 `string` 时直传；`body` 为 `object` 时根据 `Content-Type` 自动序列化：

| Content-Type (含) | body 为 object | body 为 string |
|---|---|---|
| `application/json` | `JSON.stringify` | 直传 |
| `x-www-form-urlencoded` | `URLSearchParams` | 直传 |
| `multipart/form-data` | 自动生成 boundary | 直传 |
| 无匹配 | `error: "unsupported_content_type"` | 直传 |

```
// JSON 请求
http_post(url, {x: 1, y: 2}, {Content-Type: 'application/json'})
http_post(url, '{"x":1}', {Content-Type: 'application/json'})

// URL-encoded 表单
http_post(url, {name: 'foo', age: '20'}, {Content-Type: 'application/x-www-form-urlencoded'})

// multipart form-data（纯文本字段，不支持文件）
http_post(url, {name: 'foo', age: '20'}, {Content-Type: 'multipart/form-data'})
```

### `http_fetch(url, options) → HttpResponse`

通用 HTTP 请求，支持完整 options。

```
options: {
  method?: string      // 默认 "GET"
  headers?: object     // 请求头
  body?: string|object // 请求体（序列化规则同 http_post）
  timeout?: number     // 超时毫秒，默认 0（不限制）
}
```

```
http_fetch(url, {method: 'DELETE'})
http_fetch(url, {method: 'PUT', body: {x: 1}, headers: {Content-Type: 'application/json'}})
http_fetch(url, {timeout: 5000})    // 5 秒超时
```

---

## 函数索引

| 分类 | 函数 |
|------|------|
| 核心 | `len`, `exists`, `empty`, `str`, `num`, `json_stringify`, `json_parse`, `throw_err`, `sleep` |
| 类型 | `typeof`, `type` |
| 字符串 | `str_starts_with`, `str_ends_with`, `str_contains`, `str_index_of`, `str_slice`, `str_to_upper_case`, `str_to_lower_case`, `str_replace`, `str_split`, `str_trim` |
| URL 编码 | `url_encode`, `url_decode` |
| 数学 | `math_min`, `math_max`, `math_abs`, `math_round`, `math_floor`, `math_ceil`, `math_pow`, `math_sqrt`, `math_sum`, `math_avg` |
| 数组 | `arr_push`, `arr_pop`, `arr_unshift`, `arr_shift`, `arr_concat`, `arr_join`, `arr_reverse`, `arr_sort` |
| 正则 | `regex_test`, `regex_match`, `regex_match_all` |
| 日期 | `date_now`, `date_format`, `date_parse`, `date_add`, `date_diff`, `date_get` |
| HTTP | `http_get`, `http_post`, `http_fetch` |
