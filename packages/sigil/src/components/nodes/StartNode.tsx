import { memo } from "react";
import { Handle, Position, useStore, NodeProps } from "@xyflow/react";
import type { StartNode } from "@/store/flow";
import styles from "./StartNode.module.css";

/**
 * 主画布开始节点 — 固定存在于画布，作为流程入口。
 * 绿色圆形，显示变量数量 badge。
 */
function StartNode({ selected, id, data }: NodeProps<StartNode>) {
  const edges = useStore((s) => s.edges);
  const hasConnection = edges.some(
    (e) => e.source === id && e.sourceHandle === "out",
  );
  const config = data.config;
  const varCount = Object.keys(config.variables ?? {}).length;

  return (
    <div className={`${styles.node} ${selected ? styles.selected : ""}`}>
      <span className={styles.arrow}>&#9654;</span>
      <span className={styles.label}>开始</span>
      {varCount > 0 && <span className={styles.badge}>{varCount}</span>}

      {/* 出边：底部 — 最多一条连接 */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="out"
        isConnectable={!hasConnection}
      />
    </div>
  );
}

export default memo(StartNode);
