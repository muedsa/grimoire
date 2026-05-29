import { describe, it, expect } from "vitest";
import { ExecutionContext, evaluateExpression } from "../../src/index";

describe("evaluate — math builtins", () => {
  it("math_min returns minimum value", async () => {
    const ctx = new ExecutionContext({ a: 3, b: 7, c: 1 });
    expect(await evaluateExpression("math_min(a, b, c)", ctx)).toBe(1);
    expect(await evaluateExpression("math_min(10, 20)", ctx)).toBe(10);
  });

  it("math_max returns maximum value", async () => {
    const ctx = new ExecutionContext({ a: 3, b: 7, c: 1 });
    expect(await evaluateExpression("math_max(a, b, c)", ctx)).toBe(7);
  });

  it("math_abs returns absolute value", async () => {
    const ctx = new ExecutionContext({ n: -5 });
    expect(await evaluateExpression("math_abs(n)", ctx)).toBe(5);
    expect(await evaluateExpression("math_abs(3.14)", ctx)).toBe(3.14);
  });

  it("math_round, math_floor, math_ceil work correctly", async () => {
    const ctx = new ExecutionContext({ n: 3.7 });
    expect(await evaluateExpression("math_round(n)", ctx)).toBe(4);
    expect(await evaluateExpression("math_floor(n)", ctx)).toBe(3);
    expect(await evaluateExpression("math_ceil(n)", ctx)).toBe(4);
  });

  it("math_pow raises base to exponent", async () => {
    const ctx = new ExecutionContext({});
    expect(await evaluateExpression("math_pow(2, 10)", ctx)).toBe(1024);
    expect(await evaluateExpression("math_pow(3, 2)", ctx)).toBe(9);
  });

  it("math_sqrt returns square root", async () => {
    const ctx = new ExecutionContext({ n: 144 });
    expect(await evaluateExpression("math_sqrt(n)", ctx)).toBe(12);
  });

  it("math_sum sums all arguments", async () => {
    const ctx = new ExecutionContext({ a: 1, b: 2, c: 3 });
    expect(await evaluateExpression("math_sum(a, b, c)", ctx)).toBe(6);
    expect(await evaluateExpression("math_sum(10, 20, 30)", ctx)).toBe(60);
  });

  it("math_avg computes average", async () => {
    const ctx = new ExecutionContext({ a: 10, b: 20, c: 30 });
    expect(await evaluateExpression("math_avg(a, b, c)", ctx)).toBe(20);
  });

  it("math functions work with expressions as arguments", async () => {
    const ctx = new ExecutionContext({ scores: [85, 90, 78] });
    expect(
      await evaluateExpression("math_max(scores.0, scores.1, scores.2)", ctx),
    ).toBe(90);
    expect(
      await evaluateExpression("math_min(scores.0, scores.1, scores.2)", ctx),
    ).toBe(78);
  });

  it("math_min 空参数返回 Infinity，math_max 空参数返回 -Infinity", async () => {
    const ctx = new ExecutionContext({});
    expect(await evaluateExpression("math_min()", ctx)).toBe(Infinity);
    expect(await evaluateExpression("math_max()", ctx)).toBe(-Infinity);
  });

  it("math 函数非法输入返回 NaN", async () => {
    const ctx = new ExecutionContext({ bad: "abc" });
    expect(await evaluateExpression("math_abs(bad)", ctx)).toBeNaN();
    expect(await evaluateExpression("math_round(bad)", ctx)).toBeNaN();
    expect(await evaluateExpression("math_pow(bad, 2)", ctx)).toBeNaN();
    expect(await evaluateExpression("math_sqrt(bad)", ctx)).toBeNaN();
    expect(await evaluateExpression("math_sqrt(-1)", ctx)).toBeNaN();
  });
});
