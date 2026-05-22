import { describe, it, expect } from "vitest";
import { ExecutionContext } from "../src/context/context";

describe("ExecutionContext — setNestedValue edge cases", () => {
  it("setNestedValue with empty parts does nothing", () => {
    const ctx = new ExecutionContext({ data: {} });
    ctx.set("data", "newValue");
    expect(ctx.get("data")).toBe("newValue");
  });

  it("set array element by index", () => {
    const ctx = new ExecutionContext({ data: { items: ["a", "b", "c"] } });
    ctx.set("data.items.1", "B");
    expect(ctx.get("data.items.1")).toBe("B");
  });

  it("set creates nested array in object", () => {
    const ctx = new ExecutionContext({ data: {} });
    ctx.set("data.items.0", "first");
    expect(ctx.get("data.items.0")).toBe("first");
  });

  it("set creates nested object in array", () => {
    const ctx = new ExecutionContext({ data: { items: [] } });
    ctx.set("data.items.0.name", "Alice");
    expect(ctx.get("data.items.0.name")).toBe("Alice");
  });

  it("set overwrites null value with nested structure", () => {
    const ctx = new ExecutionContext({ data: { nested: null } });
    ctx.set("data.nested.a.b", 42);
    expect(ctx.get("data.nested.a.b")).toBe(42);
  });

  it("set overwrites undefined with nested array", () => {
    const ctx = new ExecutionContext({ data: {} });
    ctx.set("data.matrix.0.1", 99);
    expect(ctx.get("data.matrix.0.1")).toBe(99);
  });
});

describe("ExecutionContext — findTargetContext", () => {
  it("creates root key in current scope when parent doesn't have it", () => {
    const parent = new ExecutionContext({});
    const child = parent.fork();
    child.set("newKey", "value");
    expect(child.get("newKey")).toBe("value");
    expect(parent.get("newKey")).toBe(undefined);
  });

  it("writes to parent scope when root key exists there", () => {
    const parent = new ExecutionContext({ data: { x: 1 } });
    const child = parent.fork();
    child.set("data.x", 999);
    expect(parent.get("data.x")).toBe(999);
  });

  it("deeply nested findTargetContext", () => {
    const grandparent = new ExecutionContext({ root: { level: "gp" } });
    const parent = grandparent.fork();
    const child = parent.fork();
    child.set("root.level", "child");
    expect(grandparent.get("root.level")).toBe("child");
    expect(parent.get("root.level")).toBe("child");
  });
});

describe("ExecutionContext — setNestedValue invalid targets", () => {
  it("set on array with negative index does nothing", () => {
    const ctx = new ExecutionContext({ data: { items: ["a", "b"] } });
    ctx.set("data.items.-1", "shouldNotApply");
    // 数组索引 -1 无效，不会修改数组
    expect(ctx.get("data.items.-1")).toBe(undefined);
    expect(ctx.get("data.items.0")).toBe("a");
  });

  it("set on non-object value does nothing", () => {
    const ctx = new ExecutionContext({ data: { num: 42 } });
    ctx.set("data.num.sub", "shouldNotApply");
    // 42 不是对象，无法设置嵌套属性，静默忽略
    expect(ctx.get("data.num")).toBe(42);
  });
});

describe("ExecutionContext — toJSON", () => {
  it("merges parent and child variables", () => {
    const parent = new ExecutionContext({ a: 1 });
    const child = parent.fork({ b: 2 });
    const json = child.toJSON();
    expect(json.a).toBe(1);
    expect(json.b).toBe(2);
  });

  it("child overrides parent in toJSON", () => {
    const parent = new ExecutionContext({ a: 1 });
    const child = parent.fork({ a: 99 });
    expect(child.toJSON().a).toBe(99);
  });
});
