import { describe, it, expect } from "vitest";
import { ExecutionContext } from "../../src/context/context";
import { evaluateAssign } from "../../src/engine/assign";

describe("evaluateAssign — template edge cases", () => {
  it("returns plain string without ${} as-is", async () => {
    const ctx = new ExecutionContext({});
    const result = await evaluateAssign("hello world", ctx);
    expect(result).toBe("hello world");
  });

  it("evaluates single ${expr} and returns raw value", async () => {
    const ctx = new ExecutionContext({ data: { x: 42 } });
    const result = await evaluateAssign("${data.x}", ctx);
    expect(result).toBe(42);
  });

  it("concatenates mixed text and expressions", async () => {
    const ctx = new ExecutionContext({ data: { name: "Alice" } });
    const result = await evaluateAssign("Hello, ${data.name}! Welcome.", ctx);
    expect(result).toBe("Hello, Alice! Welcome.");
  });

  it("concatenates multiple expressions", async () => {
    const ctx = new ExecutionContext({ a: "foo", b: "bar" });
    const result = await evaluateAssign("${a} and ${b}", ctx);
    expect(result).toBe("foo and bar");
  });

  it("converts null to empty string in template", async () => {
    const ctx = new ExecutionContext({ val: null });
    const result = await evaluateAssign("Value is ${val}", ctx);
    expect(result).toBe("Value is ");
  });

  it("converts undefined to empty string in template", async () => {
    const ctx = new ExecutionContext({});
    const result = await evaluateAssign("Val is ${missing}", ctx);
    expect(result).toBe("Val is ");
  });

  it("evaluates number literals in template", async () => {
    const ctx = new ExecutionContext({});
    const result = await evaluateAssign(42, ctx);
    expect(result).toBe(42);
  });

  it("evaluates boolean literals in template", async () => {
    const ctx = new ExecutionContext({});
    const result = await evaluateAssign(true, ctx);
    expect(result).toBe(true);
    const result2 = await evaluateAssign(false, ctx);
    expect(result2).toBe(false);
  });

  it("evaluates null literal", async () => {
    const ctx = new ExecutionContext({});
    const result = await evaluateAssign(null, ctx);
    expect(result).toBe(null);
  });

  it("evaluates array templates recursively", async () => {
    const ctx = new ExecutionContext({ a: 1, b: 2 });
    const result = await evaluateAssign(["${a}", "static", "${b}"], ctx);
    expect(result).toEqual([1, "static", 2]);
  });

  it("evaluates object templates recursively", async () => {
    const ctx = new ExecutionContext({ name: "test" });
    const result = await evaluateAssign({ key: "${name}", count: 42 }, ctx);
    expect(result).toEqual({ key: "test", count: 42 });
  });

  it("evaluates nested object/array templates", async () => {
    const ctx = new ExecutionContext({ x: 10 });
    const result = await evaluateAssign(
      { items: ["${x}", { nested: "${x}" }] },
      ctx,
    );
    expect(result).toEqual({ items: [10, { nested: 10 }] });
  });

  it("returns undefined as-is when it falls through all type checks", async () => {
    const ctx = new ExecutionContext({});
    // undefined inside an array: recursive call hits the fallback return
    const arrResult = await evaluateAssign([undefined], ctx);
    expect(arrResult).toEqual([undefined]);

    // undefined inside an object: recursive call hits the fallback return
    const objResult = await evaluateAssign({ key: undefined }, ctx);
    expect(objResult).toEqual({ key: undefined });
  });
});
