import { useStore } from "@xyflow/react";
import { useDebugStore } from "@/store/debug";

/** 共享 hook：获取连线状态和执行状态（路径感知） */
export function useNodeState(nodeId: string) {
  const edges = useStore((s) => s.edges);
  const executedNodeIds = useDebugStore((s) => s.executedNodeIds);
  const currentNodeId = useDebugStore((s) => s.currentNodeId);

  // 路径感知匹配：executedNodeIds 中的路径键以 "nodeId:" 开头即匹配
  const isExecuted = Array.from(executedNodeIds).some((key) =>
    key.startsWith(nodeId + ":"),
  );
  const isCurrent = currentNodeId === nodeId;

  const isConnected = (handleId: string, type: "source" | "target") =>
    edges.some(
      (e) =>
        (e.source === nodeId &&
          e.sourceHandle === handleId &&
          type === "source") ||
        (e.target === nodeId &&
          e.targetHandle === handleId &&
          type === "target"),
    );

  return { isExecuted, isCurrent, isConnected };
}
