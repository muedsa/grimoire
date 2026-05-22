import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { NODE_META } from "@/types/rune";
import { IfNode as IfNodeType } from "@/store/flow";
import { useNodeState } from "@/hook/useNodeState";
import DebugBadge from "./DebugBadge";
import styles from "./IfNode.module.css";

function IfNode({ data, selected, id }: NodeProps<IfNodeType>) {
  const config = data.config;
  const meta = NODE_META[data.sigilNodeType as keyof typeof NODE_META];
  const { isExecuted, isCurrent, isConnected } = useNodeState(id);
  const hasOutConnection = isConnected("out", "source");

  return (
    <div
      className={`${styles.node} ${selected ? styles.selected : ""} ${isExecuted ? styles.executed : ""} ${isCurrent ? styles.current : ""}`}
    >
      <DebugBadge nodeId={id} />
      <Handle
        type="target"
        position={Position.Top}
        id="in"
        isConnectable={!isConnected("in", "target")}
      />

      <div className={styles.header} style={{ backgroundColor: meta.color }}>
        <meta.icon size={16} />
        <span className={styles.label}>{meta.label}</span>
      </div>

      <div className={styles.body}>
        <span className={styles.preview}>
          {config.condition || "condition"}
        </span>
      </div>

      {/* then 分支 — 左侧出边，文字在节点外左侧 */}
      <Handle
        type="source"
        position={Position.Left}
        id="then"
        className={styles.handleThen}
        style={{ top: "70%" }}
        isConnectable={!isConnected("then", "source")}
      />
      <div
        className={`${styles.handleLabel} ${styles.handleLabelThen}`}
        style={{ top: "64%", right: "calc(100% + 4px)" }}
      >
        then
      </div>

      {/* else 分支 — 右侧出边，文字在节点外右侧 */}
      <Handle
        type="source"
        position={Position.Right}
        id="else"
        className={styles.handleElse}
        style={{ top: "70%" }}
        isConnectable={!isConnected("else", "source")}
      />
      <div
        className={`${styles.handleLabel} ${styles.handleLabelElse}`}
        style={{ top: "64%", left: "calc(100% + 4px)" }}
      >
        else
      </div>

      {/* if 执行完后继续 — 下方出边，文字在节点外下方 */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="out"
        className={styles.handleOut}
        style={{ left: "50%" }}
        isConnectable={!hasOutConnection}
      />
      <div
        className={`${styles.handleLabel} ${styles.handleLabelOut}`}
        style={{ top: "calc(100% + 4px)", left: "46%" }}
      >
        out
      </div>
    </div>
  );
}

export default memo(IfNode);
