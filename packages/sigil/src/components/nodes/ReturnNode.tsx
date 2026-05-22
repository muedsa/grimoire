import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { NODE_META } from "@/types/rune";
import { ReturnNode as ReturnNodeType } from "@/store/flow";
import { useNodeState } from "@/hook/useNodeState";
import DebugBadge from "./DebugBadge";
import styles from "./ReturnNode.module.css";

function ReturnNode({ data, selected, id }: NodeProps<ReturnNodeType>) {
  const config = data.config;
  const meta = NODE_META[data.sigilNodeType as keyof typeof NODE_META];
  const { isExecuted, isCurrent, isConnected } = useNodeState(id);
  const returnValue = config.value as string | undefined;

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
      {returnValue && <span className={styles.pillValue}>{returnValue}</span>}
    </div>
  );
}

export default memo(ReturnNode);
