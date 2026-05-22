import { useCallback, useEffect, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  useNodesInitialized,
  ReactFlowProvider,
  Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useFlowStore } from "@/store/flow";
import { nodeTypes } from "./nodes/node-types";
import { isValidConnection } from "./canvas/connection-rules";
import { handleDrop } from "./canvas/drop-handler";
import type { NodeType } from "@/types/rune";

function FlowCanvasInner() {
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const onNodesChange = useFlowStore((s) => s.onNodesChange);
  const onEdgesChange = useFlowStore((s) => s.onEdgesChange);
  const storeOnConnect = useFlowStore((s) => s.onConnect);
  const setSelectedNode = useFlowStore((s) => s.setSelectedNode);
  const addNodeType = useFlowStore((s) => s.addNodeType);
  const deleteSelectedNode = useFlowStore((s) => s.deleteSelectedNode);
  const onNodesInitializedChange = useFlowStore(
    (s) => s.onNodesInitializedChange,
  );

  const nodesInitialized = useNodesInitialized();

  const { screenToFlowPosition, getNodes, getInternalNode } = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  /** 包装 store 的 onConnect，添加验证 */
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!isValidConnection(connection, nodes, edges)) return;
      storeOnConnect(connection);
    },
    [nodes, edges, storeOnConnect],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const mouseOffsetOnElementData = event.dataTransfer.getData(
        "application/mouseOffsetOnElement",
      );
      const mouseOffsetOnElementArr = mouseOffsetOnElementData.split(",");
      const mouseOffsetArrOnElement = {
        x: parseInt(mouseOffsetOnElementArr[0]),
        y: parseInt(mouseOffsetOnElementArr[1]),
      };

      const type = event.dataTransfer.getData(
        "application/nodeType",
      ) as NodeType;
      if (!type || !reactFlowWrapper.current) return;

      const { position, parentId } = handleDrop(
        {
          x: event.clientX - mouseOffsetArrOnElement.x,
          y: event.clientY - mouseOffsetArrOnElement.y,
        },
        screenToFlowPosition,
        getNodes,
        getInternalNode,
      );
      addNodeType(type, position, parentId);
    },
    [addNodeType, screenToFlowPosition, getNodes, getInternalNode],
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode],
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  // 键盘事件：Delete 键删除选中节点
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Delete") {
        deleteSelectedNode();
      }
    },
    [deleteSelectedNode],
  );

  useEffect(() => {
    onNodesInitializedChange(nodesInitialized);
  }, [nodesInitialized, onNodesInitializedChange]);

  return (
    <div ref={reactFlowWrapper} style={{ width: "100%", height: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onKeyDown={onKeyDown}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        fitView
        // 子节点可自由移动，但被限制在父容器内
        nodeDragThreshold={1}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}

export default function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner />
    </ReactFlowProvider>
  );
}
