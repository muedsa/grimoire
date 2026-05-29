import { create } from "zustand";
import {
  RuleEngine,
  ExecuteResult,
  ErrorCode,
  EngineError,
} from "@grimoire/rune";
import type { LoopFrame } from "@grimoire/rune";
import {
  encodingFunctions,
  cryptoFunctions,
  domFunctions,
} from "@grimoire/talisman";
import {
  FlowDebugger,
  ExecutionLogEntry,
  DebuggerState,
} from "@/utils/debugger";
import { exportToRuleDefinition } from "@/utils/export";
import { ConsoleLogger } from "@/utils/engineLogger";

/** 待检查的条件信息（暂停在 while 条件判断处时） */
export interface PendingCondition {
  type: "while" | "if" | "foreach";
  condition: string;
  iterationIndex?: number;
}

interface DebugStore {
  debuggerState: DebuggerState;
  logs: ExecutionLogEntry[];
  finalResult: ExecuteResult | null;
  executedNodeIds: Set<string>;
  currentNodeId: string | null;
  /** 当前循环上下文栈 */
  currentLoopStack: LoopFrame[];
  /** 当前执行路径键，格式 "nodeId:d0:d1:..." */
  executionPath: string;
  /** 当前已执行步数（已完成的节点数） */
  currentStep: number;
  debugger: FlowDebugger | null;
  /** 当前暂停在条件判断处（while 循环每次条件检查时非 null） */
  pendingCondition: PendingCondition | null;
  isOpenLogPanel: boolean;

  startDebug: () => Promise<void>;
  stepNext: () => void;
  runToCompletion: () => void;
  reset: () => void;
  toggleLogPanel: () => void;
}

export const useDebugStore = create<DebugStore>((set, get) => ({
  debuggerState: "idle",
  logs: [],
  finalResult: null,
  executedNodeIds: new Set<string>(),
  currentNodeId: null,
  currentLoopStack: [],
  executionPath: "",
  currentStep: 0,
  debugger: null,
  pendingCondition: null,
  isOpenLogPanel: false,

  startDebug: async () => {
    set({
      debuggerState: "idle",
      logs: [],
      finalResult: null,
      executedNodeIds: new Set<string>(),
      currentNodeId: null,
      currentLoopStack: [],
      executionPath: "",
      currentStep: 0,
      pendingCondition: null,
      isOpenLogPanel: false,
    });

    const engine = new RuleEngine({
      logger: new ConsoleLogger(),
      functions: {
        ...encodingFunctions,
        ...cryptoFunctions,
        ...domFunctions,
      },
    });
    const dbg = new FlowDebugger(engine);
    set({ debugger: dbg });

    console.log("[startDebug] 开始调试");

    set({ isOpenLogPanel: true });

    // 初始化 stepController 为 stepping 模式
    dbg.startStepping();

    const rule = exportToRuleDefinition();

    const entryKey = rule.entry ?? "main";
    const mainNodes = rule.nodes[entryKey] ?? [];
    const mainLen = mainNodes.length;

    console.log(
      "[startDebug] 规则入口:",
      rule.entry,
      "节点组:",
      Object.keys(rule.nodes),
    );
    console.log("[startDebug] main 节点数:", mainLen);

    if (mainLen === 0) {
      console.error(
        "[startDebug] main 节点组为空！当前流程图可能没有从 START 节点连线到其他节点",
      );
      console.error(
        "[startDebug] 所有节点组:",
        JSON.stringify(Object.keys(rule.nodes)),
      );
      set({
        debuggerState: "idle",
        finalResult: {
          status: "failed",
          error: new EngineError(ErrorCode.NODE_TYPE_ERROR, "main 节点组为空"),
        },
      });
      return;
    }

    console.log("[startDebug] main 首个节点:", JSON.stringify(mainNodes[0]));

    set({
      debuggerState: "running",
      currentNodeId: null,
      currentLoopStack: [],
      executionPath: "",
      executedNodeIds: new Set<string>(),
      logs: [],
      currentStep: 0,
    });

    console.log(
      "[startDebug] 状态已设为 running，即将调用 executeWithStepping...",
    );
    // 启动引擎执行（会在第一个节点前暂停）
    await dbg.executeWithStepping(rule);
    console.log("[startDebug] executeWithStepping 返回，状态:", dbg.getState());
  },

  stepNext: () => {
    const dbg = get().debugger;
    if (!dbg) return;
    dbg.stepController?.step();
    // 状态更新由 onPause / onAfterStep 回调处理
  },

  runToCompletion: () => {
    const dbg = get().debugger;
    if (!dbg) return;
    dbg.runToCompletion();
    set({ debuggerState: "running" });
  },

  reset: () => {
    const dbg = get().debugger;
    dbg?.reset();
    set({
      debuggerState: "idle",
      logs: [],
      finalResult: null,
      executedNodeIds: new Set<string>(),
      currentNodeId: null,
      currentLoopStack: [],
      executionPath: "",
      currentStep: 0,
      pendingCondition: null,
      isOpenLogPanel: false,
    });
  },

  toggleLogPanel: () => {
    set((state) => ({ isOpenLogPanel: !state.isOpenLogPanel }));
  },
}));
