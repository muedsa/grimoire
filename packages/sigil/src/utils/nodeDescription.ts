import { RuleNode } from "@grimoire/rune";
import { templateSummary } from "./templateSummary";

/**
 * 生成节点的基础描述（可选携带条件求值结果）
 * @param node 规则节点
 * @param conditionResult if 节点的条件求值结果（运行时）
 */
export function describeNode(
  node: RuleNode,
  conditionResult?: boolean,
): string {
  switch (node.type) {
    case "set":
      return `设置 ${node.variable} = ${templateSummary(node.value, 30)}`;

    case "if":
      return `条件 ${node.condition}${conditionResult !== undefined ? (conditionResult ? " 为 true" : " 为 false") : ""}`;

    case "foreach":
      return `遍历 ${node.collection}`;

    case "while":
      return `条件 ${node.condition}`;

    case "break":
      return "跳出循环";

    case "continue":
      return "继续下一次循环";

    case "return":
      return `返回 ${node.value !== undefined ? templateSummary(node.value, 30) : "..."}`;

    case "custom":
      return `调用 ${node.name}`;

    case "exec":
      return `执行 ${node.expression}`;

    default: {
      const _never: never = node;
      return (_never as { type: string }).type;
    }
  }
}

/**
 * 补充 if 节点的分支信息
 */
export function describeIfResult(conditionResult: boolean): string {
  return conditionResult ? " 为 true" : " 为 false";
}
