import { useDebugStore } from "@/store/debug";
import styles from "./ExecutionControls.module.css";

export default function ExecutionControls() {
  const debuggerState = useDebugStore((s) => s.debuggerState);
  const currentStep = useDebugStore((s) => s.currentStep);
  const startDebug = useDebugStore((s) => s.startDebug);
  const stepNext = useDebugStore((s) => s.stepNext);
  const runToCompletion = useDebugStore((s) => s.runToCompletion);
  const reset = useDebugStore((s) => s.reset);

  return (
    <div className={styles.controls}>
      <div className={styles.buttons}>
        {/* Idle 状态：显示调试按钮 */}
        {debuggerState === "idle" && (
          <button
            className={`${styles.btn} ${styles.debugBtn}`}
            onClick={startDebug}
          >
            调试
          </button>
        )}

        {/* Paused 状态：下一步 + 运行到结束 + 重置 + 步数进度 */}
        {debuggerState === "paused" && (
          <>
            <span className={styles.status}>已执行 {currentStep} 个节点</span>
            <button className={styles.btn} onClick={stepNext}>
              下一步 ▶
            </button>
            <button className={styles.btn} onClick={runToCompletion}>
              运行到结束 ▶▶
            </button>
            <button
              className={`${styles.btn} ${styles.resetBtn}`}
              onClick={reset}
            >
              ■ 重置
            </button>
          </>
        )}

        {/* Running 状态：重置 */}
        {debuggerState === "running" && (
          <>
            <span className={styles.status}>执行中...</span>
            <button
              className={`${styles.btn} ${styles.resetBtn}`}
              onClick={reset}
            >
              ■ 重置
            </button>
          </>
        )}

        {/* Finished 状态：重置 */}
        {debuggerState === "finished" && (
          <>
            <span className={styles.status}>
              执行完成（{currentStep} 个节点）
            </span>
            <button
              className={`${styles.btn} ${styles.resetBtn}`}
              onClick={reset}
            >
              ■ 重置
            </button>
          </>
        )}
      </div>
    </div>
  );
}
