import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { NODE_META } from "@/types/rune";
import { ContinueNode as ContinueNodeType } from "@/store/flow";
import { useNodeState } from "@/hook/useNodeState";
import DebugBadge from "./DebugBadge";
import styles from "./ContinueNode.module.css";

function ContinueNode({ data, selected, id }: NodeProps<ContinueNodeType>) {
  const meta = NODE_META[data.sigilNodeType as "continue"];
  const { isExecuted, isCurrent, isConnected } = useNodeState(id);

  return (
    <div
      className={`${styles.returnPill} ${selected ? styles.selected : ""} ${isExecuted ? styles.executed : ""} ${isCurrent ? styles.current : ""}`}
    >
      <DebugBadge nodeId={id} />
      <Handle
        type="target"
        position={Position.Top}
        id="in"
        isConnectable={!isConnected("in", "target")}
      />
      <meta.icon className={styles.pillIcon} size={14} />
      <span>{meta.label}</span>
    </div>
  );
}

export default memo(ContinueNode);
