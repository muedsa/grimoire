import { useState, useMemo } from "react";
import { useDebugStore } from "@/store/debug";
import type { ExecutionLogEntry } from "@/utils/debugger";
import styles from "./LogPanel.module.css";

/** 将 path 数组格式化为 "1.2.3" */
function formatPath(path: number[]): string {
  return path.map((n) => String(n + 1)).join(".");
}

/** 日志组 — 按顶层迭代分组 */
interface LogGroup {
  indent: number;
  pathStr: string;
  entry: ExecutionLogEntry;
}

/** 将日志列表分组并计算缩进 */
function groupLogs(logs: ExecutionLogEntry[]): LogGroup[] {
  return logs.map((entry) => ({
    indent: Math.max(0, entry.path.length - 1),
    pathStr: formatPath(entry.path),
    entry,
  }));
}

export default function LogPanel() {
  const isOpenLogPanel = useDebugStore((s) => s.isOpenLogPanel);
  const toggleLogPanel = useDebugStore((s) => s.toggleLogPanel);
  const logs = useDebugStore((s) => s.logs);
  const finalResult = useDebugStore((s) => s.finalResult);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const groups = useMemo(() => groupLogs(logs), [logs]);

  // 切换栏 — 始终在 drawer 外部固定位置
  const toggleBar = (
    <div className={styles.toggleBar} onClick={toggleLogPanel}>
      {isOpenLogPanel ? "隐藏日志" : "调试日志"}
    </div>
  );

  return (
    <>
      {/* 切换栏始终固定在底部右侧，独立于 drawer */}
      {!isOpenLogPanel && <div className={styles.toggleHide}>{toggleBar}</div>}

      {isOpenLogPanel && (
        <div className={styles.drawer}>
          <div className={styles.toggleOpen}>
            <div className={styles.togglePlaceholder}></div>
            {toggleBar}
          </div>
          <div className={styles.panel}>
            <div className={styles.header}>
              <h3 className={styles.title}>执行日志 ({logs.length} 步)</h3>
            </div>
            <div className={styles.list}>
              {groups.map((group, i) => (
                <div
                  key={i}
                  className={`${styles.logEntry} ${expandedIndex === i ? styles.expanded : ""}`}
                  onClick={() =>
                    setExpandedIndex(expandedIndex === i ? null : i)
                  }
                >
                  <div className={styles.logHeader}>
                    <span className={styles.logIndex}>[{group.pathStr}]</span>
                    <span style={{ marginLeft: group.indent * 12 }}>
                      <span className={styles.logType}>
                        {group.entry.nodeType}
                      </span>
                    </span>
                    <span className={styles.logDesc}>
                      {group.entry.description}
                    </span>
                  </div>
                  {expandedIndex === i && (
                    <div className={styles.logDetail}>
                      <div className={styles.snapshotSection}>
                        <h4>执行前</h4>
                        <pre>
                          {JSON.stringify(group.entry.snapshotBefore, null, 2)}
                        </pre>
                      </div>
                      <div className={styles.snapshotSection}>
                        <h4>执行后</h4>
                        <pre>
                          {JSON.stringify(group.entry.snapshotAfter, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {finalResult && (
                <div
                  className={`${styles.result} ${finalResult.status === "success" ? styles.success : styles.error}`}
                >
                  {finalResult.status === "success"
                    ? `成功: ${JSON.stringify(finalResult.data)}`
                    : `失败: ${finalResult.error?.message}`}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
