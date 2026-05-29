"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  ControlSignal: () => ControlSignal,
  CustomNodeRegistry: () => CustomNodeRegistry,
  DebugStepController: () => DebugStepController,
  EngineError: () => EngineError,
  ErrorCode: () => ErrorCode,
  ExecutionContext: () => ExecutionContext,
  NoopLogger: () => NoopLogger,
  RuleEngine: () => RuleEngine,
  clearExpressionCache: () => clearExpressionCache,
  compileExpression: () => compileExpression,
  compileRule: () => compileRule,
  evaluate: () => evaluate,
  evaluateExpression: () => evaluateExpression,
  parseExpression: () => parseExpression
});
module.exports = __toCommonJS(index_exports);

// src/context/context.ts
var ExecutionContext = class _ExecutionContext {
  store;
  parent;
  constructor(initial, parent) {
    this.store = new Map(
      Object.entries(initial ?? {})
    );
    this.parent = parent;
  }
  /**
   * 通过点路径获取值（如 "data.user.name"）
   * 如果当前作用域找不到，向上查找父作用域
   */
  get(path) {
    const parts = path.split(".");
    const rootKey = parts[0];
    if (this.store.has(rootKey)) {
      const value = this.store.get(rootKey);
      return this.resolvePath(value, parts.slice(1));
    }
    if (this.parent) {
      return this.parent.get(path);
    }
    return void 0;
  }
  /**
   * 通过点路径设置值（如 "result.items.0.name"）
   * 如果变量的根键已在父级存在，则写入父级；否则在当前作用域创建
   * 这符合现代编程语言的块级作用域直觉
   */
  set(path, value) {
    const parts = path.split(".");
    const rootKey = parts[0];
    const target = this.findTargetContext(rootKey);
    if (parts.length === 1) {
      target.store.set(rootKey, value);
      return;
    }
    let root = target.store.get(rootKey);
    if (root === void 0) {
      root = {};
      target.store.set(rootKey, root);
    }
    target.setNestedValue(root, parts.slice(1), value);
  }
  /**
   * 沿 parent 链查找包含指定根键的作用域
   */
  findTargetContext(rootKey) {
    let current = this;
    while (current) {
      if (current.store.has(rootKey)) {
        return current;
      }
      current = current.parent;
    }
    return this;
  }
  /**
   * 创建子作用域（用于循环迭代）
   * 子作用域可以访问父作用域的变量，但新变量不会泄漏到父作用域
   */
  fork(overrides) {
    const child = new _ExecutionContext(overrides, this);
    return child;
  }
  /**
   * 将上下文中的所有变量合并为一个扁平对象（用于返回值）
   */
  toJSON() {
    const result = {};
    if (this.parent) {
      Object.assign(result, this.parent.toJSON());
    }
    for (const [key, value] of this.store) {
      result[key] = value;
    }
    return result;
  }
  /** 解析路径片段在值对象中的嵌套访问 */
  resolvePath(value, parts) {
    if (parts.length === 0 || value === null || value === void 0) {
      return value;
    }
    const [head, ...rest] = parts;
    if (Array.isArray(value)) {
      const index = Number(head);
      if (!isNaN(index) && index >= 0 && index < value.length) {
        return this.resolvePath(value[index], rest);
      }
      return void 0;
    }
    if (typeof value === "object") {
      return this.resolvePath(value[head], rest);
    }
    return void 0;
  }
  /** 递归设置嵌套值（支持数组索引） */
  setNestedValue(obj, parts, value) {
    if (parts.length === 0) return;
    const [head, ...rest] = parts;
    if (Array.isArray(obj)) {
      const index = Number(head);
      if (!isNaN(index) && index >= 0) {
        if (rest.length === 0) {
          obj[index] = value;
        } else {
          if (obj[index] === void 0 || obj[index] === null) {
            obj[index] = isNaN(Number(rest[0])) ? {} : [];
          }
          this.setNestedValue(obj[index], rest, value);
        }
      }
      return;
    }
    if (typeof obj === "object" && obj !== null) {
      const target = obj;
      if (rest.length === 0) {
        target[head] = value;
      } else {
        if (target[head] === void 0 || target[head] === null) {
          target[head] = isNaN(Number(rest[0])) ? {} : [];
        }
        this.setNestedValue(target[head], rest, value);
      }
    }
  }
};

// src/engine/registry.ts
var CustomNodeRegistry = class {
  handlers = /* @__PURE__ */ new Map();
  /**
   * 注册自定义节点处理器
   * @param name 处理器名称，如 "http.get", "data.parse"
   * @param handler 处理函数
   */
  register(name, handler) {
    this.handlers.set(name, handler);
  }
  /**
   * 获取已注册的处理器
   */
  get(name) {
    return this.handlers.get(name);
  }
  /**
   * 检查是否已注册
   */
  has(name) {
    return this.handlers.has(name);
  }
  /**
   * 获取所有已注册的处理器名称
   */
  names() {
    return Array.from(this.handlers.keys());
  }
};

// src/types/error.ts
var ErrorCode = /* @__PURE__ */ ((ErrorCode2) => {
  ErrorCode2["NODE_TYPE_ERROR"] = "NODE_TYPE_ERROR";
  ErrorCode2["EXPRESSION_ERROR"] = "EXPRESSION_ERROR";
  ErrorCode2["CUSTOM_NODE_NOT_FOUND"] = "CUSTOM_NODE_NOT_FOUND";
  ErrorCode2["EXECUTE_ERROR"] = "EXECUTE_ERROR";
  return ErrorCode2;
})(ErrorCode || {});
var EngineError = class extends Error {
  code;
  cause;
  constructor(code, message, cause) {
    super(message);
    this.code = code;
    this.cause = cause;
  }
};

// src/expression/parser.ts
function tokenize(input) {
  const tokens = [];
  let pos = 0;
  let lastType = "eof";
  while (pos < input.length) {
    const ch = input[pos];
    if (/\s/.test(ch)) {
      pos++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let value = "";
      pos++;
      while (pos < input.length && input[pos] !== quote) {
        if (input[pos] === "\\") {
          pos++;
          if (pos < input.length) {
            const escaped = input[pos];
            switch (escaped) {
              case "n":
                value += "\n";
                break;
              case "t":
                value += "	";
                break;
              case '"':
                value += '"';
                break;
              case "'":
                value += "'";
                break;
              case "\\":
                value += "\\";
                break;
              default:
                value += escaped;
                break;
            }
          }
        } else {
          value += input[pos];
        }
        pos++;
      }
      if (pos >= input.length) {
        throw new EngineError(
          "EXPRESSION_ERROR" /* EXPRESSION_ERROR */,
          `Unterminated string at position ${pos}`
        );
      }
      pos++;
      const tok = { type: "string", value, pos: pos - value.length - 2 };
      tokens.push(tok);
      lastType = tok.type;
      continue;
    }
    const cantStartDecimal = lastType === "number" || lastType === "identifier" || lastType === "operator" || lastType === "string";
    if (/\d/.test(ch) || ch === "." && pos + 1 < input.length && /\d/.test(input[pos + 1]) && !cantStartDecimal) {
      let num = "";
      const start = pos;
      if (ch === ".") {
        num += ".";
        pos++;
        while (pos < input.length && /\d/.test(input[pos])) {
          num += input[pos];
          pos++;
        }
      } else {
        while (pos < input.length && /\d/.test(input[pos])) {
          num += input[pos];
          pos++;
        }
        const afterDot = lastType === "dot";
        if (!afterDot && pos < input.length && input[pos] === "." && pos + 1 < input.length && /\d/.test(input[pos + 1])) {
          num += ".";
          pos++;
          while (pos < input.length && /\d/.test(input[pos])) {
            num += input[pos];
            pos++;
          }
        }
      }
      const tok = { type: "number", value: num, pos: start };
      tokens.push(tok);
      lastType = tok.type;
      continue;
    }
    if (/[a-zA-Z_$]/.test(ch)) {
      let id = "";
      while (pos < input.length && /[a-zA-Z0-9_$]/.test(input[pos])) {
        id += input[pos];
        pos++;
      }
      const tok = {
        type: "identifier",
        value: id,
        pos: pos - id.length
      };
      tokens.push(tok);
      lastType = tok.type;
      continue;
    }
    if (ch === "+" || ch === "-" || ch === "*" || ch === "/" || ch === "%") {
      const tok = { type: "operator", value: ch, pos };
      tokens.push(tok);
      lastType = tok.type;
      pos++;
      continue;
    }
    if (ch === "=" || ch === "!" || ch === ">" || ch === "<") {
      if (pos + 1 < input.length && input[pos + 1] === "=") {
        const tok2 = { type: "operator", value: ch + "=", pos };
        tokens.push(tok2);
        lastType = tok2.type;
        pos += 2;
        continue;
      }
      const tok = { type: "operator", value: ch, pos };
      tokens.push(tok);
      lastType = tok.type;
      pos++;
      continue;
    }
    if (ch === "&" && pos + 1 < input.length && input[pos + 1] === "&") {
      const tok = { type: "operator", value: "&&", pos };
      tokens.push(tok);
      lastType = tok.type;
      pos += 2;
      continue;
    }
    if (ch === "|" && pos + 1 < input.length && input[pos + 1] === "|") {
      const tok = { type: "operator", value: "||", pos };
      tokens.push(tok);
      lastType = tok.type;
      pos += 2;
      continue;
    }
    if (ch === "(") {
      const tok = { type: "lparen", value: "(", pos };
      tokens.push(tok);
      lastType = tok.type;
      pos++;
      continue;
    }
    if (ch === ")") {
      const tok = { type: "rparen", value: ")", pos };
      tokens.push(tok);
      lastType = tok.type;
      pos++;
      continue;
    }
    if (ch === "[") {
      const tok = { type: "lbracket", value: "[", pos };
      tokens.push(tok);
      lastType = tok.type;
      pos++;
      continue;
    }
    if (ch === "]") {
      const tok = { type: "rbracket", value: "]", pos };
      tokens.push(tok);
      lastType = tok.type;
      pos++;
      continue;
    }
    if (ch === "{") {
      const tok = { type: "lbrace", value: "{", pos };
      tokens.push(tok);
      lastType = tok.type;
      pos++;
      continue;
    }
    if (ch === "}") {
      const tok = { type: "rbrace", value: "}", pos };
      tokens.push(tok);
      lastType = tok.type;
      pos++;
      continue;
    }
    if (ch === ",") {
      const tok = { type: "comma", value: ",", pos };
      tokens.push(tok);
      lastType = tok.type;
      pos++;
      continue;
    }
    if (ch === ":") {
      const tok = { type: "colon", value: ":", pos };
      tokens.push(tok);
      lastType = tok.type;
      pos++;
      continue;
    }
    if (ch === ".") {
      const tok = { type: "dot", value: ".", pos };
      tokens.push(tok);
      lastType = tok.type;
      pos++;
      continue;
    }
    throw new EngineError(
      "EXPRESSION_ERROR" /* EXPRESSION_ERROR */,
      `Unexpected character '${ch}' at position ${pos}`
    );
  }
  tokens.push({ type: "eof", value: "", pos });
  return tokens;
}
var ExpressionParser = class {
  tokens = [];
  pos = 0;
  parse(input) {
    this.tokens = tokenize(input);
    this.pos = 0;
    const node = this.parseOr();
    this.expect("eof");
    return node;
  }
  // 或运算: expr || expr
  parseOr() {
    let left = this.parseAnd();
    while (this.current().type === "operator" && this.current().value === "||") {
      const op = this.consume().value;
      const right = this.parseAnd();
      left = { kind: "binary", operator: op, left, right };
    }
    return left;
  }
  // 与运算: expr && expr
  parseAnd() {
    let left = this.parseEquality();
    while (this.current().type === "operator" && this.current().value === "&&") {
      const op = this.consume().value;
      const right = this.parseEquality();
      left = { kind: "binary", operator: op, left, right };
    }
    return left;
  }
  // 相等运算: expr == expr | expr != expr
  parseEquality() {
    let left = this.parseComparison();
    while (this.current().type === "operator" && (this.current().value === "==" || this.current().value === "!=")) {
      const op = this.consume().value;
      const right = this.parseComparison();
      left = { kind: "binary", operator: op, left, right };
    }
    return left;
  }
  // 比较运算: expr < expr | expr > expr | expr <= expr | expr >= expr
  parseComparison() {
    let left = this.parseAdditive();
    while (this.current().type === "operator" && /[<>]/.test(this.current().value)) {
      const op = this.consume().value;
      const right = this.parseAdditive();
      left = { kind: "binary", operator: op, left, right };
    }
    return left;
  }
  // 加减运算: expr + expr | expr - expr
  parseAdditive() {
    let left = this.parseMultiplicative();
    while (this.current().type === "operator" && (this.current().value === "+" || this.current().value === "-")) {
      const op = this.consume().value;
      const right = this.parseMultiplicative();
      left = { kind: "binary", operator: op, left, right };
    }
    return left;
  }
  // 乘除取模运算: expr * expr | expr / expr | expr % expr
  parseMultiplicative() {
    let left = this.parseUnary();
    while (this.current().type === "operator" && (this.current().value === "*" || this.current().value === "/" || this.current().value === "%")) {
      const op = this.consume().value;
      const right = this.parseUnary();
      left = { kind: "binary", operator: op, left, right };
    }
    return left;
  }
  // 一元运算: !expr, -expr
  parseUnary() {
    const op = this.current().value;
    if (this.current().type === "operator" && (op === "!" || op === "-")) {
      const prev = this.prev();
      const isUnary = !prev || prev.type === "lparen" || prev.type === "lbracket" || prev.type === "comma" || prev.type === "operator" || prev.type === "eof";
      if (isUnary) {
        this.consume();
        const argument = this.parseUnary();
        return {
          kind: "unary",
          operator: op,
          argument
        };
      }
    }
    return this.parsePrimary();
  }
  // 基本表达式: 字面量 | 路径 | 函数调用 | 括号
  parsePrimary() {
    const token = this.current();
    if (token.type === "lparen") {
      this.consume();
      const expr = this.parseOr();
      this.expect("rparen");
      return { kind: "paren", expression: expr };
    }
    if (token.type === "string") {
      this.consume();
      return {
        kind: "literal",
        type: "string",
        value: token.value
      };
    }
    if (token.type === "number") {
      this.consume();
      return {
        kind: "literal",
        type: "number",
        value: parseFloat(token.value)
      };
    }
    if (token.type === "lbracket") {
      this.consume();
      const elements = [];
      if (this.current().type !== "rbracket") {
        elements.push(this.parseOr());
        while (this.current().type === "comma") {
          this.consume();
          if (this.current().type === "rbracket") break;
          elements.push(this.parseOr());
        }
      }
      this.expect("rbracket");
      return { kind: "array", elements };
    }
    if (token.type === "lbrace") {
      this.consume();
      const properties = [];
      if (this.current().type !== "rbrace") {
        properties.push(this.parseObjectProperty());
        while (this.current().type === "comma") {
          this.consume();
          if (this.current().type === "rbrace") break;
          properties.push(this.parseObjectProperty());
        }
      }
      this.expect("rbrace");
      return { kind: "object", properties };
    }
    if (token.type === "identifier") {
      if (token.value === "true") {
        this.consume();
        return { kind: "literal", type: "boolean", value: true };
      }
      if (token.value === "false") {
        this.consume();
        return {
          kind: "literal",
          type: "boolean",
          value: false
        };
      }
      if (token.value === "null") {
        this.consume();
        return { kind: "literal", type: "null", value: null };
      }
      return this.parsePathOrCall();
    }
    throw new EngineError(
      "EXPRESSION_ERROR" /* EXPRESSION_ERROR */,
      `Unexpected token ${token.type} '${token.value}' at position ${token.pos}`
    );
  }
  // 解析对象属性: key: value 或 "key": value
  parseObjectProperty() {
    const token = this.current();
    let key;
    if (token.type === "string") {
      key = this.consume().value;
    } else if (token.type === "identifier") {
      key = this.consume().value;
    } else {
      throw new EngineError(
        "EXPRESSION_ERROR" /* EXPRESSION_ERROR */,
        `Expected property key but got ${token.type} at position ${token.pos}`
      );
    }
    this.expect("colon");
    const value = this.parseOr();
    return { key, value };
  }
  // 解析路径或函数调用: data.user.len() | data.items[0] | arr[idx]
  parsePathOrCall() {
    const segments = [];
    if (this.current().type === "identifier") {
      segments.push(this.consume().value);
    }
    while (true) {
      if (this.current().type === "dot") {
        this.consume();
        if (this.current().type === "identifier" || this.current().type === "number") {
          segments.push(this.consume().value);
        } else {
          throw new EngineError(
            "EXPRESSION_ERROR" /* EXPRESSION_ERROR */,
            `Expected identifier or number after '.' at position ${this.current().pos}`
          );
        }
        continue;
      }
      if (this.current().type === "lbracket") {
        this.consume();
        const expr = this.parseOr();
        this.expect("rbracket");
        const bracket = { kind: "bracket", expr };
        segments.push(bracket);
        continue;
      }
      break;
    }
    if (this.current().type === "lparen") {
      this.consume();
      const args = [];
      if (this.current().type !== "rparen") {
        args.push(this.parseOr());
        while (this.current().type === "comma") {
          this.consume();
          args.push(this.parseOr());
        }
      }
      this.expect("rparen");
      const callNode = {
        kind: "call",
        target: { kind: "path", segments },
        args
      };
      if (this.current().type === "dot" || this.current().type === "lbracket") {
        const chainSegments = [];
        while (true) {
          if (this.current().type === "dot") {
            this.consume();
            if (this.current().type === "identifier" || this.current().type === "number") {
              chainSegments.push(this.consume().value);
            } else {
              throw new EngineError(
                "EXPRESSION_ERROR" /* EXPRESSION_ERROR */,
                `Expected identifier or number after '.' at position ${this.current().pos}`
              );
            }
            continue;
          }
          if (this.current().type === "lbracket") {
            this.consume();
            const expr = this.parseOr();
            this.expect("rbracket");
            chainSegments.push({ kind: "bracket", expr });
            continue;
          }
          break;
        }
        if (this.current().type === "lparen") {
          this.consume();
          const chainArgs = [];
          if (this.current().type !== "rparen") {
            chainArgs.push(this.parseOr());
            while (this.current().type === "comma") {
              this.consume();
              chainArgs.push(this.parseOr());
            }
          }
          this.expect("rparen");
          return {
            kind: "call",
            target: {
              kind: "path",
              segments: [{ kind: "bracket", expr: callNode }, ...chainSegments]
            },
            args: chainArgs
          };
        }
        return {
          kind: "path",
          segments: [{ kind: "bracket", expr: callNode }, ...chainSegments]
        };
      }
      return callNode;
    }
    return { kind: "path", segments };
  }
  current() {
    return this.tokens[this.pos];
  }
  prev() {
    return this.pos > 0 ? this.tokens[this.pos - 1] : void 0;
  }
  consume() {
    const token = this.tokens[this.pos];
    this.pos++;
    return token;
  }
  expect(type) {
    const token = this.current();
    if (token.type !== type) {
      throw new EngineError(
        "EXPRESSION_ERROR" /* EXPRESSION_ERROR */,
        `Expected ${type} but got ${token.type} '${token.value}' at position ${token.pos}`
      );
    }
    return this.consume();
  }
};
var expressionCache = /* @__PURE__ */ new Map();
function compileExpression(input) {
  const cached = expressionCache.get(input);
  if (cached) return cached;
  const parser = new ExpressionParser();
  const ast = parser.parse(input);
  expressionCache.set(input, ast);
  return ast;
}
function parseExpression(input) {
  return compileExpression(input);
}
function clearExpressionCache() {
  expressionCache.clear();
}

// src/expression/builtins/core.ts
var coreBuiltins = {
  len: (val) => {
    if (val == null) return 0;
    if (Array.isArray(val) || typeof val === "string") return val.length;
    if (typeof val === "object") return Object.keys(val).length;
    return 0;
  },
  exists: (val) => val !== void 0 && val !== null,
  empty: (val) => {
    if (val == null) return true;
    if (Array.isArray(val) || typeof val === "string") return val.length === 0;
    if (typeof val === "object") return Object.keys(val).length === 0;
    return false;
  },
  str: (val) => String(val ?? ""),
  num: (val) => {
    const n = Number(val);
    return isNaN(n) ? 0 : n;
  },
  json_stringify: (val) => JSON.stringify(val),
  json_parse: (val) => {
    if (typeof val !== "string")
      throw new TypeError("json_parse: \u53C2\u6570\u5FC5\u987B\u662F\u5B57\u7B26\u4E32");
    return JSON.parse(val);
  },
  throw_err: (code, message) => {
    const c = typeof code === "string" ? code : "EXECUTE_ERROR" /* EXECUTE_ERROR */;
    const m = typeof message === "string" ? message : "";
    throw new EngineError(c, m);
  },
  sleep: (async (ms) => {
    const n = typeof ms === "number" ? ms : Number(ms);
    if (!Number.isFinite(n) || n < 0) return null;
    await new Promise((resolve) => setTimeout(resolve, n));
    return n;
  })
};

// src/expression/builtins/typeof.ts
var typeofBuiltins = {
  typeof: (val) => {
    if (val === null) return "null";
    if (val === void 0) return "undefined";
    if (Array.isArray(val)) return "array";
    return typeof val;
  },
  type: (val) => {
    if (val === null) return "null";
    if (val === void 0) return "undefined";
    if (Array.isArray(val)) return "array";
    return typeof val;
  }
};

// src/expression/builtins/string.ts
var stringBuiltins = {
  str_starts_with: (str, prefix) => {
    if (typeof str !== "string" || typeof prefix !== "string") return false;
    return str.startsWith(prefix);
  },
  str_ends_with: (str, suffix) => {
    if (typeof str !== "string" || typeof suffix !== "string") return false;
    return str.endsWith(suffix);
  },
  str_contains: (val, item) => {
    if (typeof val === "string" && typeof item === "string")
      return val.includes(item);
    if (Array.isArray(val)) return val.includes(item);
    return false;
  },
  str_index_of: (val, item) => {
    if (typeof val === "string" && typeof item === "string")
      return val.indexOf(item);
    if (Array.isArray(val)) return val.indexOf(item);
    return -1;
  },
  str_slice: (val, start, end) => {
    if (typeof val !== "string" && !Array.isArray(val))
      throw new TypeError("str_slice: \u7B2C\u4E00\u4E2A\u53C2\u6570\u5FC5\u987B\u662F\u5B57\u7B26\u4E32\u6216\u6570\u7EC4");
    const s = typeof start === "number" ? start : 0;
    const e = typeof end === "number" ? end : void 0;
    return val.slice(s, e);
  },
  str_to_upper_case: (val) => {
    if (typeof val !== "string")
      throw new TypeError("str_to_upper_case: \u53C2\u6570\u5FC5\u987B\u662F\u5B57\u7B26\u4E32");
    return val.toUpperCase();
  },
  str_to_lower_case: (val) => {
    if (typeof val !== "string")
      throw new TypeError("str_to_lower_case: \u53C2\u6570\u5FC5\u987B\u662F\u5B57\u7B26\u4E32");
    return val.toLowerCase();
  },
  str_replace: (str, pattern, replacement) => {
    if (typeof str !== "string")
      throw new TypeError("str_replace: \u7B2C\u4E00\u4E2A\u53C2\u6570\u5FC5\u987B\u662F\u5B57\u7B26\u4E32");
    if (typeof pattern !== "string")
      throw new TypeError("str_replace: \u7B2C\u4E8C\u4E2A\u53C2\u6570\u5FC5\u987B\u662F\u5B57\u7B26\u4E32");
    if (typeof replacement !== "string")
      throw new TypeError("str_replace: \u7B2C\u4E09\u4E2A\u53C2\u6570\u5FC5\u987B\u662F\u5B57\u7B26\u4E32");
    return str.replace(pattern, replacement);
  },
  str_split: (str, delimiter) => {
    if (typeof str !== "string" || typeof delimiter !== "string") return [];
    return str.split(delimiter);
  },
  str_trim: (val) => {
    if (typeof val !== "string")
      throw new TypeError("str_trim: \u53C2\u6570\u5FC5\u987B\u662F\u5B57\u7B26\u4E32");
    return val.trim();
  },
  // URL 编解码（全平台原生支持）
  url_encode: (val) => {
    if (typeof val !== "string") return "";
    try {
      return encodeURIComponent(val);
    } catch {
      return "";
    }
  },
  url_decode: (val) => {
    if (typeof val !== "string") return "";
    try {
      return decodeURIComponent(val);
    } catch {
      return "";
    }
  }
};

// src/expression/builtins/math.ts
var mathBuiltins = {
  math_min: (...args) => {
    const nums = args.flat().map(Number).filter((n) => !isNaN(n));
    return Math.min(...nums);
  },
  math_max: (...args) => {
    const nums = args.flat().map(Number).filter((n) => !isNaN(n));
    return Math.max(...nums);
  },
  math_abs: (val) => Math.abs(typeof val === "number" ? val : Number(val)),
  math_round: (val) => Math.round(typeof val === "number" ? val : Number(val)),
  math_floor: (val) => Math.floor(typeof val === "number" ? val : Number(val)),
  math_ceil: (val) => Math.ceil(typeof val === "number" ? val : Number(val)),
  math_pow: (base, exp) => {
    const b = typeof base === "number" ? base : Number(base);
    const e = typeof exp === "number" ? exp : Number(exp);
    return Math.pow(b, e);
  },
  math_sqrt: (val) => {
    const n = typeof val === "number" ? val : Number(val);
    return Math.sqrt(n);
  },
  math_sum: (...args) => {
    const nums = args.flat().map(Number).filter((n) => !isNaN(n));
    return nums.reduce((a, b) => a + b, 0);
  },
  math_avg: (...args) => {
    const nums = args.flat().map(Number).filter((n) => !isNaN(n));
    return nums.length === 0 ? 0 : nums.reduce((a, b) => a + b, 0) / nums.length;
  }
};

// src/expression/builtins/array.ts
var arrayBuiltins = {
  /** 在数组末尾追加一个或多个元素，修改原数组，返回新长度 */
  arr_push: (arr, ...items) => {
    if (!Array.isArray(arr))
      throw new TypeError("arr_push: \u7B2C\u4E00\u4E2A\u53C2\u6570\u5FC5\u987B\u662F\u6570\u7EC4");
    return arr.push(...items);
  },
  /** 移除数组最后一个元素，修改原数组，返回被移除的元素（空数组返回 undefined） */
  arr_pop: (arr) => {
    if (!Array.isArray(arr)) throw new TypeError("arr_pop: \u53C2\u6570\u5FC5\u987B\u662F\u6570\u7EC4");
    return arr.pop();
  },
  /** 在数组头部插入一个或多个元素，修改原数组，返回新长度 */
  arr_unshift: (arr, ...items) => {
    if (!Array.isArray(arr))
      throw new TypeError("arr_unshift: \u7B2C\u4E00\u4E2A\u53C2\u6570\u5FC5\u987B\u662F\u6570\u7EC4");
    return arr.unshift(...items);
  },
  /** 移除数组第一个元素，修改原数组，返回被移除的元素（空数组返回 undefined） */
  arr_shift: (arr) => {
    if (!Array.isArray(arr)) throw new TypeError("arr_shift: \u53C2\u6570\u5FC5\u987B\u662F\u6570\u7EC4");
    return arr.shift();
  },
  /** 合并数组，返回新数组，原数组不变 */
  arr_concat: (arr, ...others) => {
    if (!Array.isArray(arr))
      throw new TypeError("arr_concat: \u7B2C\u4E00\u4E2A\u53C2\u6570\u5FC5\u987B\u662F\u6570\u7EC4");
    return arr.concat(...others);
  },
  /** 用分隔符连接数组元素为字符串，不修改原数组 */
  arr_join: (arr, sep) => {
    if (!Array.isArray(arr))
      throw new TypeError("arr_join: \u7B2C\u4E00\u4E2A\u53C2\u6570\u5FC5\u987B\u662F\u6570\u7EC4");
    return arr.map((v) => String(v ?? "")).join(typeof sep === "string" ? sep : ",");
  },
  /** 原地反转数组，返回原数组引用 */
  arr_reverse: (arr) => {
    if (!Array.isArray(arr)) throw new TypeError("arr_reverse: \u53C2\u6570\u5FC5\u987B\u662F\u6570\u7EC4");
    return arr.reverse();
  },
  /** 原地排序数组，返回原数组引用 */
  arr_sort: (...args) => {
    const arr = args[0];
    const order = args[1];
    if (!Array.isArray(arr))
      throw new TypeError("arr_sort: \u7B2C\u4E00\u4E2A\u53C2\u6570\u5FC5\u987B\u662F\u6570\u7EC4");
    if (arr.length === 0) return arr;
    const desc = order === "desc";
    if (arr.every((v) => typeof v === "number")) {
      arr.sort(
        (a, b) => desc ? b - a : a - b
      );
    } else {
      arr.sort();
      if (desc) arr.reverse();
    }
    return arr;
  }
};

// src/expression/builtins/regex.ts
var regexBuiltins = {
  regex_test: (str, pattern) => {
    if (typeof str !== "string" || typeof pattern !== "string") return false;
    try {
      return new RegExp(pattern).test(str);
    } catch {
      return false;
    }
  },
  regex_match: (str, pattern) => {
    if (typeof str !== "string" || typeof pattern !== "string") return null;
    try {
      const m = new RegExp(pattern).exec(str);
      if (!m) return null;
      return {
        match: m[0],
        groups: m.length > 1 ? Array.from(m).slice(1) : [],
        index: m.index
      };
    } catch {
      return null;
    }
  },
  regex_match_all: (str, pattern) => {
    if (typeof str !== "string" || typeof pattern !== "string") return [];
    try {
      const results = [];
      const re = new RegExp(pattern, "g");
      let m;
      while ((m = re.exec(str)) !== null) {
        results.push({
          match: m[0],
          groups: m.length > 1 ? Array.from(m).slice(1) : [],
          index: m.index
        });
      }
      return results;
    } catch {
      return [];
    }
  }
};

// src/expression/builtins/date.ts
var MS_PER_UNIT = {
  second: 1e3,
  minute: 6e4,
  hour: 36e5,
  day: 864e5,
  week: 6048e5,
  month: 0,
  // 月/年天数不定，通过 setMonth/setFullYear 处理
  year: 0
};
function toTs(val) {
  if (val == null) return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}
function formatDate(d, pattern) {
  const pad2 = (n) => String(n).padStart(2, "0");
  const pad3 = (n) => String(n).padStart(3, "0");
  return pattern.replace(/YYYY/g, String(d.getFullYear())).replace(/MM/g, pad2(d.getMonth() + 1)).replace(/DD/g, pad2(d.getDate())).replace(/HH/g, pad2(d.getHours())).replace(/mm/g, pad2(d.getMinutes())).replace(/ss/g, pad2(d.getSeconds())).replace(/SSS/g, pad3(d.getMilliseconds()));
}
function parseDatePattern(str, pattern) {
  const regexParts = [];
  const fieldOrder = [];
  const fieldMap = {
    YYYY: "(\\d{4})",
    MM: "(\\d{2})",
    DD: "(\\d{2})",
    HH: "(\\d{2})",
    mm: "(\\d{2})",
    ss: "(\\d{2})",
    SSS: "(\\d{3})"
  };
  let remaining = pattern;
  while (remaining.length > 0) {
    let matched = false;
    for (const [token, regex] of Object.entries(fieldMap)) {
      if (remaining.startsWith(token)) {
        regexParts.push(regex);
        fieldOrder.push(token);
        remaining = remaining.slice(token.length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      const ch = remaining[0];
      regexParts.push(ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
      remaining = remaining.slice(1);
    }
  }
  const re = new RegExp("^" + regexParts.join("") + "$");
  const match = str.match(re);
  if (!match) return null;
  let year = 0, month = 0, day = 1, hour = 0, minute = 0, second = 0, millisecond = 0;
  for (let i = 0; i < fieldOrder.length; i++) {
    const val = parseInt(match[i + 1], 10);
    switch (fieldOrder[i]) {
      case "YYYY":
        year = val;
        break;
      case "MM":
        month = val - 1;
        break;
      case "DD":
        day = val;
        break;
      case "HH":
        hour = val;
        break;
      case "mm":
        minute = val;
        break;
      case "ss":
        second = val;
        break;
      case "SSS":
        millisecond = val;
        break;
    }
  }
  return new Date(year, month, day, hour, minute, second, millisecond);
}
function toDate(ts) {
  const n = toTs(ts);
  if (n === null) return null;
  const d = new Date(n);
  return isNaN(d.getTime()) ? null : d;
}
function isUnit(val) {
  return typeof val === "string" && ["second", "minute", "hour", "day", "week", "month", "year"].includes(val);
}
var dateBuiltins = {
  /**
   * 当前 Unix 时间戳（毫秒）
   */
  date_now: () => Date.now(),
  /**
   * 时间戳 → 格式化字符串
   *   date_format(ts, 'YYYY-MM-DD HH:mm:ss')
   */
  date_format: (ts, pattern) => {
    const d = toDate(ts);
    if (!d) return null;
    if (typeof pattern !== "string") return null;
    return formatDate(d, pattern);
  },
  /**
   * 格式化字符串 → 时间戳
   *   date_parse('2026-05-15', 'YYYY-MM-DD')
   */
  date_parse: (str, pattern) => {
    if (typeof str !== "string" || typeof pattern !== "string") return null;
    const d = parseDatePattern(str, pattern);
    if (!d || isNaN(d.getTime())) return null;
    return d.getTime();
  },
  /**
   * 时间加减
   *   date_add(ts, 1, 'day')     → 明天此时
   *   date_add(ts, -1, 'hour')   → 一小时前
   *   date_add(ts, 2, 'month')   → 两个月后
   */
  date_add: (ts, value, unit) => {
    const n = toTs(ts);
    const v = toTs(value);
    if (n === null || v === null || !isUnit(unit)) return null;
    const d = new Date(n);
    switch (unit) {
      case "month":
        d.setMonth(d.getMonth() + v);
        break;
      case "year":
        d.setFullYear(d.getFullYear() + v);
        break;
      default:
        return d.getTime() + v * MS_PER_UNIT[unit];
    }
    return d.getTime();
  },
  /**
   * 时间差
   *   date_diff(end, start, 'hour')  → 2.5
   *   date_diff(ts2, ts1, 'day')     → 3
   */
  date_diff: (ts1, ts2, unit) => {
    const a = toTs(ts1);
    const b = toTs(ts2);
    if (a === null || b === null || !isUnit(unit)) return null;
    const diffMs = a - b;
    switch (unit) {
      case "month":
        return (new Date(a).getFullYear() - new Date(b).getFullYear()) * 12 + (new Date(a).getMonth() - new Date(b).getMonth());
      case "year":
        return new Date(a).getFullYear() - new Date(b).getFullYear();
      default:
        return diffMs / MS_PER_UNIT[unit];
    }
  },
  /**
   * 提取日期字段
   *   date_get(ts, 'year')    → 2026
   *   date_get(ts, 'weekday') → 5  (0=周日)
   */
  date_get: (ts, field) => {
    const d = toDate(ts);
    if (!d || typeof field !== "string") return null;
    switch (field) {
      case "year":
        return d.getFullYear();
      case "month":
        return d.getMonth() + 1;
      case "day":
        return d.getDate();
      case "hour":
        return d.getHours();
      case "minute":
        return d.getMinutes();
      case "second":
        return d.getSeconds();
      case "millisecond":
        return d.getMilliseconds();
      case "weekday":
        return d.getDay();
      default:
        return null;
    }
  }
};

// src/expression/builtins/http.ts
function serializeHttpBody(body, contentType) {
  if (typeof body === "string") return body;
  if (typeof body === "object" && body !== null) {
    const ct = contentType.toLowerCase();
    if (ct.includes("application/json")) {
      return JSON.stringify(body);
    }
    if (ct.includes("x-www-form-urlencoded")) {
      return new URLSearchParams(body).toString();
    }
    if (ct.includes("multipart/form-data")) {
      const boundary = "----FormBoundary" + Math.random().toString(36).slice(2);
      const entries = Object.entries(body);
      const parts = entries.map(
        ([key, value]) => `--${boundary}\r
Content-Disposition: form-data; name="${key}"\r
\r
${value}\r
`
      );
      return parts.join("") + `--${boundary}--`;
    }
    return null;
  }
  return null;
}
async function responseToHttpResult(response) {
  const headers = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  const body = await response.text();
  return { status: response.status, headers, body };
}
async function doHttpRequest(url, method, body, reqHeaders, timeout) {
  const headers = new Headers(reqHeaders);
  let serializedBody;
  if (body !== void 0 && body !== null) {
    const contentType = (reqHeaders?.["Content-Type"] || reqHeaders?.["content-type"] || "").toLowerCase();
    if (contentType) {
      const result = serializeHttpBody(body, contentType);
      if (result === null) {
        return {
          status: 0,
          headers: {},
          body: "",
          error: "unsupported_content_type"
        };
      }
      serializedBody = result;
    } else if (typeof body === "string") {
      serializedBody = body;
    } else {
      return {
        status: 0,
        headers: {},
        body: "",
        error: "unsupported_content_type"
      };
    }
  }
  const init = { method, headers };
  if (serializedBody !== void 0) {
    init.body = serializedBody;
  }
  if (timeout > 0) {
    const controller = new AbortController();
    init.signal = controller.signal;
    setTimeout(() => controller.abort(), timeout);
  }
  try {
    const response = await fetch(url, init);
    return responseToHttpResult(response);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { status: 0, headers: {}, body: "", error: "timeout" };
    }
    return { status: 0, headers: {}, body: "", error: "network_error" };
  }
}
var httpBuiltinDefs = {
  http_get: async (url, headers) => {
    if (typeof url !== "string") return null;
    return doHttpRequest(
      url,
      "GET",
      void 0,
      typeof headers === "object" && headers !== null && !Array.isArray(headers) ? headers : void 0,
      0
    );
  },
  http_post: async (url, body, headers) => {
    if (typeof url !== "string") return null;
    return doHttpRequest(
      url,
      "POST",
      body,
      typeof headers === "object" && headers !== null && !Array.isArray(headers) ? headers : void 0,
      0
    );
  },
  http_fetch: async (url, options) => {
    if (typeof url !== "string") return null;
    const opts = typeof options === "object" && options !== null && !Array.isArray(options) ? options : {};
    const method = typeof opts.method === "string" ? opts.method : "GET";
    const body = opts.body;
    const headers = typeof opts.headers === "object" && opts.headers !== null && !Array.isArray(opts.headers) ? opts.headers : void 0;
    const timeout = typeof opts.timeout === "number" ? opts.timeout : 0;
    return doHttpRequest(url, method, body, headers, timeout);
  }
};
var httpBuiltins = httpBuiltinDefs;

// src/expression/builtins/index.ts
var builtins = {
  ...coreBuiltins,
  ...typeofBuiltins,
  ...stringBuiltins,
  ...mathBuiltins,
  ...arrayBuiltins,
  ...regexBuiltins,
  ...dateBuiltins,
  ...httpBuiltins
};

// src/expression/evaluator.ts
async function evaluate(node, ctx, logger, customFunctions) {
  switch (node.kind) {
    case "literal":
      return evaluateLiteral(node);
    case "path":
      return await evaluatePath(node, ctx, logger, customFunctions);
    case "binary":
      return await evaluateBinary(node, ctx, logger, customFunctions);
    case "unary":
      return await evaluateUnary(node, ctx, logger, customFunctions);
    case "call":
      return await evaluateCall(node, ctx, logger, customFunctions);
    case "paren":
      return await evaluate(node.expression, ctx, logger, customFunctions);
    case "bracket":
      return await evaluate(node.expr, ctx, logger, customFunctions);
    case "array":
      return await Promise.all(
        node.elements.map((el) => evaluate(el, ctx, logger, customFunctions))
      );
    case "object": {
      const obj = {};
      for (const prop of node.properties) {
        obj[prop.key] = await evaluate(
          prop.value,
          ctx,
          logger,
          customFunctions
        );
      }
      return obj;
    }
    default: {
      const _never = node;
      throw new Error(`Unknown AST node kind: ${_never.kind}`);
    }
  }
}
async function evaluateExpression(expr, ctx, logger, customFunctions) {
  logger?.debug("[evaluateExpression] \u6C42\u503C", { expr });
  const ast = parseExpression(expr);
  return await evaluate(ast, ctx, logger, customFunctions);
}
function evaluateLiteral(node) {
  return node.value;
}
async function evaluatePath(node, ctx, logger, customFunctions) {
  const first = node.segments[0];
  let value;
  if (typeof first === "string") {
    value = ctx.get(first);
  } else {
    value = await evaluate(first.expr, ctx, logger, customFunctions);
  }
  for (let i = 1; i < node.segments.length; i++) {
    const seg = node.segments[i];
    if (typeof seg === "string") {
      if (value == null || typeof value !== "object") {
        logger?.warn("[evaluatePath] \u8DEF\u5F84\u8BBF\u95EE\u8FD4\u56DE undefined", {
          segment: seg,
          index: i,
          valueType: value === null ? "null" : typeof value
        });
        return void 0;
      }
      value = value[seg];
    } else {
      const index = await evaluate(seg.expr, ctx, logger, customFunctions);
      if (Array.isArray(value)) {
        const idx = typeof index === "number" ? index : Number(index);
        value = value[idx];
      } else if (value != null && typeof value === "object") {
        const key = String(index);
        value = value[key];
      } else {
        return void 0;
      }
    }
  }
  return value;
}
async function evaluateBinary(node, ctx, logger, customFunctions) {
  const left = await evaluate(node.left, ctx, logger, customFunctions);
  const right = await evaluate(node.right, ctx, logger, customFunctions);
  let result;
  switch (node.operator) {
    case "&&":
      result = left && right;
      break;
    case "||":
      result = left || right;
      break;
    case "==":
      result = left == right;
      break;
    // 宽松相等，适合JSON场景
    case "!=":
      result = left != right;
      break;
    case ">":
      result = left > right;
      break;
    case "<":
      result = left < right;
      break;
    case ">=":
      result = left >= right;
      break;
    case "<=":
      result = left <= right;
      break;
    case "+":
      result = left + right;
      break;
    case "-":
      result = left - right;
      break;
    case "*":
      result = left * right;
      break;
    case "/":
      result = left / right;
      break;
    case "%":
      result = left % right;
      break;
    default:
      throw new Error(`Unknown binary operator: ${node.operator}`);
  }
  logger?.debug("[evaluateBinary] \u8FD0\u7B97", {
    operator: node.operator,
    left,
    right,
    result
  });
  return result;
}
async function evaluateUnary(node, ctx, _logger, customFunctions) {
  const value = await evaluate(node.argument, ctx, _logger, customFunctions);
  switch (node.operator) {
    case "!":
      return !value;
    case "-":
      return -value;
    default:
      throw new Error(`Unknown unary operator: ${node.operator}`);
  }
}
async function evaluateReceiver(segments, ctx, logger, customFunctions) {
  const first = segments[0];
  let value;
  if (typeof first === "string") {
    value = ctx.get(first);
  } else {
    value = await evaluate(first.expr, ctx, logger, customFunctions);
  }
  for (let i = 1; i < segments.length - 1; i++) {
    const seg = segments[i];
    if (value == null || typeof value !== "object") return void 0;
    if (typeof seg === "string") {
      value = value[seg];
    } else {
      const idx = await evaluate(seg.expr, ctx, logger, customFunctions);
      const key = typeof idx === "number" ? idx : String(idx);
      if (Array.isArray(value)) {
        const arrIdx = typeof idx === "number" ? idx : Number(idx);
        if (!Number.isFinite(arrIdx)) return void 0;
        value = value[arrIdx];
      } else {
        value = value[key];
      }
    }
  }
  return value;
}
async function evaluateCall(node, ctx, logger, customFunctions) {
  const segments = node.target.segments;
  const lastSeg = segments[segments.length - 1];
  if (!lastSeg || typeof lastSeg !== "string") {
    throw new Error("Invalid function name in call expression");
  }
  const methodName = lastSeg;
  logger?.debug("[evaluateCall] \u51FD\u6570\u8C03\u7528", {
    methodName,
    argCount: node.args.length,
    segments: segments.length
  });
  const firstSeg = segments[0];
  if (segments.length > 1 || typeof firstSeg !== "string") {
    const receiver = await evaluateReceiver(
      segments,
      ctx,
      logger,
      customFunctions
    );
    if (receiver != null && typeof receiver === "object") {
      const method = receiver[methodName];
      if (typeof method === "function") {
        const args = await Promise.all(
          node.args.map((arg) => evaluate(arg, ctx, logger, customFunctions))
        );
        return await method.apply(receiver, args);
      }
    }
    throw new Error(
      `Method '${methodName}' not found on ${receiver === null ? "null" : typeof receiver}`
    );
  }
  let fn = builtins[methodName];
  if (!fn && customFunctions) {
    fn = customFunctions[methodName];
  }
  if (fn) {
    const args = await Promise.all(
      node.args.map((arg) => evaluate(arg, ctx, logger, customFunctions))
    );
    return await fn(...args);
  }
  throw new Error(`Unknown function: ${methodName}`);
}

// src/engine/assign.ts
var templateCache = /* @__PURE__ */ new Map();
function parseTemplate(input) {
  const cached = templateCache.get(input);
  if (cached) return cached;
  const parts = [];
  const regex = /\$\{([^}]*)\}/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: "literal",
        value: input.slice(lastIndex, match.index)
      });
    }
    parts.push({ type: "expr", value: match[1] });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < input.length) {
    parts.push({ type: "literal", value: input.slice(lastIndex) });
  }
  if (parts.length === 0) {
    parts.push({ type: "literal", value: input });
  }
  templateCache.set(input, parts);
  return parts;
}
async function evaluateTemplate(input, ctx, logger, customFunctions) {
  const parts = parseTemplate(input);
  if (parts.length === 1 && parts[0].type === "literal") {
    return parts[0].value;
  }
  if (parts.length === 1 && parts[0].type === "expr") {
    return await evaluateExpression(
      parts[0].value,
      ctx,
      logger,
      customFunctions
    );
  }
  let result = "";
  for (const part of parts) {
    if (part.type === "literal") {
      result += part.value;
    } else {
      const value = await evaluateExpression(
        part.value,
        ctx,
        logger,
        customFunctions
      );
      result += String(value ?? "");
    }
  }
  return result;
}
async function evaluateAssign(template, ctx, logger, customFunctions) {
  if (template === null) {
    return null;
  }
  if (typeof template === "string") {
    return await evaluateTemplate(template, ctx, logger, customFunctions);
  }
  if (typeof template === "number" || typeof template === "boolean") {
    return template;
  }
  if (Array.isArray(template)) {
    return await Promise.all(
      template.map(
        (item) => evaluateAssign(item, ctx, logger, customFunctions)
      )
    );
  }
  if (typeof template === "object") {
    const result = {};
    for (const [key, value] of Object.entries(template)) {
      result[key] = await evaluateAssign(value, ctx, logger, customFunctions);
    }
    return result;
  }
  return template;
}

// src/engine/compiler.ts
function compileAssignTemplate(template) {
  if (template === null || template === void 0) return;
  if (typeof template === "string") {
    const regex = /\$\{([^}]*)\}/g;
    let match;
    while ((match = regex.exec(template)) !== null) {
      compileExpression(match[1]);
    }
    return;
  }
  if (typeof template === "number" || typeof template === "boolean") return;
  if (Array.isArray(template)) {
    for (const item of template) {
      compileAssignTemplate(item);
    }
    return;
  }
  if (typeof template === "object") {
    for (const value of Object.values(template)) {
      compileAssignTemplate(value);
    }
    return;
  }
}
function compileRule(rule, logger) {
  const entry = rule.entry ?? "main";
  logger?.debug("[compileRule] \u5F00\u59CB\u7F16\u8BD1", {
    entry,
    nodeGroups: Object.keys(rule.nodes ?? {})
  });
  const nodes = rule.nodes?.[entry];
  if (!rule.nodes || Object.keys(rule.nodes).length === 0) {
    logger?.error("[compileRule] \u89C4\u5219\u8282\u70B9\u5BF9\u8C61\u4E3A\u7A7A");
    throw new EngineError(
      "NODE_TYPE_ERROR" /* NODE_TYPE_ERROR */,
      "Rule definition must have a non-empty nodes object"
    );
  }
  if (!nodes || nodes.length === 0) {
    logger?.error("[compileRule] \u5165\u53E3\u8282\u70B9\u7EC4\u4E0D\u5B58\u5728\u6216\u4E3A\u7A7A", { entry });
    throw new EngineError(
      "NODE_TYPE_ERROR" /* NODE_TYPE_ERROR */,
      `Entry node group '${entry}' not found or empty`
    );
  }
  for (const [groupName, groupNodes] of Object.entries(rule.nodes)) {
    if (!Array.isArray(groupNodes)) {
      logger?.error("[compileRule] \u8282\u70B9\u7EC4\u5FC5\u987B\u662F\u6570\u7EC4", { groupName });
      throw new EngineError(
        "NODE_TYPE_ERROR" /* NODE_TYPE_ERROR */,
        `Node group '${groupName}' must be an array`
      );
    }
    logger?.debug("[compileRule] \u7F16\u8BD1\u8282\u70B9\u7EC4", {
      groupName,
      nodeCount: groupNodes.length
    });
    for (const node of groupNodes) {
      compileNode(node);
    }
  }
  logger?.debug("[compileRule] \u7F16\u8BD1\u5B8C\u6210");
}
function compileNode(node) {
  switch (node.type) {
    case "if": {
      const condition = node.condition;
      if (!condition) {
        throw new EngineError(
          "EXPRESSION_ERROR" /* EXPRESSION_ERROR */,
          "If node must have a condition"
        );
      }
      compileExpression(condition);
      for (const n of node.then) compileNode(n);
      if (node.else) {
        for (const n of node.else) compileNode(n);
      }
      break;
    }
    case "foreach": {
      const collection = node.collection;
      if (!collection) {
        throw new EngineError(
          "EXPRESSION_ERROR" /* EXPRESSION_ERROR */,
          "Foreach node must have a collection expression"
        );
      }
      compileExpression(collection);
      for (const n of node.body) compileNode(n);
      break;
    }
    case "while": {
      const condition = node.condition;
      if (!condition) {
        throw new EngineError(
          "EXPRESSION_ERROR" /* EXPRESSION_ERROR */,
          "While node must have a condition expression"
        );
      }
      compileExpression(condition);
      for (const n of node.body) compileNode(n);
      break;
    }
    case "return": {
      if (node.value) {
        compileExpression(node.value);
      }
      break;
    }
    case "set": {
      if (!node.variable || node.variable.trim() === "") {
        throw new EngineError(
          "NODE_TYPE_ERROR" /* NODE_TYPE_ERROR */,
          "Set node must have a non-empty variable"
        );
      }
      compileAssignTemplate(node.value);
      break;
    }
    case "custom": {
      if (node.params !== void 0) {
        compileAssignTemplate(node.params);
      }
      break;
    }
    case "exec": {
      if (!node.expression || node.expression.trim() === "") {
        throw new EngineError(
          "NODE_TYPE_ERROR" /* NODE_TYPE_ERROR */,
          "Exec node must have a non-empty expression"
        );
      }
      compileExpression(node.expression);
      break;
    }
    case "break":
    case "continue":
      break;
    default: {
      const _never = node;
      void _never;
      break;
    }
  }
}

// src/logger.ts
var NoopLogger = class {
  debug() {
  }
  info() {
  }
  warn() {
  }
  error() {
  }
};

// src/engine/engine.ts
var ControlSignal = /* @__PURE__ */ ((ControlSignal2) => {
  ControlSignal2["NONE"] = "none";
  ControlSignal2["BREAK"] = "break";
  ControlSignal2["CONTINUE"] = "continue";
  ControlSignal2["RETURN"] = "return";
  return ControlSignal2;
})(ControlSignal || {});
var RuleEngine = class {
  registry;
  loopStack = [];
  logger;
  customFunctions;
  constructor(options) {
    this.registry = options?.registry ?? new CustomNodeRegistry();
    this.logger = options?.logger ?? new NoopLogger();
    this.customFunctions = options?.functions;
  }
  /**
   * 执行规则定义
   * 内部自动编译：预解析所有表达式并验证结构，然后执行
   * @param rule JSON 规则定义
   * @returns 执行结果
   */
  async execute(rule, options) {
    try {
      this.loopStack = [];
      compileRule(rule, this.logger);
      const entry = rule.entry ?? "main";
      this.logger.info("[execute] \u5F00\u59CB\u6267\u884C", {
        entry,
        nodeGroups: Object.keys(rule.nodes),
        variableKeys: rule.variables ? Object.keys(rule.variables) : []
      });
      const ctx = new ExecutionContext(rule.variables);
      const nodes = rule.nodes[entry];
      const result = await this.executeNodes(nodes, ctx, options, "(execute)");
      if (result.signal === "return" /* RETURN */) {
        this.logger.info("[execute] \u6267\u884C\u5B8C\u6210\uFF08return\uFF09", {
          status: result.result.status
        });
        return result.result;
      }
      if (result.result.status === "failed") {
        this.logger.warn("[execute] \u6267\u884C\u5B8C\u6210\uFF08\u5931\u8D25\uFF09", {
          error: result.result.error?.message
        });
        return result.result;
      }
      this.logger.info("[execute] \u6267\u884C\u5B8C\u6210\uFF08\u6210\u529F\uFF09");
      return {
        status: "success",
        data: ctx.toJSON()
      };
    } catch (err) {
      const error = err instanceof EngineError ? err : new EngineError(
        "EXECUTE_ERROR" /* EXECUTE_ERROR */,
        `Rule execution failed: ${err instanceof Error ? err.message : String(err)}`,
        err
      );
      this.logger.error("[execute] \u6267\u884C\u5F02\u5E38", {
        message: error.message,
        code: error.code
      });
      return {
        status: "failed",
        error
      };
    }
  }
  /**
   * 执行一组节点
   * @returns 包含控制信号和执行结果
   */
  async executeNodes(nodes, ctx, options, groupName) {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (!node) {
        this.logger.error("[executeNodes] \u53D1\u73B0\u7A7A\u8282\u70B9", {
          group: groupName,
          index: i,
          total: nodes.length
        });
        throw new EngineError(
          "NODE_TYPE_ERROR" /* NODE_TYPE_ERROR */,
          `null/undefined node at index ${i} in group "${groupName ?? "?"}"`
        );
      }
      this.logger.debug("[executeNodes] \u6267\u884C\u8282\u70B9", {
        type: node.type,
        label: node.label
      });
      const outcome = await this.executeNode(node, ctx, options);
      if (outcome.signal !== "none" /* NONE */ || outcome.result.status === "failed") {
        return outcome;
      }
    }
    return { signal: "none" /* NONE */, result: { status: "success" } };
  }
  /**
   * 执行单个节点
   */
  async executeNode(node, ctx, options) {
    const stepCtx = { node, loopStack: [...this.loopStack] };
    this.logger.debug("[executeNode] StepContext", { stepCtx });
    if (options?.stepController && node.type !== "if" && node.type !== "while") {
      this.logger.debug("[executeNode] beforeStep", {
        type: node.type,
        label: node.label
      });
      const shouldContinue = await options.stepController.beforeStep(stepCtx);
      if (!shouldContinue) {
        this.logger.debug("[executeNode] beforeStep \u8FD4\u56DE false\uFF0C\u8DF3\u8FC7");
        return { signal: "none" /* NONE */, result: { status: "success" } };
      }
    }
    let outcome;
    switch (node.type) {
      case "if":
        outcome = await this.executeIf(node, ctx, options);
        break;
      case "foreach":
        outcome = await this.executeForeach(node, ctx, options);
        break;
      case "while":
        outcome = await this.executeWhile(node, ctx, options);
        break;
      case "break":
        outcome = this.executeBreak();
        break;
      case "continue":
        outcome = this.executeContinue();
        break;
      case "return":
        outcome = await this.executeReturn(node, ctx);
        break;
      case "custom":
        outcome = await this.executeCustom(node, ctx);
        break;
      case "set":
        outcome = await this.executeSet(node, ctx);
        break;
      case "exec":
        outcome = await this.executeExec(node, ctx);
        break;
      default: {
        const _never = node;
        throw new EngineError(
          "NODE_TYPE_ERROR" /* NODE_TYPE_ERROR */,
          `Unknown node type: ${_never.type}`
        );
      }
    }
    options?.stepController?.afterStep(stepCtx, ctx, outcome.result);
    return outcome;
  }
  /**
   * IF 节点 - 条件分支（fork 子作用域，set 自动向上查找父级）
   */
  async executeIf(node, ctx, options) {
    const stepController = options?.stepController;
    if (stepController) {
      const shouldContinue = await stepController.beforeConditionCheck({
        type: "if",
        condition: node.condition,
        result: true,
        // 占位值，此时尚未求值
        loopStack: [...this.loopStack],
        nodeId: node.label,
        phase: "before"
      });
      if (!shouldContinue) {
        return { signal: "none" /* NONE */, result: { status: "success" } };
      }
    }
    const condition = await evaluateExpression(
      node.condition,
      ctx,
      this.logger,
      this.customFunctions
    );
    const branch = condition ? node.then : node.else ?? [];
    this.logger.debug("[executeIf] \u6761\u4EF6\u5206\u652F", {
      condition: node.condition,
      result: !!condition,
      branch: condition ? "then" : "else",
      thenLen: node.then.length,
      elseLen: (node.else ?? []).length
    });
    stepController?.onConditionCheck?.({
      type: "if",
      condition: node.condition,
      result: !!condition,
      loopStack: [...this.loopStack],
      nodeId: node.label,
      phase: "after"
    });
    if (branch.length === 0) {
      return { signal: "none" /* NONE */, result: { status: "success" } };
    }
    const branchCtx = ctx.fork();
    return this.executeNodes(branch, branchCtx, options, "(if\u5206\u652F)");
  }
  /**
   * FOREACH 节点 - 遍历集合（fork 子作用域，set 自动向上查找父级）
   */
  async executeForeach(node, ctx, options) {
    const collection = await evaluateExpression(
      node.collection,
      ctx,
      this.logger,
      this.customFunctions
    );
    if (!Array.isArray(collection)) {
      return {
        signal: "none" /* NONE */,
        result: {
          status: "success",
          data: null
        }
      };
    }
    for (let i = 0; i < collection.length; i++) {
      this.logger.debug("[executeForeach] \u8FED\u4EE3", {
        collection: node.collection,
        index: i,
        total: collection.length
      });
      options?.stepController?.onConditionCheck?.({
        type: "foreach",
        condition: node.collection,
        result: true,
        loopStack: [...this.loopStack],
        iterationIndex: i,
        phase: "after"
      });
      const itemVar = {
        [node.item]: collection[i]
      };
      if (node.index) {
        itemVar[node.index] = i;
      }
      const loopCtx = ctx.fork(itemVar);
      this.loopStack.push({
        type: "foreach",
        index: i,
        itemKey: node.item,
        total: collection.length
      });
      const outcome = await this.executeNodes(
        node.body,
        loopCtx,
        options,
        "(foreach body)"
      );
      this.loopStack.pop();
      if (outcome.signal === "break" /* BREAK */) {
        return { signal: "none" /* NONE */, result: { status: "success" } };
      }
      if (outcome.signal === "continue" /* CONTINUE */) {
        continue;
      }
      if (outcome.signal === "return" /* RETURN */) {
        return outcome;
      }
    }
    return { signal: "none" /* NONE */, result: { status: "success" } };
  }
  /**
   * WHILE 节点 — 条件循环
   * 每次条件判断前暂停（stepping 模式），求值后记录条件结果到日志
   */
  async executeWhile(node, ctx, options) {
    let iterationIndex = 0;
    const stepController = options?.stepController;
    while (true) {
      if (stepController) {
        const shouldContinue = await stepController.beforeConditionCheck({
          type: "while",
          condition: node.condition,
          result: true,
          // 占位值，此时尚未求值
          loopStack: [...this.loopStack],
          iterationIndex,
          nodeId: node.label,
          phase: "before"
        });
        if (!shouldContinue) {
          return { signal: "none" /* NONE */, result: { status: "success" } };
        }
      }
      const conditionResult = await evaluateExpression(
        node.condition,
        ctx,
        this.logger,
        this.customFunctions
      ) === true;
      stepController?.onConditionCheck?.({
        type: "while",
        condition: node.condition,
        result: conditionResult,
        // 真实结果
        loopStack: [...this.loopStack],
        iterationIndex,
        phase: "after"
      });
      if (!conditionResult) break;
      this.logger.debug("[executeWhile] \u8FED\u4EE3", { index: iterationIndex });
      this.loopStack.push({
        type: "while",
        index: iterationIndex
      });
      const outcome = await this.executeNodes(
        node.body,
        ctx,
        options,
        "(while body)"
      );
      this.loopStack.pop();
      if (outcome.signal === "break" /* BREAK */) {
        return { signal: "none" /* NONE */, result: { status: "success" } };
      }
      if (outcome.signal === "continue" /* CONTINUE */) {
        iterationIndex++;
        continue;
      }
      if (outcome.signal === "return" /* RETURN */) {
        return outcome;
      }
      iterationIndex++;
    }
    return { signal: "none" /* NONE */, result: { status: "success" } };
  }
  /**
   * BREAK 节点 - 跳出循环
   */
  executeBreak() {
    if (this.loopStack.length === 0) {
      this.logger.warn("[executeBreak] \u4E0D\u5728\u5FAA\u73AF\u5185\uFF0C\u5FFD\u7565");
      return {
        signal: "none" /* NONE */,
        result: {
          status: "failed",
          error: new EngineError(
            "NODE_TYPE_ERROR" /* NODE_TYPE_ERROR */,
            "'break' can only be used inside a foreach/while"
          )
        }
      };
    }
    this.logger.debug("[executeBreak] \u8DF3\u51FA\u5FAA\u73AF");
    return { signal: "break" /* BREAK */, result: { status: "success" } };
  }
  /**
   * CONTINUE 节点 - 跳过当前迭代
   */
  executeContinue() {
    if (this.loopStack.length === 0) {
      this.logger.warn("[executeContinue] \u4E0D\u5728\u5FAA\u73AF\u5185\uFF0C\u5FFD\u7565");
      return {
        signal: "none" /* NONE */,
        result: {
          status: "failed",
          error: new EngineError(
            "NODE_TYPE_ERROR" /* NODE_TYPE_ERROR */,
            "'continue' can only be used inside a foreach/while"
          )
        }
      };
    }
    this.logger.debug("[executeContinue] \u8DF3\u8FC7\u8FED\u4EE3");
    return { signal: "continue" /* CONTINUE */, result: { status: "success" } };
  }
  /**
   * RETURN 节点 - 终止规则执行
   */
  async executeReturn(node, ctx) {
    let value = void 0;
    if (node.value !== void 0) {
      value = await evaluateExpression(
        node.value,
        ctx,
        this.logger,
        this.customFunctions
      );
    }
    this.logger.debug("[executeReturn] \u7EC8\u6B62\u6267\u884C", {
      hasValue: value !== void 0
    });
    return {
      signal: "return" /* RETURN */,
      result: {
        status: "success",
        data: value
      }
    };
  }
  /**
   * CUSTOM 节点 - 执行自定义处理器
   */
  async executeCustom(node, ctx) {
    const handler = this.registry.get(node.name);
    if (!handler) {
      this.logger.warn("[executeCustom] \u5904\u7406\u5668\u672A\u627E\u5230", {
        handlerName: node.name
      });
      return {
        signal: "none" /* NONE */,
        result: {
          status: "failed",
          error: new EngineError(
            "CUSTOM_NODE_NOT_FOUND" /* CUSTOM_NODE_NOT_FOUND */,
            `Custom node handler '${node.name}' not found`
          )
        }
      };
    }
    this.logger.debug("[executeCustom] \u6267\u884C\u5904\u7406\u5668", { name: node.name });
    const params = node.params ? await evaluateAssign(
      node.params,
      ctx,
      this.logger,
      this.customFunctions
    ) : void 0;
    const result = await handler(params, ctx);
    return {
      signal: "none" /* NONE */,
      result
    };
  }
  /**
   * SET 节点 - 设置变量值
   */
  async executeSet(node, ctx) {
    if (!node.variable || node.variable.trim() === "") {
      throw new EngineError(
        "NODE_TYPE_ERROR" /* NODE_TYPE_ERROR */,
        "Set node must have a non-empty variable"
      );
    }
    const value = await evaluateAssign(
      node.value,
      ctx,
      this.logger,
      this.customFunctions
    );
    ctx.set(node.variable, value);
    this.logger.debug("[executeSet] \u53D8\u91CF\u53D8\u66F4", {
      variable: node.variable,
      valueType: typeof value,
      value
    });
    return {
      signal: "none" /* NONE */,
      result: { status: "success", data: value }
    };
  }
  /**
   * EXEC 节点 - 执行表达式并丢弃返回值（用于副作用函数）
   */
  async executeExec(node, ctx) {
    if (!node.expression || node.expression.trim() === "") {
      throw new EngineError(
        "NODE_TYPE_ERROR" /* NODE_TYPE_ERROR */,
        "Exec node must have a non-empty expression"
      );
    }
    await evaluateExpression(
      node.expression,
      ctx,
      this.logger,
      this.customFunctions
    );
    return {
      signal: "none" /* NONE */,
      result: { status: "success", data: null }
    };
  }
};

// src/engine/debugger.ts
var DebugStepController = class {
  mode = "stepping";
  resolveWait = null;
  rejectWait = null;
  lastResult = null;
  /** 暂停时的回调，通知外部"引擎已暂停在某个节点前"。 */
  onPause;
  /** 节点执行完成后的回调，用于记录日志。 */
  onAfterStep;
  /** 条件检查事件回调 — before 阶段暂停UI，after 阶段记录日志。 */
  onConditionCheck;
  /**
   * 在节点执行前调用。
   * 如果处于 stepping 模式，返回一个 Promise，直到 step() / runToCompletion() / abort() 才 resolve。
   * 如果处于 running 模式，立即返回 true。
   *
   * @returns true 表示可以继续执行，false 表示被中止
   */
  async beforeStep(context) {
    if (this.mode === "running") return true;
    this.onPause?.(context);
    return new Promise((resolve, reject) => {
      this.resolveWait = () => resolve(true);
      this.rejectWait = () => reject(new Error("Debug session aborted"));
    }).catch(() => false).finally(() => {
      this.resolveWait = null;
      this.rejectWait = null;
    });
  }
  /** 节点执行完成后调用，触发 onAfterStep 回调。 */
  afterStep(context, ctx, result) {
    this.lastResult = result;
    this.onAfterStep?.(context, ctx, result);
  }
  /** 获取上一次执行的结果。 */
  getLastResult() {
    return this.lastResult;
  }
  /**
   * 条件判断前暂停 — 与 beforeStep 共享 pause 机制。
   * 在 while 循环每次条件求值前调用，允许用户单步观察条件判断过程。
   */
  async beforeConditionCheck(info) {
    this.onConditionCheck?.({ ...info, phase: "before" });
    if (this.mode === "running") return true;
    return new Promise((resolve, reject) => {
      this.resolveWait = () => resolve(true);
      this.rejectWait = () => reject(new Error("Debug session aborted"));
    }).catch(() => false).finally(() => {
      this.resolveWait = null;
      this.rejectWait = null;
    });
  }
  /** 执行下一步（暂停 → 恢复执行一个节点） */
  step() {
    this.resolveWait?.();
  }
  /** 继续运行直到结束（恢复执行，不再暂停） */
  runToCompletion() {
    this.mode = "running";
    this.resolveWait?.();
  }
  /** 中止调试会话 */
  abort() {
    this.mode = "running";
    this.rejectWait?.(new Error("Debug session aborted"));
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ControlSignal,
  CustomNodeRegistry,
  DebugStepController,
  EngineError,
  ErrorCode,
  ExecutionContext,
  NoopLogger,
  RuleEngine,
  clearExpressionCache,
  compileExpression,
  compileRule,
  evaluate,
  evaluateExpression,
  parseExpression
});
//# sourceMappingURL=index.cjs.map