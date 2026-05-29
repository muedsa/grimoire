import type { RuleNode, IfNode, ForeachNode, WhileNode } from "@grimoire/rune";
import { Dimensions, Rect, Node } from "@xyflow/react";

/** 位置分配结果（关联原始 RuleNode） */
export type LayoutedNode = Rect & {
  node: RuleNode;
  children?: LayoutedNode[];
};

/** 布局参数常量 */
export const GAP = 40; // 节点间距
const PADDING = 16; // 组容器内边距
const GROUP_HEADER_H = 16; // 组容器 header 高度

/** 尺寸获取函数：给定 RuleNode，返回其在画布上的实际或估算尺寸 */
export type NodeSizer = (node: RuleNode) => Dimensions;

function log(...args: unknown[]) {
  console.log("[layout]", ...args);
}

/** 从 node 获取实际尺寸（优先用 measured，包含 NodeResizer 缩放后的值） */
export function getFlowNodeSize(node: Node): Dimensions {
  const width = node.measured?.width ?? node.width;
  if (width == null) throw new Error(`node ${node.id} width is null`);
  const height = node.measured?.height ?? node.height;
  if (height == null) throw new Error(`node ${node.id} height is null`);
  return { width, height };
}

export function createNodeSizer(nodes: Node[]): NodeSizer {
  const sizeMap = new Map<string, { width: number; height: number }>();
  for (const node of nodes) {
    const { width, height } = getFlowNodeSize(node); // 复用已有函数
    sizeMap.set(node.id, { width, height });
  }
  return (node: RuleNode) => {
    const size = sizeMap.get(node.label!!);
    if (!size) throw new Error(`size not found for node ${node.label}`);
    return size;
  };
}

/**
 * 将 if 节点的 then/else 分支子树沿 x 方向偏移。
 *
 * @param treeResult    子树布局结果（节点坐标已按父节点中轴线居中）
 * @param direction     -1 = then（左移），1 = else（右移）
 * @param nodeWidth     if 节点自身宽度
 * @returns 偏移后的子节点、该半区宽度和高度
 */
function shiftChildNodesX(
  treeResult: { nodes: LayoutedNode[]; treeSize: Dimensions },
  direction: -1 | 1,
  nodeWidth: number,
): { nodes: LayoutedNode[]; halfWidth: number; height: number } {
  // 保证子节点树与 if 节点之间至少有 GAP 间距
  let childHorizontalGap = GAP;
  if (treeResult.treeSize.width < nodeWidth) {
    childHorizontalGap = nodeWidth - treeResult.treeSize.width + GAP;
  }
  const offset = treeResult.treeSize.width / 2 + childHorizontalGap / 2;
  const shiftedNodes = treeResult.nodes.map((n) => ({
    ...n,
    x: n.x + direction * offset,
  }));
  return {
    nodes: shiftedNodes,
    halfWidth: treeResult.treeSize.width + childHorizontalGap / 2,
    height: treeResult.treeSize.height,
  };
}

/** 布局上下文 — 在各子函数间传递不变的参数 */
interface LayoutCtx {
  centerX: number;
  getSize: NodeSizer;
  depth: number;
}

/** 叶子节点：水平居中于中轴线，垂直紧接当前 y */
function layoutLeafNode(
  node: RuleNode,
  y: number,
  ctx: LayoutCtx,
): LayoutedNode {
  const { width: nodeWidth, height: nodeHeight } = ctx.getSize(node);
  log(
    `[${ctx.depth}] layoutLeafNode ${node.type} "${node.label}" pos=(${ctx.centerX - nodeWidth / 2}, ${y}) size=${nodeWidth}x${nodeHeight}`,
  );
  return {
    node,
    x: ctx.centerX - nodeWidth / 2,
    y,
    width: nodeWidth,
    height: nodeHeight,
  };
}

/**
 * if 节点布局：
 *   1. 将 if 节点本身居中放置
 *   2. 递归布局 then 子树 → 左移
 *   3. 递归布局 else 子树 → 右移
 * 返回 if 节点 + 所有分支子节点的扁平列表 + box 尺寸
 */
function layoutIfNode(
  node: IfNode,
  y: number,
  ctx: LayoutCtx,
): { nodes: LayoutedNode[]; boxHalfWidth: number; boxHeight: number } {
  const { width: nodeWidth, height: nodeHeight } = ctx.getSize(node);
  log(
    `[${ctx.depth}] layoutIfNode "${node.label}" at center(${ctx.centerX}, ${y}) size=${nodeWidth}x${nodeHeight}`,
  );

  const result: LayoutedNode[] = [
    {
      node,
      x: ctx.centerX - nodeWidth / 2,
      y,
      width: nodeWidth,
      height: nodeHeight,
    },
  ];

  let boxHalfWidth = nodeWidth / 2;
  let boxHeight = nodeHeight;

  // then 分支（下方左侧）
  if (node.then && node.then.length > 0) {
    const thenLayout = layoutNodes(
      node.then,
      ctx.centerX,
      y + nodeHeight + GAP,
      ctx.getSize,
      ctx.depth + 1,
    );
    log(
      `[${ctx.depth}] if then tree`,
      JSON.stringify(thenLayout.treeSize, null, 2),
    );
    const shifted = shiftChildNodesX(thenLayout, -1, nodeWidth);
    result.push(...shifted.nodes);
    boxHalfWidth = Math.max(boxHalfWidth, shifted.halfWidth);
    boxHeight = Math.max(boxHeight, nodeHeight + GAP + shifted.height);
  }

  // else 分支（下方右侧）
  if (node.else && node.else.length > 0) {
    const elseLayout = layoutNodes(
      node.else,
      ctx.centerX,
      y + nodeHeight + GAP,
      ctx.getSize,
      ctx.depth + 1,
    );
    log(
      `[${ctx.depth}] if else tree`,
      JSON.stringify(elseLayout.treeSize, null, 2),
    );
    const shifted = shiftChildNodesX(elseLayout, 1, nodeWidth);
    result.push(...shifted.nodes);
    boxHalfWidth = Math.max(boxHalfWidth, shifted.halfWidth);
    boxHeight = Math.max(boxHeight, nodeHeight + GAP + shifted.height);
  }

  return { nodes: result, boxHalfWidth, boxHeight };
}

/**
 * 组容器节点布局（foreach/while）：
 *   1. 先递归布局 body 子树（子坐标相对于容器原点）
 *   2. 根据子树尺寸计算容器尺寸
 *   3. 将容器居中放置，直接子节点 x 偏移 groupWidth/2 实现居中
 *
 * 直接子节点通过 children 字段嵌套保留，避免子节点的子孙也被外层偏移。
 */
function layoutGroupNode(
  node: ForeachNode | WhileNode,
  y: number,
  ctx: LayoutCtx,
): { groupNode: LayoutedNode; width: number; height: number } {
  log(
    `[${ctx.depth}] layoutGroupNode ${node.type} "${node.label}" at center(${ctx.centerX}, ${y})`,
  );

  // 先布局组内节点，坐标相对于容器内部（原点为 0, GROUP_HEADER_H + PADDING）
  const bodyLayout = layoutNodes(
    node.body,
    0,
    GROUP_HEADER_H + PADDING,
    ctx.getSize,
    ctx.depth + 1,
  );
  log(
    `[${ctx.depth}] ${node.type} "${node.label}" body`,
    JSON.stringify(bodyLayout.treeSize, null, 2),
  );

  const groupWidth = bodyLayout.treeSize.width + PADDING * 2;
  const groupHeight = GROUP_HEADER_H + bodyLayout.treeSize.height + PADDING * 2;

  // 仅偏移直接子节点（不偏移孙子节点，它们已在各自父节点的 children 中）
  const shiftedChildren = bodyLayout.nodes.map((child) => ({
    ...child,
    x: child.x + groupWidth / 2,
  }));

  // 容器本体居中，children 字段仅在容器上设置（BFS 遍历时会通过 children 发现子节点）
  const groupNode: LayoutedNode = {
    node,
    x: ctx.centerX - groupWidth / 2,
    y,
    width: groupWidth,
    height: groupHeight,
    children: shiftedChildren,
  };

  return { groupNode, width: groupWidth, height: groupHeight };
}

/**
 * 递归布局一组 RuleNode。
 * 根据节点类型分派到 layoutLeafNode / layoutIfNode / layoutGroupNode。
 */
export function layoutNodes(
  nodes: RuleNode[],
  centerX: number,
  originY: number,
  getSize: NodeSizer,
  depth = 0,
): { nodes: LayoutedNode[]; treeSize: Dimensions } {
  const ctx: LayoutCtx = { centerX, getSize, depth };
  const result: LayoutedNode[] = [];
  let y = originY;
  let maxWidth = 0;

  for (const node of nodes) {
    log(
      `[${depth}] layoutNodes dispatch ${node.type} "${node.label}" at center(${centerX}, ${y})`,
    );

    if (node.type === "if") {
      const sub = layoutIfNode(node, y, ctx);
      result.push(...sub.nodes);
      maxWidth = Math.max(maxWidth, sub.boxHalfWidth * 2);
      y += sub.boxHeight + GAP;
    } else if (
      (node.type === "foreach" || node.type === "while") &&
      node.body.length > 0
    ) {
      const { groupNode, width, height } = layoutGroupNode(node, y, ctx);
      result.push(groupNode);
      maxWidth = Math.max(maxWidth, width);
      y += height + GAP;
    } else {
      const leaf = layoutLeafNode(node, y, ctx);
      result.push(leaf);
      maxWidth = Math.max(maxWidth, leaf.width ?? 0);
      y += (leaf.height ?? 0) + GAP;
    }
  }

  return {
    nodes: result,
    treeSize: { width: maxWidth, height: y - originY - GAP },
  };
}

export function layoutAndFlatten(
  nodes: RuleNode[],
  centerX: number,
  originY: number,
  getSize: NodeSizer,
) {
  log("rule nodes", JSON.stringify(nodes, null, 2));
  const { nodes: tree, treeSize } = layoutNodes(
    nodes,
    centerX,
    originY,
    getSize,
  );
  log("layout tree nodes", JSON.stringify(tree, null, 2));

  const queue: LayoutedNode[] = [...tree];
  const flattened: LayoutedNode[] = [];
  let head = 0;
  while (head < queue.length) {
    const current = queue[head++];
    const { children } = current;
    flattened.push(current);
    if (children && children.length > 0) {
      for (const child of children) {
        queue.push(child);
      }
    }
  }

  log("layout flattened nodes", JSON.stringify(flattened, null, 2));
  return { nodes: flattened, treeSize };
}
