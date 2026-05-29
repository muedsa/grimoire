import { describe, it, expect } from "vitest";
import {
  ExecutionContext,
  evaluateExpression,
  RuleEngine,
} from "../../src/index";

describe("evaluateExpression — 自定义函数", () => {
  const customFunctions = {
    double: (n: any) => Number(n) * 2,
    greet: (name: any) => `Hello, ${name}`,
    add: (a: any, b: any) => Number(a) + Number(b),
    sum_all: (...args: any[]) => args.reduce((s, v) => s + Number(v), 0),
    is_positive: (n: any) => Number(n) > 0,
  };

  it("调用自定义函数 — 单参数", async () => {
    const ctx = new ExecutionContext({ x: 5 });
    expect(
      await evaluateExpression("double(x)", ctx, undefined, customFunctions),
    ).toBe(10);
  });

  it("调用自定义函数 — 多参数", async () => {
    const ctx = new ExecutionContext({ a: 3, b: 7 });
    expect(
      await evaluateExpression("add(a, b)", ctx, undefined, customFunctions),
    ).toBe(10);
  });

  it("调用自定义函数 — 不定参数", async () => {
    const ctx = new ExecutionContext({});
    expect(
      await evaluateExpression(
        "sum_all(1, 2, 3, 4)",
        ctx,
        undefined,
        customFunctions,
      ),
    ).toBe(10);
  });

  it("自定义函数在条件表达式中使用", async () => {
    const ctx = new ExecutionContext({ n: 5 });
    expect(
      await evaluateExpression(
        "is_positive(n)",
        ctx,
        undefined,
        customFunctions,
      ),
    ).toBe(true);
    expect(
      await evaluateExpression(
        "is_positive(-3)",
        ctx,
        undefined,
        customFunctions,
      ),
    ).toBe(false);
  });

  it("自定义函数在混合表达式中使用", async () => {
    const ctx = new ExecutionContext({ x: 3, y: 4 });
    // double(x) + double(y) = 6 + 8 = 14
    expect(
      await evaluateExpression(
        "double(x) + double(y)",
        ctx,
        undefined,
        customFunctions,
      ),
    ).toBe(14);
  });

  it("未注册的函数名抛出异常", async () => {
    const ctx = new ExecutionContext({ x: 1 });
    await expect(
      evaluateExpression("unknown_fn(x)", ctx, undefined, customFunctions),
    ).rejects.toThrow("Unknown function: unknown_fn");
  });

  it("未注册的函数名 — 无 customFunctions 时也抛出异常", async () => {
    const ctx = new ExecutionContext({ x: 1 });
    await expect(evaluateExpression("unknown_fn(x)", ctx)).rejects.toThrow(
      "Unknown function: unknown_fn",
    );
  });
});

describe("RuleEngine — 自定义函数", () => {
  it("在 Set 节点值模板中使用自定义函数", async () => {
    const engine = new RuleEngine({
      functions: {
        double: (n: any) => Number(n) * 2,
      },
    });
    const result = await engine.execute({
      variables: { x: 5 },
      nodes: {
        main: [{ type: "set", variable: "result.y", value: "${double(x)}" }],
      },
    });
    expect(result.status).toBe("success");
    expect((result.data as any).result.y).toBe(10);
  });

  it("在 IF 条件中使用自定义函数", async () => {
    const engine = new RuleEngine({
      functions: {
        is_high: (n: any) => Number(n) > 50,
      },
    });
    const result = await engine.execute({
      variables: { score: 80 },
      nodes: {
        main: [
          // 预创建 result 键，确保 IF 分支内的 SET 写入主上下文
          { type: "set", variable: "result.level", value: null },
          {
            type: "if",
            condition: "is_high(score)",
            then: [{ type: "set", variable: "result.level", value: "A" }],
            else: [{ type: "set", variable: "result.level", value: "B" }],
          },
        ],
      },
    });
    expect(result.status).toBe("success");
    expect((result.data as any).result.level).toBe("A");
  });

  it("在 Exec 节点中使用自定义函数", async () => {
    let logValue: any = null;
    const engine = new RuleEngine({
      functions: {
        track: (val: any) => {
          logValue = val;
          return val;
        },
      },
    });
    const result = await engine.execute({
      variables: { data: { name: "test" } },
      nodes: {
        main: [{ type: "exec", expression: "track(data.name)" }],
      },
    });
    expect(result.status).toBe("success");
    expect(logValue).toBe("test");
  });

  it("内置函数优先于同名自定义函数", async () => {
    // len 是内置函数，返回字符串长度
    // 自定义 len 返回 999，但应该被内置函数覆盖
    const engine = new RuleEngine({
      functions: {
        len: (val: any) => 999,
      },
    });
    const result = await engine.execute({
      variables: { s: "hello" },
      nodes: {
        main: [{ type: "set", variable: "result.n", value: "${len(s)}" }],
      },
    });
    expect(result.status).toBe("success");
    // 内置 len 返回 5，自定义 len 被忽略
    expect((result.data as any).result.n).toBe(5);
  });

  it("自定义函数接收多个参数", async () => {
    const engine = new RuleEngine({
      functions: {
        multiply: (a: any, b: any) => Number(a) * Number(b),
      },
    });
    const result = await engine.execute({
      variables: { x: 6, y: 7 },
      nodes: {
        main: [
          { type: "set", variable: "result.p", value: "${multiply(x, y)}" },
        ],
      },
    });
    expect(result.status).toBe("success");
    expect((result.data as any).result.p).toBe(42);
  });
});
