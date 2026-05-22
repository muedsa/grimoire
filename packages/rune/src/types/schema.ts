import { RuleNode } from "./rule";
import { AllowedValue } from "./node";

/**
 * 规则定义 - JSON规则的顶层结构
 *
 * 示例:
 * {
 *   "name": "media-search-rule",
 *   "entry": "main",
 *   "variables": { "data": { "keyword": "test" } },
 *   "nodes": {
 *     "main": [
 *       { "type": "if", "condition": "exists(data.keyword)", "then": [...], "else": [...] }
 *     ]
 *   }
 * }
 */
export interface RuleDefinition {
  /** 规则名称（可选，用于调试和日志） */
  name?: string;
  /** 入口节点组名称，默认为 "main" */
  entry?: string;
  /** 初始变量值 - 仅支持基本类型、对象和数组 */
  variables?: Record<string, AllowedValue>;
  /** 命名节点组 - 每个 key 是一个路径/标签，value 是节点数组 */
  nodes: Record<string, RuleNode[]>;
}
