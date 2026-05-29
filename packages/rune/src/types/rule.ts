import { BaseNode, NodeType } from "./node";

/**
 * 表达式类型 - 使用字符串形式的表达式语言
 * 语法示例: "data.items.len() > 0 && data.user.level >= 3"
 */
export type Expression = string;

/** IF 节点 - 条件分支 */
export interface IfNode extends BaseNode {
  type: "if";
  condition: Expression;
  then: RuleNode[]; // 条件为真时执行的节点
  else?: RuleNode[]; // 条件为假时执行的节点
}

/** 循环合并模式 — 控制子作用域变量如何传播到父级（已废弃，set 行为自动向上查找父级） */
export type LoopMergeMode = "deep" | "shallow" | "none";

/** FOREACH 节点 - 遍历集合 */
export interface ForeachNode extends BaseNode {
  type: "foreach";
  collection: Expression; // 求值为数组的表达式
  item: string; // 当前项的变量名，如 "item"
  index?: string; // 索引的变量名，如 "idx"
  body: RuleNode[]; // 每次迭代执行的节点
}

/** WHILE 节点 — 条件循环 */
export interface WhileNode extends BaseNode {
  type: "while";
  condition: Expression; // 求值为 boolean 的表达式
  body: RuleNode[];
}

/** BREAK 节点 - 跳出循环 */
export interface BreakNode extends BaseNode {
  type: "break";
}

/** CONTINUE 节点 - 跳过当前迭代，继续下一轮 */
export interface ContinueNode extends BaseNode {
  type: "continue";
}

/** RETURN 节点 - 终止规则执行 */
export interface ReturnNode extends BaseNode {
  type: "return";
  value?: Expression; // 可选的返回值
}

/** CUSTOM 节点 - 自定义业务节点 */
export interface CustomNode extends BaseNode {
  type: "custom";
  name: string; // 注册的处理函数名称，如 "http.get"
  params?: AssignTemplate; // 参数使用赋值模板（支持字面量、嵌套对象/数组、${expr} 模板）
}

/** SET 节点 - 设置变量值，支持嵌套模板 */
export interface SetNode extends BaseNode {
  type: "set";
  variable: string; // 目标变量路径
  value: AssignTemplate; // 赋值模板结构
}

/** EXEC 节点 - 执行纯表达式并丢弃返回值（用于副作用函数如日志、HTTP 调用等） */
export interface ExecNode extends BaseNode {
  type: "exec";
  expression: Expression; // 纯表达式字符串，如 "log(data.result)"
}

/** 赋值模板 — 递归结构，支持嵌套对象/数组和 ${expr} 模板字符串 */
export type AssignTemplate =
  | string // 字面量或含 ${expr} 的模板字符串
  | number // 数字字面量
  | boolean // 布尔字面量
  | null // null 字面量
  | AssignTemplate[] // 数组
  | { [key: string]: AssignTemplate }; // 对象

/** 所有具体节点类型的联合类型（discriminated union） */
export type RuleNode =
  | IfNode
  | ForeachNode
  | WhileNode
  | BreakNode
  | ContinueNode
  | ReturnNode
  | CustomNode
  | SetNode
  | ExecNode;
