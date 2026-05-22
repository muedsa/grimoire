import { describe, it, expect } from "vitest";
import { ExecutionContext, evaluateExpression } from "../../src/index";

describe("evaluate — typeof builtin", () => {
  it("returns correct type for primitives", async () => {
    const ctx = new ExecutionContext({
      str: "hello",
      num: 42,
      bool: true,
      nil: null,
    });
    expect(await evaluateExpression("typeof(str)", ctx)).toBe("string");
    expect(await evaluateExpression("typeof(num)", ctx)).toBe("number");
    expect(await evaluateExpression("typeof(bool)", ctx)).toBe("boolean");
    expect(await evaluateExpression("typeof(nil)", ctx)).toBe("null");
  });

  it("returns 'array' for arrays", async () => {
    const ctx = new ExecutionContext({ arr: [1, 2, 3], empty: [] });
    expect(await evaluateExpression("typeof(arr)", ctx)).toBe("array");
    expect(await evaluateExpression("typeof(empty)", ctx)).toBe("array");
  });

  it("returns 'object' for objects", async () => {
    const ctx = new ExecutionContext({ obj: { a: 1 }, empty: {} });
    expect(await evaluateExpression("typeof(obj)", ctx)).toBe("object");
    expect(await evaluateExpression("typeof(empty)", ctx)).toBe("object");
  });

  it("returns 'undefined' for missing variables", async () => {
    const ctx = new ExecutionContext({});
    expect(await evaluateExpression("typeof(missing)", ctx)).toBe("undefined");
  });

  it("type() is an alias for typeof()", async () => {
    const ctx = new ExecutionContext({ val: [1, 2] });
    expect(await evaluateExpression("type(val)", ctx)).toBe("array");
  });

  it("type() returns correct types for object and boolean", async () => {
    const ctx = new ExecutionContext({ obj: { a: 1 }, flag: true });
    expect(await evaluateExpression("type(obj)", ctx)).toBe("object");
    expect(await evaluateExpression("type(flag)", ctx)).toBe("boolean");
  });

  it("typeof works in conditions", async () => {
    const ctx = new ExecutionContext({ val: "test", num: 42 });
    expect(await evaluateExpression("typeof(val) == 'string'", ctx)).toBe(true);
    expect(await evaluateExpression("typeof(num) == 'number'", ctx)).toBe(true);
  });
});
