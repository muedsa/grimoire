import {
  RuleEngine,
  RuleDefinition,
  ExecuteResult,
  ExecutionContext,
  DebugStepController,
} from "@grimoire/rune";
import type {
  StepContext,
  LoopFrame,
  ConditionCheckInfo,
} from "@grimoire/rune";
import { describeNode } from "./nodeDescription";
import { useDebugStore } from "@/store/debug";

export type DebuggerState = "idle" | "running" | "paused" | "finished";

export interface ExecutionLogEntry {
  index: number;
  nodeType: string;
  description: string;
  snapshotBefore: Record<string, unknown>;
  snapshotAfter: Record<string, unknown>;
  /** 层级路径，如 [0, 1] 表示外层第 0 次迭代的第 1 步 */
  path: number[];
  /** 条件求值结果（while/if 节点的条件日志条目才有值） */
  conditionResult?: boolean;
}

/** 根据 loopStack 和 stepCount 生成日志层级路径 */
function buildLogPath(loopStack: LoopFrame[], stepCount: number): number[] {
  const path = loopStack.map((f) => f.index);
  path.push(stepCount);
  return path;
}

/** 根据 nodeId 和 loopStack 生成执行路径键，如 "node3:0:2" */
function buildPathKey(nodeId: string, loopStack: LoopFrame[]): string {
  const segments = loopStack.map((f) => String(f.index));
  return [nodeId, ...segments].join(":");
}

/** 比较两个 loopStack，返回第一个 index 发生变化的深度（-1 表示相同） */
function findDivergentDepth(prev: LoopFrame[], curr: LoopFrame[]): number {
  const maxLen = Math.max(prev.length, curr.length);
  for (let d = 0; d < maxLen; d++) {
    if (!prev[d] || !curr[d]) return d;
    if (prev[d].index !== curr[d].index) return d;
  }
  return -1;
}

/** 从 executedNodeIds 中移除深度 >= depth 的路径条目 */
function clearDeepPaths(
  executedNodeIds: Set<string>,
  depth: number,
): Set<string> {
  const result = new Set<string>();
  for (const key of executedNodeIds) {
    const parts = key.split(":");
    const keyDepth = parts.length - 2;
    if (keyDepth < depth) {
      result.add(key);
    }
  }
  return result;
}

export class FlowDebugger {
  private state: DebuggerState = "idle";
  private allLogs: ExecutionLogEntry[] = [];
  private finalResult: ExecuteResult | null = null;
  private engine: RuleEngine;
  public stepController: DebugStepController | null = null;
  private executedCount = 0;
  private prevLoopStack: LoopFrame[] = [];
  /** 当前迭代内步数计数器，每次迭代切换时重置 */
  private stepInIteration = 0;
  /** 最近一次 if 条件求值结果（用于增强 if 节点描述） */
  private lastIfConditionResult: boolean | undefined;

  constructor(engine: RuleEngine) {
    this.engine = engine;
  }

  getState(): DebuggerState {
    return this.state;
  }
  getLogs(): ExecutionLogEntry[] {
    return [...this.allLogs];
  }
  getExecutedCount(): number {
    return this.executedCount;
  }
  getFinalResult(): ExecuteResult | null {
    return this.finalResult;
  }

  reset(): void {
    this.state = "idle";
    this.allLogs = [];
    this.finalResult = null;
    this.executedCount = 0;
    this.stepController = null;
    this.prevLoopStack = [];
    this.stepInIteration = 0;
    this.lastIfConditionResult = undefined;
  }

  /** 启动步进模式 */
  startStepping(): void {
    this.stepController = new DebugStepController();
  }

  /**
   * 执行带步进控制的规则。
   * 在 beforeStep 暂停时，通过 onPause 回调通知 UI 更新。
   */
  async executeWithStepping(rule: RuleDefinition): Promise<void> {
    if (!this.stepController)
      throw new Error("DebugStepController not initialized");

    console.log(
      '[executeWithStepping] 开始, stepController.mode 应="stepping"',
    );

    this.state = "running";
    this.executedCount = 0;
    this.allLogs = [];
    this.prevLoopStack = [];
    this.stepInIteration = 0;

    // 设置 onPause 回调 — 引擎暂停时更新状态
    this.stepController.onPause = (ctx: StepContext) => {
      if (!ctx.node) {
        console.error("[onPause] ctx.node 是 undefined!");
        return;
      }
      console.log(
        "[onPause] 节点类型:",
        ctx.node.type,
        "label:",
        ctx.node.label,
        "loopStack:",
        JSON.stringify(ctx.loopStack),
      );
      const nodeId = ctx.node.label ?? null;
      const pathKey = nodeId ? buildPathKey(nodeId, ctx.loopStack) : "";

      // 迭代切换检测：找到第一个 index 变化的层级深度
      const divergentDepth = findDivergentDepth(
        this.prevLoopStack,
        ctx.loopStack,
      );
      let executedNodeIds = useDebugStore.getState().executedNodeIds;
      if (divergentDepth >= 0) {
        executedNodeIds = clearDeepPaths(executedNodeIds, divergentDepth);
        this.stepInIteration = 0;
      }

      this.prevLoopStack = ctx.loopStack.map((f) => ({ ...f }));

      useDebugStore.setState({
        currentNodeId: nodeId,
        currentLoopStack: ctx.loopStack,
        executionPath: pathKey,
        executedNodeIds,
        debuggerState: "paused",
        currentStep: this.executedCount + 1,
        logs: this.getLogs(),
      });
    };

    // 设置 onAfterStep 回调 — 节点执行完成后记录日志
    this.stepController.onAfterStep = (ctx, execCtx) => {
      if (!ctx.node) {
        console.error(
          "[onAfterStep] ctx.node 是 undefined! executedCount:",
          this.executedCount,
        );
        return;
      }
      console.log(
        "[onAfterStep] 节点类型:",
        ctx.node.type,
        "label:",
        ctx.node.label,
        "已执行计数:",
        this.executedCount,
      );
      this.recordStep(ctx, execCtx);
      this.executedCount++;
      this.stepInIteration++;

      // 当前节点已执行，加入 executedNodeIds
      const nodeId = ctx.node.label;
      if (nodeId) {
        const pathKey = buildPathKey(nodeId, ctx.loopStack);
        const current = useDebugStore.getState().executedNodeIds;
        const next = new Set(current);
        next.add(pathKey);
        useDebugStore.setState({ executedNodeIds: next });
      }
    };

    // 设置 onConditionCheck 回调 — 条件检查事件（暂停UI + 记录日志）
    this.stepController.onConditionCheck = (info) => {
      if (info.phase === "before") {
        // 暂停前：更新 UI 状态，标记当前在等待条件求值
        const nodeId = info.nodeId ?? null;
        const pathKey = nodeId ? buildPathKey(nodeId, info.loopStack) : "";
        useDebugStore.setState({
          debuggerState: "paused",
          currentStep: this.executedCount,
          logs: this.getLogs(),
          currentNodeId: nodeId,
          currentLoopStack: info.loopStack,
          executionPath: pathKey,
          pendingCondition: {
            type: info.type,
            condition: info.condition,
            iterationIndex: info.iterationIndex,
          },
        });
      } else {
        // 求值后：记录条件日志
        this.recordCondition(info);
        this.executedCount++;
        // 清除 pending 状态
        useDebugStore.setState({
          pendingCondition: null,
          logs: this.getLogs(),
          currentStep: this.executedCount,
        });
      }
    };

    try {
      console.log("[executeWithStepping] 即将调用 engine.execute...");
      const result = await this.engine.execute(rule, {
        stepController: this.stepController,
      });
      console.log(
        "[executeWithStepping] engine.execute 返回, status:",
        result.status,
        "executedCount:",
        this.executedCount,
        "logs数:",
        this.allLogs.length,
      );
      if (result.status === "failed") {
        console.error(
          "[executeWithStepping] 失败详情 message:",
          result.error?.message,
          result.error?.cause,
        );
        console.error(
          "[executeWithStepping] 失败详情 code:",
          result.error?.code,
        );
        console.error(
          "[executeWithStepping] 完整 error:",
          JSON.stringify(result.error),
        );
      }

      this.finalResult = result;
      this.state = "finished";

      // 运行结束后输出完整的引擎上下文环境
      console.log(
        "[executeWithStepping] 最终上下文环境:",
        JSON.stringify(result.data, null, 2),
      );

      useDebugStore.setState({
        finalResult: result,
        debuggerState: "finished",
        currentStep: this.executedCount,
        logs: this.getLogs(),
      });
    } catch (e) {
      console.error("[executeWithStepping] 捕获错误:", e);
      this.state = "idle";
      useDebugStore.setState({ debuggerState: "idle" });
    }
  }

  /** 继续运行直到结束 */
  runToCompletion(): void {
    this.stepController?.runToCompletion();
    this.state = "running";
  }

  /** 中止 */
  abort(): void {
    this.stepController?.abort();
    this.state = "idle";
  }

  private recordStep(ctx: StepContext, execCtx: ExecutionContext): void {
    const snapshotBefore =
      this.allLogs.length > 0
        ? { ...this.allLogs[this.allLogs.length - 1].snapshotAfter }
        : {};
    const snapshotAfter = execCtx.toJSON();

    // if 节点使用 lastIfConditionResult 增强描述
    let conditionResult: boolean | undefined;
    if (ctx.node.type === "if") {
      conditionResult = this.lastIfConditionResult;
      this.lastIfConditionResult = undefined; // 用后即清
    }

    const description = describeNode(ctx.node, conditionResult);
    const path = buildLogPath(ctx.loopStack, this.stepInIteration);

    this.allLogs.push({
      index: this.allLogs.length + 1,
      nodeType: ctx.node.type,
      description,
      snapshotBefore,
      snapshotAfter,
      path,
    });
  }

  /**
   * 记录条件检查日志 — while 的每次判断、foreach 的迭代开始。
   * 注意：if 的条件结果通过 lastIfConditionResult 增强 if 节点自身描述，不创建独立条目。
   */
  private recordCondition(info: ConditionCheckInfo): void {
    // if 节点不创建独立条件条目，只存储结果用于增强 if 节点描述
    if (info.type === "if") {
      this.lastIfConditionResult = info.result;
      return;
    }

    const snapshotBefore =
      this.allLogs.length > 0
        ? { ...this.allLogs[this.allLogs.length - 1].snapshotAfter }
        : {};

    let description: string;
    if (info.type === "while") {
      description = `while 条件 ${info.condition} 为 ${info.result}`;
    } else {
      // foreach 迭代信息
      const idx = (info.iterationIndex ?? 0) + 1;
      description = `foreach 遍历 ${info.condition}, 第 ${idx} 项`;
    }

    const path = buildLogPath(info.loopStack, this.stepInIteration);

    this.allLogs.push({
      index: this.allLogs.length + 1,
      nodeType: info.type === "while" ? "while-check" : "foreach-iter",
      description,
      snapshotBefore,
      snapshotAfter: {}, // 条件检查不改变上下文
      path,
      conditionResult: info.result,
    });
  }
}
