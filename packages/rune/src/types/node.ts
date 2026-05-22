import { EngineError } from "./error";

// 节点类型 - 字符串字面量联合类型
export type NodeType = "if" | "foreach" | "while" | "break" | "continue" | "return" | "custom" | "set" | "exec";

// 执行状态
export type ExecuteStatus = "success" | "failed";

/**
 * 规则引擎允许的变量值类型
 * - 基本类型: string, number, boolean, null, undefined
 * - 对象: 键为字符串，值为 AllowedValue 或 AllowedValue[]
 * - 数组: 元素为 AllowedValue
 * 不支持: Map, Set, Date, RegExp, Function, Promise, Symbol, BigInt 等
 */
export type AllowedValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | AllowedObject
  | AllowedValue[];

/** 允许的对象类型 - 键值对结构，值可以是基本类型或数组 */
export interface AllowedObject {
  [key: string]: AllowedValue;
}

export type BaseNode = {
  type: NodeType; // 节点类型
  label?: string; // 节点标识（可视化/调试/追踪用）
};

// 执行结果（所有节点执行返回统一结构）
export type ExecuteResult = {
  status: ExecuteStatus;
  data?: AllowedValue; // 执行结果数据
  error?: EngineError; // 异常信息
};
