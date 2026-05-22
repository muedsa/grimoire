import { memo } from "react";
import {
  Handle,
  Position,
  NodeProps,
  useStore,
  NodeResizer,
} from "@xyflow/react";
import { WhileNode } from "@/store/flow";
import { useNodeState } from "@/hook/useNodeState";
import DebugBadge from "./DebugBadge";
import { RefreshCw } from "lucide-react";
import styles from "./WhileGroup.module.css";

/**
 * While 容器 — 作为 group node 渲染在子节点下方。
 * 虚线边框 + header 标签，直观标识同一 body 内的节点。
 * 调试态通过 useNodeState 显示执行高亮样式和循环迭代徽章。
 */
function WhileGroup({ data, selected, id }: NodeProps<WhileNode>) {
  const edges = useStore((s) => s.edges);
  const { isExecuted, isCurrent } = useNodeState(id);

  const hasInConnection = edges.some(
    (e) => e.target === id && e.targetHandle === "in",
  );
  const hasOutConnection = edges.some(
    (e) => e.source === id && e.sourceHandle === "out",
  );
  const hasBodyConnection = edges.some(
    (e) => e.source === id && e.sourceHandle === "body",
  );

  const config = data.config as { condition?: string };

  return (
    <div
      className={`${styles.group} ${selected ? styles.selected : ""} ${isExecuted ? styles.executed : ""} ${isCurrent ? styles.current : ""}`}
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "12px",
      }}
    >
      <DebugBadge nodeId={id} />

      {/* 缩放手柄 — 仅在选中时可见 */}
      <NodeResizer isVisible={selected} minWidth={200} minHeight={150} />

      {/* 顶部 header 条 */}
      <div className={styles.header}>
        <RefreshCw size={14} />
        <span className={styles.label}>
          {config.condition ? `While (${config.condition})` : "While"}
        </span>
      </div>

      {/* body 入口标记 — 固定在上方中间，作为 body 节点链的起点 */}
      <Handle
        type="source"
        position={Position.Top}
        id="body"
        isConnectable={!hasBodyConnection}
        className={styles.bodyHandle}
      >
        <span className={styles.bodyLabel}>body</span>
      </Handle>

      {/* 入边：连接到 while 本身 — 最多一条连接 */}
      <Handle
        type="target"
        position={Position.Top}
        id="in"
        isConnectable={!hasInConnection}
      />

      {/* 出边：while 完成后继续 — 最多一条连接 */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="out"
        isConnectable={!hasOutConnection}
      />
    </div>
  );
}

export default memo(WhileGroup);
