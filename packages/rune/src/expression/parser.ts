import {
  ASTNode,
  LiteralKind,
  LiteralNode,
  PathNode,
  BinaryOpNode,
  UnaryOpNode,
  CallNode,
  ParenNode,
  BracketSegment,
} from "./types";
import { EngineError, ErrorCode } from "../types/error";

/**
 * 表达式词法分析器 - 将字符串切分为词法单元
 */
type TokenType =
  | "number"
  | "string"
  | "identifier"
  | "operator"
  | "lparen"
  | "rparen"
  | "lbracket"
  | "rbracket"
  | "lbrace"
  | "rbrace"
  | "comma"
  | "dot"
  | "colon"
  | "eof";

interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  let lastType: TokenType = "eof"; // 上一个 token 的类型

  while (pos < input.length) {
    const ch = input[pos];

    // 跳过空白
    if (/\s/.test(ch)) {
      pos++;
      continue;
    }

    // 字符串字面量
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
                value += "\t";
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
          ErrorCode.EXPRESSION_ERROR,
          `Unterminated string at position ${pos}`,
        );
      }
      pos++; // 跳过结束引号
      const tok: Token = { type: "string", value, pos: pos - value.length - 2 };
      tokens.push(tok);
      lastType = tok.type;
      continue;
    }

    // 数字（以 . 开头的小数仅在数字/标识符之后才不解析为小数，否则作为 . + 数字分开解析）
    const cantStartDecimal =
      lastType === "number" ||
      lastType === "identifier" ||
      lastType === "operator" ||
      lastType === "string";
    if (
      /\d/.test(ch) ||
      (ch === "." &&
        pos + 1 < input.length &&
        /\d/.test(input[pos + 1]) &&
        !cantStartDecimal)
    ) {
      let num = "";
      const start = pos;
      // 从 . 开始的十进制数（leading decimal）
      if (ch === ".") {
        num += ".";
        pos++;
        while (pos < input.length && /\d/.test(input[pos])) {
          num += input[pos];
          pos++;
        }
      } else {
        // 以数字开头：先收集整数部分
        while (pos < input.length && /\d/.test(input[pos])) {
          num += input[pos];
          pos++;
        }
        // 只有在 . 之后才不收集小数部分（因为 . 后面的 .digits 应拆分为 dot + number）
        const afterDot = lastType === "dot";
        if (
          !afterDot &&
          pos < input.length &&
          input[pos] === "." &&
          pos + 1 < input.length &&
          /\d/.test(input[pos + 1])
        ) {
          num += ".";
          pos++;
          while (pos < input.length && /\d/.test(input[pos])) {
            num += input[pos];
            pos++;
          }
        }
      }
      const tok: Token = { type: "number", value: num, pos: start };
      tokens.push(tok);
      lastType = tok.type;
      continue;
    }

    // 标识符
    if (/[a-zA-Z_$]/.test(ch)) {
      let id = "";
      while (pos < input.length && /[a-zA-Z0-9_$]/.test(input[pos])) {
        id += input[pos];
        pos++;
      }
      const tok: Token = {
        type: "identifier",
        value: id,
        pos: pos - id.length,
      };
      tokens.push(tok);
      lastType = tok.type;
      continue;
    }

    // 运算符和标点
    if (ch === "+" || ch === "-" || ch === "*" || ch === "/" || ch === "%") {
      const tok: Token = { type: "operator", value: ch, pos };
      tokens.push(tok);
      lastType = tok.type;
      pos++;
      continue;
    }

    // 比较运算符（支持 ==, !=, >=, <=）
    if (ch === "=" || ch === "!" || ch === ">" || ch === "<") {
      if (pos + 1 < input.length && input[pos + 1] === "=") {
        const tok: Token = { type: "operator", value: ch + "=", pos };
        tokens.push(tok);
        lastType = tok.type;
        pos += 2;
        continue;
      }
      const tok: Token = { type: "operator", value: ch, pos };
      tokens.push(tok);
      lastType = tok.type;
      pos++;
      continue;
    }

    // 逻辑运算符 && ||
    if (ch === "&" && pos + 1 < input.length && input[pos + 1] === "&") {
      const tok: Token = { type: "operator", value: "&&", pos };
      tokens.push(tok);
      lastType = tok.type;
      pos += 2;
      continue;
    }
    if (ch === "|" && pos + 1 < input.length && input[pos + 1] === "|") {
      const tok: Token = { type: "operator", value: "||", pos };
      tokens.push(tok);
      lastType = tok.type;
      pos += 2;
      continue;
    }

    // 括号和逗号
    if (ch === "(") {
      const tok: Token = { type: "lparen", value: "(", pos };
      tokens.push(tok);
      lastType = tok.type;
      pos++;
      continue;
    }
    if (ch === ")") {
      const tok: Token = { type: "rparen", value: ")", pos };
      tokens.push(tok);
      lastType = tok.type;
      pos++;
      continue;
    }
    if (ch === "[") {
      const tok: Token = { type: "lbracket", value: "[", pos };
      tokens.push(tok);
      lastType = tok.type;
      pos++;
      continue;
    }
    if (ch === "]") {
      const tok: Token = { type: "rbracket", value: "]", pos };
      tokens.push(tok);
      lastType = tok.type;
      pos++;
      continue;
    }
    if (ch === "{") {
      const tok: Token = { type: "lbrace", value: "{", pos };
      tokens.push(tok);
      lastType = tok.type;
      pos++;
      continue;
    }
    if (ch === "}") {
      const tok: Token = { type: "rbrace", value: "}", pos };
      tokens.push(tok);
      lastType = tok.type;
      pos++;
      continue;
    }
    if (ch === ",") {
      const tok: Token = { type: "comma", value: ",", pos };
      tokens.push(tok);
      lastType = tok.type;
      pos++;
      continue;
    }
    if (ch === ":") {
      const tok: Token = { type: "colon", value: ":", pos };
      tokens.push(tok);
      lastType = tok.type;
      pos++;
      continue;
    }
    if (ch === ".") {
      const tok: Token = { type: "dot", value: ".", pos };
      tokens.push(tok);
      lastType = tok.type;
      pos++;
      continue;
    }

    throw new EngineError(
      ErrorCode.EXPRESSION_ERROR,
      `Unexpected character '${ch}' at position ${pos}`,
    );
  }

  tokens.push({ type: "eof", value: "", pos });
  return tokens;
}

/**
 * 递归下降解析器
 */
export class ExpressionParser {
  private tokens: Token[] = [];
  private pos = 0;

  parse(input: string): ASTNode {
    this.tokens = tokenize(input);
    this.pos = 0;
    const node = this.parseOr();
    this.expect("eof");
    return node;
  }

  // 或运算: expr || expr
  private parseOr(): ASTNode {
    let left = this.parseAnd();
    while (
      this.current().type === "operator" &&
      this.current().value === "||"
    ) {
      const op = this.consume().value as BinaryOpNode["operator"];
      const right = this.parseAnd();
      left = { kind: "binary", operator: op, left, right } as BinaryOpNode;
    }
    return left;
  }

  // 与运算: expr && expr
  private parseAnd(): ASTNode {
    let left = this.parseEquality();
    while (
      this.current().type === "operator" &&
      this.current().value === "&&"
    ) {
      const op = this.consume().value as BinaryOpNode["operator"];
      const right = this.parseEquality();
      left = { kind: "binary", operator: op, left, right } as BinaryOpNode;
    }
    return left;
  }

  // 相等运算: expr == expr | expr != expr
  private parseEquality(): ASTNode {
    let left = this.parseComparison();
    while (
      this.current().type === "operator" &&
      (this.current().value === "==" || this.current().value === "!=")
    ) {
      const op = this.consume().value as BinaryOpNode["operator"];
      const right = this.parseComparison();
      left = { kind: "binary", operator: op, left, right } as BinaryOpNode;
    }
    return left;
  }

  // 比较运算: expr < expr | expr > expr | expr <= expr | expr >= expr
  private parseComparison(): ASTNode {
    let left = this.parseAdditive();
    while (
      this.current().type === "operator" &&
      /[<>]/.test(this.current().value)
    ) {
      const op = this.consume().value as BinaryOpNode["operator"];
      const right = this.parseAdditive();
      left = { kind: "binary", operator: op, left, right } as BinaryOpNode;
    }
    return left;
  }

  // 加减运算: expr + expr | expr - expr
  private parseAdditive(): ASTNode {
    let left = this.parseMultiplicative();
    while (
      this.current().type === "operator" &&
      (this.current().value === "+" || this.current().value === "-")
    ) {
      const op = this.consume().value as BinaryOpNode["operator"];
      const right = this.parseMultiplicative();
      left = { kind: "binary", operator: op, left, right } as BinaryOpNode;
    }
    return left;
  }

  // 乘除取模运算: expr * expr | expr / expr | expr % expr
  private parseMultiplicative(): ASTNode {
    let left = this.parseUnary();
    while (
      this.current().type === "operator" &&
      (this.current().value === "*" ||
        this.current().value === "/" ||
        this.current().value === "%")
    ) {
      const op = this.consume().value as BinaryOpNode["operator"];
      const right = this.parseUnary();
      left = { kind: "binary", operator: op, left, right } as BinaryOpNode;
    }
    return left;
  }

  // 一元运算: !expr, -expr
  private parseUnary(): ASTNode {
    const op = this.current().value;
    if (this.current().type === "operator" && (op === "!" || op === "-")) {
      // 区分一元和二元：前一个 token 不是数字/标识符/右括号/右方括号时视为一元
      const prev = this.prev();
      const isUnary =
        !prev ||
        prev.type === "lparen" ||
        prev.type === "lbracket" ||
        prev.type === "comma" ||
        prev.type === "operator" ||
        prev.type === "eof";
      if (isUnary) {
        this.consume();
        const argument = this.parseUnary();
        return {
          kind: "unary",
          operator: op as "!" | "-",
          argument,
        } as UnaryOpNode;
      }
    }
    return this.parsePrimary();
  }

  // 基本表达式: 字面量 | 路径 | 函数调用 | 括号
  private parsePrimary(): ASTNode {
    const token = this.current();

    // 括号表达式
    if (token.type === "lparen") {
      this.consume();
      const expr = this.parseOr();
      this.expect("rparen");
      return { kind: "paren", expression: expr } as ParenNode;
    }

    // 字符串字面量
    if (token.type === "string") {
      this.consume();
      return {
        kind: "literal",
        type: "string",
        value: token.value,
      } as LiteralNode;
    }

    // 数字字面量
    if (token.type === "number") {
      this.consume();
      return {
        kind: "literal",
        type: "number",
        value: parseFloat(token.value),
      } as LiteralNode;
    }

    // 数组字面量: [1, 2, 3]
    if (token.type === "lbracket") {
      this.consume(); // consume '['
      const elements: ASTNode[] = [];
      if (this.current().type !== "rbracket") {
        elements.push(this.parseOr());
        while (this.current().type === "comma") {
          this.consume();
          if (this.current().type === "rbracket") break; // 允许尾随逗号
          elements.push(this.parseOr());
        }
      }
      this.expect("rbracket");
      return { kind: "array", elements };
    }

    // 对象字面量: {key: value}
    if (token.type === "lbrace") {
      this.consume(); // consume '{'
      const properties: { key: string; value: ASTNode }[] = [];
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

    // 布尔值和 null（标识符形式）
    if (token.type === "identifier") {
      if (token.value === "true") {
        this.consume();
        return { kind: "literal", type: "boolean", value: true } as LiteralNode;
      }
      if (token.value === "false") {
        this.consume();
        return {
          kind: "literal",
          type: "boolean",
          value: false,
        } as LiteralNode;
      }
      if (token.value === "null") {
        this.consume();
        return { kind: "literal", type: "null", value: null } as LiteralNode;
      }

      // 路径或函数调用
      return this.parsePathOrCall();
    }

    throw new EngineError(
      ErrorCode.EXPRESSION_ERROR,
      `Unexpected token ${token.type} '${token.value}' at position ${token.pos}`,
    );
  }

  // 解析对象属性: key: value 或 "key": value
  private parseObjectProperty(): { key: string; value: ASTNode } {
    const token = this.current();
    let key: string;
    if (token.type === "string") {
      key = this.consume().value;
    } else if (token.type === "identifier") {
      key = this.consume().value;
    } else {
      throw new EngineError(
        ErrorCode.EXPRESSION_ERROR,
        `Expected property key but got ${token.type} at position ${token.pos}`,
      );
    }
    this.expect("colon");
    const value = this.parseOr();
    return { key, value };
  }

  // 解析路径或函数调用: data.user.len() | data.items[0] | arr[idx]
  private parsePathOrCall(): PathNode | CallNode {
    const segments: (string | BracketSegment)[] = [];

    // 第一个标识符
    if (this.current().type === "identifier") {
      segments.push(this.consume().value);
    }

    // 继续解析点分隔的路径和方括号索引
    while (true) {
      // 点分隔路径
      if (this.current().type === "dot") {
        this.consume();
        if (
          this.current().type === "identifier" ||
          this.current().type === "number"
        ) {
          segments.push(this.consume().value);
        } else {
          throw new EngineError(
            ErrorCode.EXPRESSION_ERROR,
            `Expected identifier or number after '.' at position ${this.current().pos}`,
          );
        }
        continue;
      }

      // 方括号索引
      if (this.current().type === "lbracket") {
        this.consume(); // consume '['
        const expr = this.parseOr();
        this.expect("rbracket");
        const bracket: BracketSegment = { kind: "bracket", expr };
        segments.push(bracket);
        continue;
      }

      break;
    }

    // 检查是否是函数调用
    if (this.current().type === "lparen") {
      this.consume();
      const args: ASTNode[] = [];

      if (this.current().type !== "rparen") {
        args.push(this.parseOr());
        while (this.current().type === "comma") {
          this.consume();
          args.push(this.parseOr());
        }
      }

      this.expect("rparen");

      const callNode: ASTNode = {
        kind: "call",
        target: { kind: "path", segments },
        args,
      } as CallNode;

      // 函数调用后可链式访问属性: fn().prop 或 fn()[idx]
      if (this.current().type === "dot" || this.current().type === "lbracket") {
        const chainSegments: (string | BracketSegment)[] = [];
        while (true) {
          if (this.current().type === "dot") {
            this.consume();
            if (
              this.current().type === "identifier" ||
              this.current().type === "number"
            ) {
              chainSegments.push(this.consume().value);
            } else {
              throw new EngineError(
                ErrorCode.EXPRESSION_ERROR,
                `Expected identifier or number after '.' at position ${this.current().pos}`,
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
        // 链式访问后可能再跟函数调用: fn().prop()
        if (this.current().type === "lparen") {
          this.consume();
          const chainArgs: ASTNode[] = [];
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
              segments: [{ kind: "bracket", expr: callNode }, ...chainSegments],
            },
            args: chainArgs,
          } as CallNode;
        }
        // 函数调用后链式访问属性: fn().prop
        return {
          kind: "path",
          segments: [{ kind: "bracket", expr: callNode }, ...chainSegments],
        } as PathNode;
      }

      return callNode;
    }

    return { kind: "path", segments };
  }

  private current(): Token {
    return this.tokens[this.pos];
  }

  private prev(): Token | undefined {
    return this.pos > 0 ? this.tokens[this.pos - 1] : undefined;
  }

  private consume(): Token {
    const token = this.tokens[this.pos];
    this.pos++;
    return token;
  }

  private expect(type: TokenType): Token {
    const token = this.current();
    if (token.type !== type) {
      throw new EngineError(
        ErrorCode.EXPRESSION_ERROR,
        `Expected ${type} but got ${token.type} '${token.value}' at position ${token.pos}`,
      );
    }
    return this.consume();
  }
}

/**
 * 解析表达式字符串为 AST（带缓存）
 * 相同表达式字符串只会解析一次，后续调用直接返回缓存的 AST
 */
const expressionCache = new Map<string, ASTNode>();

export function compileExpression(input: string): ASTNode {
  const cached = expressionCache.get(input);
  if (cached) return cached;

  const parser = new ExpressionParser();
  const ast = parser.parse(input);
  expressionCache.set(input, ast);
  return ast;
}

export function parseExpression(input: string): ASTNode {
  return compileExpression(input);
}

/**
 * 清除表达式缓存（主要用于测试）
 */
export function clearExpressionCache(): void {
  expressionCache.clear();
}
