// 核心引擎
export { RuleEngine } from "./engine/engine";
export { ControlSignal } from "./engine/engine";

// 自定义节点注册
export { CustomNodeRegistry } from "./engine/registry";
export type { CustomNodeHandler } from "./engine/registry";

// 规则编译器（预编译阶段）
export { compileRule } from "./engine/compiler";

// 错误处理
export { ErrorCode, EngineError } from "./types/error";

// 基础类型
export type {
  NodeType,
  ExecuteStatus,
  ExecuteResult,
  BaseNode,
  AllowedValue,
  AllowedObject,
} from "./types/node";

// 规则节点类型
export type {
  RuleNode,
  Expression,
  IfNode,
  ForeachNode,
  WhileNode,
  BreakNode,
  ContinueNode,
  ReturnNode,
  CustomNode,
  SetNode,
  ExecNode,
  AssignTemplate,
} from "./types/rule";

// 规则定义
export type { RuleDefinition } from "./types/schema";

// 执行上下文（供自定义节点实现者使用）
export { ExecutionContext } from "./context/context";

// 表达式求值（供自定义节点实现者使用）
export { evaluateExpression, evaluate } from "./expression/evaluator";
export type { CustomFunction } from "./expression/evaluator";
export {
  compileExpression,
  parseExpression,
  clearExpressionCache,
} from "./expression/parser";

// 表达式 AST 类型
export type {
  ASTNode,
  LiteralNode,
  PathNode,
  BinaryOpNode,
  UnaryOpNode,
  CallNode,
  ParenNode,
} from "./expression/types";

// 调试支持
export type { ExecuteOptions } from "./engine/engine";
export { DebugStepController } from "./engine/debugger";
export type {
  LoopFrame,
  StepContext,
  ConditionCheckInfo,
} from "./engine/debugger";

// 日志接口
export { NoopLogger } from "./logger";
export type { Logger } from "./logger";
