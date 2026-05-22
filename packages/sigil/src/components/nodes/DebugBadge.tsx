import { useDebugStore } from "@/store/debug";
import styles from "./DebugBadge.module.css";

interface DebugBadgeProps {
  nodeId: string;
}

/** 调试徽章 — 在循环内暂停时显示迭代信息 */
export default function DebugBadge({ nodeId }: DebugBadgeProps) {
  const currentNodeId = useDebugStore((s) => s.currentNodeId);
  const currentLoopStack = useDebugStore((s) => s.currentLoopStack);

  if (currentNodeId !== nodeId || currentLoopStack.length === 0) return null;

  // 取最内层循环帧生成文本
  const innermost = currentLoopStack[currentLoopStack.length - 1];
  let text: string;
  if (innermost.type === "foreach" && innermost.total !== undefined) {
    text = `foreach[${innermost.index}/${innermost.total}]`;
  } else if (innermost.type === "foreach") {
    text = `foreach[${innermost.index}]`;
  } else {
    text = `while[${innermost.index}]`;
  }

  // 嵌套循环显示完整路径
  const title =
    currentLoopStack.length > 1
      ? currentLoopStack.map((f) => `Loop[${f.index}]`).join(" > ")
      : undefined;

  return (
    <span className={styles.badge} title={title}>
      {text}
    </span>
  );
}
