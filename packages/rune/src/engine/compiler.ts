import { RuleDefinition } from "../types/schema";
import { RuleNode } from "../types/rule";
import { compileExpression } from "../expression/parser";
import { EngineError, ErrorCode } from "../types/error";
import { AssignTemplate } from "../types/rule";
import { Logger } from "../logger";

/**
 * 遍历 AssignTemplate 结构，提取并预编译所有表达式字符串
 */
function compileAssignTemplate(template: AssignTemplate): void {
  if (template === null || template === undefined) return;

  if (typeof template === "string") {
    // 模板字符串：提取 ${expr} 并预编译
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

/**
 * 编译规则定义 — 预解析所有表达式并验证结构完整性
 *
 * 作用：
 * 1. 预编译所有表达式（IfNode.condition、LoopNode.collection、ReturnNode.value、
 *    SetNode.value、CustomNode.params），将 AST 存入全局缓存
 * 2. 验证规则结构：入口节点存在、节点组非空
 * 3. 在规则加载时就发现错误，避免执行到一半才报错
 *
 * @param rule 规则定义
 * @throws EngineError 如果规则结构无效或表达式解析失败
 */
export function compileRule(rule: RuleDefinition, logger?: Logger): void {
  const entry = rule.entry ?? "main";

  logger?.debug("[compileRule] 开始编译", {
    entry,
    nodeGroups: Object.keys(rule.nodes ?? {}),
  });

  const nodes = rule.nodes?.[entry];

  if (!rule.nodes || Object.keys(rule.nodes).length === 0) {
    logger?.error("[compileRule] 规则节点对象为空");
    throw new EngineError(
      ErrorCode.NODE_TYPE_ERROR,
      "Rule definition must have a non-empty nodes object",
    );
  }

  if (!nodes || nodes.length === 0) {
    logger?.error("[compileRule] 入口节点组不存在或为空", { entry });
    throw new EngineError(
      ErrorCode.NODE_TYPE_ERROR,
      `Entry node group '${entry}' not found or empty`,
    );
  }

  // 递归编译所有节点组中的表达式
  for (const [groupName, groupNodes] of Object.entries(rule.nodes) as [
    string,
    RuleNode[],
  ][]) {
    if (!Array.isArray(groupNodes)) {
      logger?.error("[compileRule] 节点组必须是数组", { groupName });
      throw new EngineError(
        ErrorCode.NODE_TYPE_ERROR,
        `Node group '${groupName}' must be an array`,
      );
    }

    logger?.debug("[compileRule] 编译节点组", {
      groupName,
      nodeCount: groupNodes.length,
    });

    for (const node of groupNodes) {
      compileNode(node);
    }
  }

  logger?.debug("[compileRule] 编译完成");
}

/**
 * 编译单个节点中的表达式
 */
function compileNode(node: RuleNode): void {
  switch (node.type) {
    case "if": {
      const condition = node.condition;
      if (!condition) {
        throw new EngineError(
          ErrorCode.EXPRESSION_ERROR,
          "If node must have a condition",
        );
      }
      compileExpression(condition);
      // 递归编译子节点
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
          ErrorCode.EXPRESSION_ERROR,
          "Foreach node must have a collection expression",
        );
      }
      compileExpression(collection);
      // 递归编译 body
      for (const n of node.body) compileNode(n);
      break;
    }

    case "while": {
      const condition = node.condition;
      if (!condition) {
        throw new EngineError(
          ErrorCode.EXPRESSION_ERROR,
          "While node must have a condition expression",
        );
      }
      compileExpression(condition);
      // 递归编译 body
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
      // 编译期校验：variable 不能为空
      if (!node.variable || node.variable.trim() === "") {
        throw new EngineError(
          ErrorCode.NODE_TYPE_ERROR,
          "Set node must have a non-empty variable",
        );
      }
      compileAssignTemplate(node.value);
      break;
    }

    case "custom": {
      if (node.params !== undefined) {
        compileAssignTemplate(node.params);
      }
      break;
    }

    case "exec": {
      // 编译期校验：expression 不能为空
      if (!node.expression || node.expression.trim() === "") {
        throw new EngineError(
          ErrorCode.NODE_TYPE_ERROR,
          "Exec node must have a non-empty expression",
        );
      }
      compileExpression(node.expression);
      break;
    }

    case "break":
    case "continue":
      // 无表达式，无需编译
      break;

    default: {
      // 未知节点类型在执行时才会报错
      const _never: never = node;
      void _never;
      break;
    }
  }
}
