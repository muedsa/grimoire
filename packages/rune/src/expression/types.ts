/** 表达式 AST 节点类型 */

export type LiteralKind = "string" | "number" | "boolean" | "null";

export interface LiteralNode {
  kind: "literal";
  type: LiteralKind;
  value: string | number | boolean | null;
}

export interface PathNode {
  kind: "path";
  segments: PathSegment[];  // ["data", "user", "level"] 或 ["data", "items", 0] 或 ["data", BracketSegment{ expr }]
}

/** 方括号索引段 — 存储括号内的表达式 */
export interface BracketSegment {
  kind: "bracket";
  expr: ASTNode;
}

/** 路径段的类型 — 字符串属性名或方括号索引 */
export type PathSegment = string | BracketSegment;

export interface BinaryOpNode {
  kind: "binary";
  operator: "==" | "!=" | ">" | "<" | ">=" | "<=" | "&&" | "||" | "+" | "-" | "*" | "/" | "%";
  left: ASTNode;
  right: ASTNode;
}

export interface UnaryOpNode {
  kind: "unary";
  operator: "!" | "-";
  argument: ASTNode;
}

export interface CallNode {
  kind: "call";
  target: PathNode;        // 被调用的函数路径，如 ["len"] 或 ["data", "items", "len"]
  args: ASTNode[];
}

export interface ParenNode {
  kind: "paren";
  expression: ASTNode;
}

/** 数组字面量 */
export interface ArrayNode {
  kind: "array";
  elements: ASTNode[];
}

/** 对象字面量 */
export interface ObjectNode {
  kind: "object";
  properties: { key: string; value: ASTNode }[];
}

/** AST 节点联合类型 */
export type ASTNode =
  | LiteralNode
  | PathNode
  | BinaryOpNode
  | UnaryOpNode
  | CallNode
  | ParenNode
  | BracketSegment
  | ArrayNode
  | ObjectNode;
