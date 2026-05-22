/**
 * JSON 导入逻辑 — 将 RuleDefinition JSON 反解析为画布节点和边
 *
 * 数据流：
 *   JSON 文本 → parseRuleJson() → RuleDefinition (已验证)
 *   → ruleToFlowState() → { nodes: SigilNode[], edges: Edge[] }
 *   → 写入 flow store
 */

import type { RuleDefinition, RuleNode } from "@grimoire/rune";
import { compileRule } from "@grimoire/rune";
import type { Edge, XYPosition } from "@xyflow/react";
import type { SigilNode } from "@/store/flow";
import {
  createSigilNode,
  generateUniqueNodeId,
  START_NODE_ID,
} from "@/store/flow";

/**
 * 解析 JSON 字符串为 RuleDefinition，并调用 compileRule 预验证。
 * 失败时抛出 Error（调用方捕获后显示提示）。
 */
export function parseRuleJson(raw: string): RuleDefinition {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("文件格式错误，无法解析为 JSON");
  }

  if (!isRuleDefinition(parsed)) {
    throw new Error("文件不是有效的规则定义");
  }

  const rule = parsed as RuleDefinition;

  // 利用 rune compiler 预验证
  try {
    compileRule(rule);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`规则编译失败: ${msg}`);
  }

  return rule;
}

/** 简单检查 JSON 是否符合 RuleDefinition 结构 */
function isRuleDefinition(obj: unknown): obj is RuleDefinition {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return typeof o.nodes === "object" && o.nodes !== null;
}

/**
 * 将 RuleDefinition 转换为 React Flow 的节点和边。
 * 布局基准偏移给 start 节点和画布边缘留空间。
 */
export function ruleToFlowState(rule: RuleDefinition): {
  nodes: SigilNode[];
  edges: Edge[];
} {
  const entry = rule.entry ?? "main";
  const entryNodes = rule.nodes[entry] ?? [];

  const flowNodes: SigilNode[] = [];
  const labelToFlowId = new Map<string, string>();
  const parentMap: Map<string, string> = new Map(); // childLabel → parentLabel 映射，辅助构建层级关系
  flatRuleNodes(entryNodes, parentMap, undefined).forEach((ruleNode) => {
    const flowNode = createFlowNodeFromRuleNode(ruleNode, parentMap, {
      x: 0,
      y: 0,
    });
    flowNodes.push(flowNode);
    if (ruleNode.label && !labelToFlowId.has(ruleNode.label)) {
      labelToFlowId.set(ruleNode.label, flowNode.id);
    }
  });

  // 构建边
  const flowEdges = buildEdges(entryNodes, labelToFlowId);

  // start → 第一个节点
  if (entryNodes.length > 0) {
    const firstId = flowNodes[0]?.id;
    if (firstId) {
      flowEdges.unshift({
        id: `${START_NODE_ID}-out-${firstId}`,
        source: START_NODE_ID,
        target: firstId,
        sourceHandle: "out",
        type: "simplebezier",
        animated: true,
      });
    }
  }

  console.log("[import] 边数量:", flowEdges.length);
  for (const e of flowEdges) {
    console.log(
      `[import] edge ${e.source}[${e.sourceHandle ?? "out"}] → ${e.target}`,
    );
  }

  return { nodes: flowNodes, edges: flowEdges };
}

function createFlowNodeFromRuleNode(
  ruleNode: RuleNode,
  parentMap: Map<string, string>,
  position: XYPosition,
): SigilNode {
  if (!ruleNode.label) {
    ruleNode.label = generateUniqueNodeId(ruleNode.type);
  }

  const parentId = parentMap.get(ruleNode.label);

  // 基础节点对象
  const base: SigilNode = createSigilNode(
    ruleNode.type,
    position,
    ruleNode.label,
    parentId,
  );

  // 根据节点类型填入具体 config
  applyConfig(base, ruleNode);

  return base;
}

/** 从 RuleNode 中读取配置并写入 SigilNode 的 config */
function applyConfig(flowNode: SigilNode, ruleNode: RuleNode): void {
  const c = flowNode.data.config as Record<string, unknown>;
  switch (ruleNode.type) {
    case "set":
      c.variable = ruleNode.variable;
      c.value = ruleNode.value;
      break;
    case "if":
      c.condition = ruleNode.condition;
      break;
    case "foreach":
      c.collection = ruleNode.collection;
      c.item = ruleNode.item;
      if (ruleNode.index) c.index = ruleNode.index;
      break;
    case "while":
      c.condition = ruleNode.condition;
      break;
    case "return":
      if (ruleNode.value !== undefined) c.value = ruleNode.value;
      break;
    case "custom":
      c.name = ruleNode.name;
      if (ruleNode.params) c.params = ruleNode.params;
      break;
    case "exec":
      c.expression = ruleNode.expression;
      break;
  }
}

/**
 * 遍历 RuleNode 树形结构，为所有父子关系构建 Edge。
 *
 * 连线规则：
 * - 同层级顺序连接：node[i] → node[i+1]（通过 out handle）
 * - if 节点三出边：then → then 第一个子节点，else → else 第一个子节点，out 由顺序连线覆盖
 * - foreach/while 两出边：body → body 第一个子节点，out 由顺序连线覆盖
 * - break/continue/return 无出边（无 out 连接）
 */
function buildEdges(
  ruleNodes: RuleNode[],
  labelToFlowId: Map<string, string>,
): Edge[] {
  const edges: Edge[] = [];
  let prevId: string | null = null;

  for (let i = 0; i < ruleNodes.length; i++) {
    const node = ruleNodes[i];
    const id = resolveFlowId(node, labelToFlowId);

    // 同层级顺序连线: prev → current
    if (prevId && id) {
      edges.push({
        id: `${prevId}-out-${id}`,
        source: prevId,
        target: id,
        sourceHandle: "out",
        type: "simplebezier",
        animated: true,
      });
    }

    if (node.type === "if") {
      // then 边
      const thenFirst = node.then[0];
      if (thenFirst) {
        const thenId = resolveFlowId(thenFirst, labelToFlowId);
        if (id && thenId) {
          edges.push({
            id: `${id}-then-${thenId}`,
            source: id,
            target: thenId,
            sourceHandle: "then",
            type: "simplebezier",
            animated: true,
          });
        }
        edges.push(...buildEdges(node.then, labelToFlowId));
      }
      // else 边
      if (node.else && node.else.length > 0) {
        const elseFirst = node.else[0];
        const elseId = resolveFlowId(elseFirst, labelToFlowId);
        if (id && elseId) {
          edges.push({
            id: `${id}-else-${elseId}`,
            source: id,
            target: elseId,
            sourceHandle: "else",
            type: "simplebezier",
            animated: true,
          });
        }
        edges.push(...buildEdges(node.else, labelToFlowId));
      }
    } else if (node.type === "foreach" || node.type === "while") {
      // body 边
      const bodyFirst = node.body[0];
      if (bodyFirst) {
        const bodyId = resolveFlowId(bodyFirst, labelToFlowId);
        if (id && bodyId) {
          edges.push({
            id: `${id}-body-${bodyId}`,
            source: id,
            target: bodyId,
            sourceHandle: "body",
            type: "simplebezier",
            animated: true,
          });
        }
        edges.push(...buildEdges(node.body, labelToFlowId));
      }
    }
    // break/continue/return 不继续连线（无出边）

    prevId =
      node.type === "break" ||
      node.type === "continue" ||
      node.type === "return"
        ? null
        : id;
  }

  return edges;
}

/** 从 label→id 映射中查找 flow node id，找不到则生成一个 */
function resolveFlowId(
  node: RuleNode,
  map: Map<string, string>,
): string | null {
  if (node.label && map.has(node.label)) {
    return map.get(node.label)!;
  }
  throw new Error(`无法解析节点 "${node.label ?? "?"}" 的 ID，label 未映射`);
}

function flatRuleNodes(
  nodes: RuleNode[],
  parentMap: Map<string, string>,
  parentNode?: RuleNode,
): RuleNode[] {
  const result: RuleNode[] = [];
  for (const node of nodes) {
    result.push(node);
    if (parentNode) {
      parentMap.set(node.label!!, parentNode.label!!);
    }
    if (node.type === "if") {
      result.push(...flatRuleNodes(node.then, parentMap, parentNode));
    }
    if (node.type === "if" && node.else) {
      result.push(...flatRuleNodes(node.else, parentMap, parentNode));
    }
    if (node.type === "foreach" || node.type === "while") {
      result.push(...flatRuleNodes(node.body, parentMap, node));
    }
  }
  return result;
}
