import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { NODE_META } from "@/types/rune";
import { CustomNode as CustomNodeType } from "@/store/flow";
import { templateSummary } from "@/utils/templateSummary";
import { useNodeState } from "@/hook/useNodeState";
import DebugBadge from "./DebugBadge";
import styles from "./CustomNode.module.css";

function CustomNode({ data, selected, id }: NodeProps<CustomNodeType>) {
  const config = data.config;
  const meta = NODE_META[data.sigilNodeType as keyof typeof NODE_META];
  const { isExecuted, isCurrent, isConnected } = useNodeState(id);

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
          {config.name || "custom handler"}
          {!!config.params && `( ${templateSummary(config.params, 20)} )`}
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="out"
        isConnectable={!isConnected("out", "source")}
      />
    </div>
  );
}

export default memo(CustomNode);
