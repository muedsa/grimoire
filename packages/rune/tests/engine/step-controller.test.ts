import { describe, it, expect, vi } from "vitest";
import { DebugStepController } from "../../src/engine/debugger";
import type { StepContext, ConditionCheckInfo } from "../../src/engine/debugger";
import type { RuleNode } from "../../src/types/rule";
import { ExecutionContext } from "../../src/context/context";

const mockNode = { type: "set", variable: "x", value: 1 } as RuleNode;
const mockCtx: StepContext = { node: mockNode, loopStack: [] };

const mockConditionInfo: ConditionCheckInfo = {
  type: "while",
  condition: "i < 3",
  result: true,
  loopStack: [],
  phase: "before",
};

describe("DebugStepController", () => {
  describe("stepping mode (default)", () => {
    it("should pause before step and wait for resume", async () => {
      const controller = new DebugStepController();
      const pauseFn = vi.fn();
      controller.onPause = pauseFn;

      // 启动 beforeStep，应该暂停
      const promise = controller.beforeStep(mockCtx);

      // onPause 应该被调用
      expect(pauseFn).toHaveBeenCalledWith(mockCtx);

      // 在 resume 前 Promise 不应 resolve
      // 用微任务检查
      let resolved = false;
      promise.then(() => {
        resolved = true;
      });
      await Promise.resolve();
      expect(resolved).toBe(false);

      // 调用 step() 后应该 resolve
      controller.step();
      const result = await promise;
      expect(result).toBe(true);
    });

    it("should return false when aborted", async () => {
      const controller = new DebugStepController();
      const promise = controller.beforeStep(mockCtx);

      controller.abort();
      const result = await promise;
      expect(result).toBe(false);
    });
  });

  describe("running mode", () => {
    it("should not pause in running mode", async () => {
      const controller = new DebugStepController();
      controller.runToCompletion();

      const pauseFn = vi.fn();
      controller.onPause = pauseFn;

      const result = await controller.beforeStep(mockCtx);
      expect(result).toBe(true);
      expect(pauseFn).not.toHaveBeenCalled();
    });

    it("should switch to running mode via runToCompletion", async () => {
      const controller = new DebugStepController();
      const promise1 = controller.beforeStep(mockCtx);

      // runToCompletion 应该恢复当前等待并切换到 running 模式
      controller.runToCompletion();
      const result1 = await promise1;
      expect(result1).toBe(true);

      // 后续 beforeStep 不应暂停
      const pauseFn = vi.fn();
      controller.onPause = pauseFn;
      const result2 = await controller.beforeStep(mockCtx);
      expect(result2).toBe(true);
      expect(pauseFn).not.toHaveBeenCalled();
    });
  });

  describe("getLastResult", () => {
    it("returns null by default", () => {
      const controller = new DebugStepController();
      expect(controller.getLastResult()).toBe(null);
    });

    it("returns last result after afterStep is called", () => {
      const controller = new DebugStepController();
      const execCtx = new ExecutionContext({});
      const result = { status: "success" as const, data: 42 };

      controller.afterStep(mockCtx, execCtx, result);
      expect(controller.getLastResult()).toBe(result);
    });
  });

  describe("beforeConditionCheck", () => {
    it("returns true immediately in running mode", async () => {
      const controller = new DebugStepController();
      controller.runToCompletion();

      const conditionCheckFn = vi.fn();
      controller.onConditionCheck = conditionCheckFn;

      const result = await controller.beforeConditionCheck(mockConditionInfo);
      expect(result).toBe(true);
      // onConditionCheck 应该被调用（phase 变为 "before"）
      expect(conditionCheckFn).toHaveBeenCalledWith({
        ...mockConditionInfo,
        phase: "before",
      });
    });

    it("pauses in stepping mode and waits for resume", async () => {
      const controller = new DebugStepController();
      const conditionCheckFn = vi.fn();
      controller.onConditionCheck = conditionCheckFn;

      const promise = controller.beforeConditionCheck(mockConditionInfo);
      expect(conditionCheckFn).toHaveBeenCalledWith({
        ...mockConditionInfo,
        phase: "before",
      });

      // 不应立即 resolve
      let resolved = false;
      promise.then(() => { resolved = true; });
      await Promise.resolve();
      expect(resolved).toBe(false);

      controller.step();
      const result = await promise;
      expect(result).toBe(true);
    });

    it("returns false when aborted during condition check", async () => {
      const controller = new DebugStepController();
      const promise = controller.beforeConditionCheck(mockConditionInfo);

      controller.abort();
      const result = await promise;
      expect(result).toBe(false);
    });
  });
});
