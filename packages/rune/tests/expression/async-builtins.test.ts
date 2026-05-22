import { describe, it, expect } from "vitest";
import { evaluateExpression } from "../../src/expression/evaluator";
import { ExecutionContext } from "../../src/context/context";
import { CustomFunction } from "../../src/expression/evaluator";

describe("evaluate — 异步函数调用", () => {
  it("sync 内置函数正常返回", async () => {
    const ctx = new ExecutionContext({ x: 5, y: 3 });
    const result = await evaluateExpression("math_max(x, y)", ctx);
    expect(result).toBe(5);
  });

  it("async 自定义函数 await 后返回真实值", async () => {
    const ctx = new ExecutionContext({ url: "test" });
    const asyncFn: CustomFunction = async (url: unknown) => {
      return { status: 200, body: `fetched:${url}` };
    };
    const result = await evaluateExpression("myFetch(url)", ctx, undefined, {
      myFetch: asyncFn,
    });
    expect(result).toEqual({ status: 200, body: "fetched:test" });
  });

  it("async 函数在表达式中参与运算", async () => {
    const ctx = new ExecutionContext({});
    const getNum: CustomFunction = async () => 42;
    const result = await evaluateExpression("getNum() + 8", ctx, undefined, {
      getNum,
    });
    expect(result).toBe(50);
  });

  it("async 函数返回 Promise 被正确 await", async () => {
    const ctx = new ExecutionContext({});
    const greet: CustomFunction = async (name: unknown) => `Hello, ${name}`;
    const result = await evaluateExpression("greet('World')", ctx, undefined, {
      greet,
    });
    expect(result).toBe("Hello, World");
  });
});
