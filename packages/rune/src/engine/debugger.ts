import { RuleNode } from "../types/rule";
import { ExecutionContext } from "../context/context";
import { ExecuteResult } from "../types/node";

/** 单层循环帧 — 描述当前所在的一层循环 */
export interface LoopFrame {
  type: "foreach" | "while";
  index: number; // 0-based 迭代索引
  itemKey?: string; // foreach 专用：当前 item 变量名
  total?: number; // foreach 专用：集合总长度（while 无）
}

/** 步进上下文 — 替换原来单独传 node 的方式 */
export interface StepContext {
  node: RuleNode;
  loopStack: LoopFrame[]; // 从外到内的循环帧栈，空数组表示不在循环内
}

/** 条件检查信息 — 在 while/if/foreach 的条件判断时传递 */
export interface ConditionCheckInfo {
  type: "while" | "if" | "foreach";
  condition: string; // 条件表达式原文，如 "x < 3"
  result: boolean; // 条件求值结果（before 阶段为占位值）
  loopStack: LoopFrame[]; // 当前循环栈快照
  iterationIndex?: number; // while/foreach 特有：当前迭代次数
  phase: "before" | "after"; // before=暂停前通知UI, after=求值后记录日志
  /** 所在节点的 label（用于调试态高亮对应节点） */
  nodeId?: string;
}

/**
 * 调试步进控制器 — 用于在节点执行前暂停引擎，等待外部指令继续。
 *
 * 工作模式：
 * - stepping: 每执行一个节点前暂停，等待 resume()
 * - running: 不暂停，连续执行
 */
export class DebugStepController {
  private mode: "stepping" | "running" = "stepping";
  private resolveWait: (() => void) | null = null;
  private rejectWait: ((err: Error) => void) | null = null;
  private lastResult: ExecuteResult | null = null;

  /** 暂停时的回调，通知外部"引擎已暂停在某个节点前"。 */
  onPause?: (context: StepContext) => void;

  /** 节点执行完成后的回调，用于记录日志。 */
  onAfterStep?: (
    context: StepContext,
    ctx: ExecutionContext,
    prevResult: ExecuteResult | null,
  ) => void;

  /** 条件检查事件回调 — before 阶段暂停UI，after 阶段记录日志。 */
  onConditionCheck?: (info: ConditionCheckInfo) => void;

  /**
   * 在节点执行前调用。
   * 如果处于 stepping 模式，返回一个 Promise，直到 step() / runToCompletion() / abort() 才 resolve。
   * 如果处于 running 模式，立即返回 true。
   *
   * @returns true 表示可以继续执行，false 表示被中止
   */
  async beforeStep(context: StepContext): Promise<boolean> {
    if (this.mode === "running") return true;

    this.onPause?.(context);

    return new Promise<boolean>((resolve, reject) => {
      this.resolveWait = () => resolve(true);
      this.rejectWait = () => reject(new Error("Debug session aborted"));
    })
      .catch(() => false)
      .finally(() => {
        this.resolveWait = null;
        this.rejectWait = null;
      });
  }

  /** 节点执行完成后调用，触发 onAfterStep 回调。 */
  afterStep(
    context: StepContext,
    ctx: ExecutionContext,
    result: ExecuteResult,
  ): void {
    this.lastResult = result;
    this.onAfterStep?.(context, ctx, result);
  }

  /** 获取上一次执行的结果。 */
  getLastResult(): ExecuteResult | null {
    return this.lastResult;
  }

  /**
   * 条件判断前暂停 — 与 beforeStep 共享 pause 机制。
   * 在 while 循环每次条件求值前调用，允许用户单步观察条件判断过程。
   */
  async beforeConditionCheck(info: ConditionCheckInfo): Promise<boolean> {
    // 先通知 UI（phase 为 before，表示即将检查条件）
    this.onConditionCheck?.({ ...info, phase: "before" });
    if (this.mode === "running") return true;
    // 与 beforeStep 相同的暂停 Promise 机制
    return new Promise<boolean>((resolve, reject) => {
      this.resolveWait = () => resolve(true);
      this.rejectWait = () => reject(new Error("Debug session aborted"));
    })
      .catch(() => false)
      .finally(() => {
        this.resolveWait = null;
        this.rejectWait = null;
      });
  }

  /** 执行下一步（暂停 → 恢复执行一个节点） */
  step(): void {
    this.resolveWait?.();
  }

  /** 继续运行直到结束（恢复执行，不再暂停） */
  runToCompletion(): void {
    this.mode = "running";
    this.resolveWait?.();
  }

  /** 中止调试会话 */
  abort(): void {
    this.mode = "running";
    this.rejectWait?.(new Error("Debug session aborted"));
  }
}
