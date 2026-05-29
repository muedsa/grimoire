import { describe, it, expect } from "vitest";
import {
  BinaryOpNode,
  evaluate,
  evaluateExpression,
  ExecutionContext,
  LiteralNode,
  UnaryOpNode,
} from "../../src/index";

describe("evaluate — builtin edge cases", () => {
  it("len returns 0 for number", async () => {
    const ctx = new ExecutionContext({ val: 42 });
    expect(await evaluateExpression("len(val)", ctx)).toBe(0);
  });

  it("len returns 0 for boolean", async () => {
    const ctx = new ExecutionContext({ val: true });
    expect(await evaluateExpression("len(val)", ctx)).toBe(0);
  });

  it("empty returns false for non-empty number", async () => {
    const ctx = new ExecutionContext({ val: 42 });
    expect(await evaluateExpression("empty(val)", ctx)).toBe(false);
  });

  it("empty returns false for boolean", async () => {
    const ctx = new ExecutionContext({ val: true });
    expect(await evaluateExpression("empty(val)", ctx)).toBe(false);
  });
});

describe("evaluate — error scenarios", () => {
  it("throws on unknown binary operator", async () => {
    const node: BinaryOpNode = {
      kind: "binary",
      operator: "^" as any,
      left: { kind: "literal", value: 1 } as LiteralNode,
      right: { kind: "literal", value: 2 } as LiteralNode,
    };
    await expect(evaluate(node, new ExecutionContext({}))).rejects.toThrow(
      "Unknown binary operator",
    );
  });

  it("throws on unknown unary operator", async () => {
    const node: UnaryOpNode = {
      kind: "unary",
      operator: "~" as any,
      argument: { kind: "literal", value: 1 } as LiteralNode,
    };
    await expect(evaluate(node, new ExecutionContext({}))).rejects.toThrow(
      "Unknown unary operator",
    );
  });

  it("throws on unknown AST node kind", async () => {
    await expect(
      evaluate({ kind: "unknown" } as any, new ExecutionContext({})),
    ).rejects.toThrow("Unknown AST node kind");
  });

  it("throws on empty function name in call", async () => {
    const node = {
      kind: "call",
      target: { kind: "path", segments: [""] },
      args: [],
    };
    await expect(
      evaluate(node as any, new ExecutionContext({})),
    ).rejects.toThrow("Invalid function name");
  });

  it("evaluates bracket node directly", async () => {
    const node = {
      kind: "bracket",
      expr: { kind: "literal", value: 0 },
    };
    const ctx = new ExecutionContext({});
    const result = await evaluate(node as any, ctx);
    expect(result).toBe(0);
  });

  it("evaluates bracket node with nested expression", async () => {
    const node = {
      kind: "bracket",
      expr: {
        kind: "binary",
        operator: "+",
        left: { kind: "literal", value: 2 },
        right: { kind: "literal", value: 3 },
      },
    };
    const ctx = new ExecutionContext({});
    const result = await evaluate(node as any, ctx);
    expect(result).toBe(5);
  });

  it("throw_err 抛出 EngineError（带自定义 code 和 message）", async () => {
    const node = {
      kind: "call",
      target: { kind: "path", segments: ["throw_err"] },
      args: [
        { kind: "literal", value: "VALIDATION_FAILED" },
        { kind: "literal", value: "x must be > 0" },
      ],
    };
    const ctx = new ExecutionContext({});
    await expect(evaluate(node as any, ctx)).rejects.toThrow("x must be > 0");
    try {
      await evaluate(node as any, ctx);
    } catch (err: any) {
      expect(err.code).toBe("VALIDATION_FAILED");
      expect(err.message).toBe("x must be > 0");
    }
  });

  it("throw_err — 非字符串 message 默认为空字符串", async () => {
    const node = {
      kind: "call",
      target: { kind: "path", segments: ["throw_err"] },
      args: [
        { kind: "literal", value: "TEST_ERROR" },
        { kind: "literal", value: 123 },
      ],
    };
    const ctx = new ExecutionContext({});
    await expect(evaluate(node as any, ctx)).rejects.toThrow();
    try {
      await evaluate(node as any, ctx);
    } catch (err: any) {
      expect(err.code).toBe("TEST_ERROR");
      expect(err.message).toBe("");
    }
  });

  it("throw_err — 非字符串 code 默认使用 EXECUTE_ERROR", async () => {
    const node = {
      kind: "call",
      target: { kind: "path", segments: ["throw_err"] },
      args: [
        { kind: "literal", value: null },
        { kind: "literal", value: "something wrong" },
      ],
    };
    const ctx = new ExecutionContext({});
    await expect(evaluate(node as any, ctx)).rejects.toThrow("something wrong");
    try {
      await evaluate(node as any, ctx);
    } catch (err: any) {
      expect(err.code).toBe("EXECUTE_ERROR");
    }
  });

  it("throw_err — 通过 evaluateExpression 表达式调用", async () => {
    const ctx = new ExecutionContext({});
    await expect(
      evaluateExpression("throw_err('E001', 'bad input')", ctx),
    ).rejects.toThrow("bad input");
  });
});
