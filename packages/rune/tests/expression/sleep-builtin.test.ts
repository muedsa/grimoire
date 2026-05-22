import { describe, it, expect, vi } from "vitest";
import { evaluateExpression, ExecutionContext } from "../../src/index";

describe("sleep", () => {
  it("等待指定毫秒后返回该值", async () => {
    vi.useFakeTimers();
    const ctx = new ExecutionContext({});
    // 不 await 调用，先拿到 Promise，推进假时间后再 await
    const p = evaluateExpression("sleep(500)", ctx);
    await vi.advanceTimersByTimeAsync(500);
    const result = await p;
    expect(result).toBe(500);
    vi.useRealTimers();
  });

  it("负数返回 null", async () => {
    const ctx = new ExecutionContext({});
    const result = await evaluateExpression("sleep(-1)", ctx);
    expect(result).toBeNull();
  });

  it("非数字返回 null", async () => {
    const ctx = new ExecutionContext({});
    const result = await evaluateExpression("sleep('abc')", ctx);
    expect(result).toBeNull();
  });

  it("无参数返回 null", async () => {
    const ctx = new ExecutionContext({});
    const result = await evaluateExpression("sleep()", ctx);
    expect(result).toBeNull();
  });
});
