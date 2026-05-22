import { Node, useReactFlow, XYPosition } from "@xyflow/react";
import { getFlowNodeSize } from "@/utils/layout";

/** 检查某个点是否在 loop-group 节点的范围内，返回面积最小的那个（最内层） */
export function findLoopContainerAt(
  pos: { x: number; y: number },
  getNodes: ReturnType<typeof useReactFlow>["getNodes"],
  getInternalNode: ReturnType<typeof useReactFlow>["getInternalNode"],
): Node | undefined {
  const allNodes = getNodes();
  let smallest: Node | undefined;
  let smallestArea = Infinity;
  for (const node of allNodes) {
    if (
      (node as any).type !== "foreachGroup" &&
      (node as any).type !== "whileGroup"
    )
      continue;
    // 使用 getInternalNode 获取包含 measured 尺寸的 internal node
    const internalNode = getInternalNode(node.id);
    if (!internalNode) continue;
    const { width, height } = getFlowNodeSize(internalNode);
    // 使用 internals.positionAbsolute 获取节点在 flow 空间中的实际位置
    const nx = internalNode.internals?.positionAbsolute?.x ?? node.position.x;
    const ny = internalNode.internals?.positionAbsolute?.y ?? node.position.y;
    if (
      pos.x >= nx &&
      pos.x <= nx + width &&
      pos.y >= ny &&
      pos.y <= ny + height
    ) {
      const area = width * height;
      if (area < smallestArea) {
        smallestArea = area;
        smallest = node;
      }
    }
  }
  return smallest;
}

/** 处理拖放：根据落点位置设置 parentId */
export function handleDrop(
  positionAtScreen: XYPosition,
  screenToFlowPosition: ReturnType<typeof useReactFlow>["screenToFlowPosition"],
  getNodes: ReturnType<typeof useReactFlow>["getNodes"],
  getInternalNode: ReturnType<typeof useReactFlow>["getInternalNode"],
): { position: { x: number; y: number }; parentId?: string } {
  // 将屏幕坐标转换为 flow 坐标
  const position = screenToFlowPosition(positionAtScreen);

  // 检查是否落在 loop-group 内
  const loopContainer = findLoopContainerAt(
    position,
    getNodes,
    getInternalNode,
  );

  // 子节点的 position 需要转换为相对于父容器的局部坐标
  let parentId: string | undefined = loopContainer?.id;
  let localPosition = position;
  if (loopContainer) {
    const internalNode = getInternalNode(loopContainer.id);
    // 使用 positionAbsolute 获取父容器在 flow 空间中的实际位置
    const parentX =
      internalNode?.internals?.positionAbsolute?.x ?? loopContainer.position.x;
    const parentY =
      internalNode?.internals?.positionAbsolute?.y ?? loopContainer.position.y;
    localPosition = {
      x: position.x - parentX,
      y: position.y - parentY,
    };
  }

  return { position: localPosition, parentId };
}
