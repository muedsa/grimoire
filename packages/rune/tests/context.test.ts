import { describe, it, expect } from "vitest";
import { ExecutionContext } from "../src/index";

describe("ExecutionContext — variable access", () => {
  it("get retrieves values from current scope", () => {
    const ctx = new ExecutionContext({ a: 1, b: "hello" });
    expect(ctx.get("a")).toBe(1);
    expect(ctx.get("b")).toBe("hello");
  });

  it("set writes to current scope", () => {
    const ctx = new ExecutionContext({});
    ctx.set("x", 42);
    expect(ctx.get("x")).toBe(42);
  });

  it("get returns undefined for missing values", () => {
    const ctx = new ExecutionContext({});
    expect(ctx.get("missing")).toBe(undefined);
  });
});

describe("ExecutionContext — parent chain lookup", () => {
  it("get traverses parent chain when root key not in current scope", () => {
    const grandparent = new ExecutionContext({ data: { user: { name: "Alice" } } });
    const parent = grandparent.fork();
    const child = parent.fork();

    expect(child.get("data.user.name")).toBe("Alice");
  });

  it("get returns undefined for non-existent nested path", () => {
    const ctx = new ExecutionContext({ data: { x: 1 } });
    expect(ctx.get("data.y.z")).toBe(undefined);
  });

  it("get handles array index out of bounds", () => {
    const ctx = new ExecutionContext({ data: { arr: [1, 2, 3] } });
    expect(ctx.get("data.arr.10")).toBe(undefined);
    expect(ctx.get("data.arr.-1")).toBe(undefined);
  });

  it("get returns undefined when accessing property of primitive", () => {
    const ctx = new ExecutionContext({ data: 42 });
    expect(ctx.get("data.foo")).toBe(undefined);
  });
});

describe("ExecutionContext — set with parent chain", () => {
  it("set writes to parent when root key exists in parent", () => {
    const parent = new ExecutionContext({ data: { x: 1 } });
    const child = parent.fork();
    child.set("data.x", 999);
    expect(parent.get("data.x")).toBe(999);
  });

  it("set creates in current scope when root key not in parent", () => {
    const parent = new ExecutionContext({});
    const child = parent.fork();
    child.set("newVar", "hello");
    expect(child.get("newVar")).toBe("hello");
    expect(parent.get("newVar")).toBe(undefined);
  });
});

describe("ExecutionContext — setNestedValue array indexing", () => {
  it("set value at array index", () => {
    const ctx = new ExecutionContext({ data: { arr: [1, 2, 3] } });
    ctx.set("data.arr.1", 999);
    expect(ctx.get("data.arr.1")).toBe(999);
  });

  it("set creates nested object inside array element", () => {
    const ctx = new ExecutionContext({ data: { arr: [{}, {}] } });
    ctx.set("data.arr.0.name", "Alice");
    expect((ctx.get("data.arr.0") as any)?.name).toBe("Alice");
  });

  it("set creates nested array inside array element", () => {
    const ctx = new ExecutionContext({ data: { arr: [null, null] } });
    ctx.set("data.arr.0.0", "hello");
    expect((ctx.get("data.arr.0") as any)?.[0]).toBe("hello");
  });

  it("set creates nested object inside object property", () => {
    const ctx = new ExecutionContext({ data: {} });
    ctx.set("data.user.profile.name", "Alice");
    expect((ctx.get("data.user") as any)?.profile?.name).toBe("Alice");
  });

  it("set creates nested array inside object property", () => {
    const ctx = new ExecutionContext({ data: {} });
    ctx.set("data.items.0", "first");
    expect(Array.isArray(ctx.get("data.items"))).toBe(true);
    expect((ctx.get("data.items") as any)?.[0]).toBe("first");
  });
});

describe("ExecutionContext — fork", () => {
  it("child reads parent variable", () => {
    const parent = new ExecutionContext({ a: 1, b: 2 });
    const child = parent.fork();
    expect(child.get("a")).toBe(1);
    expect(child.get("b")).toBe(2);
  });

  it("child can override parent variables", () => {
    const parent = new ExecutionContext({ a: 1, b: 2 });
    const child = parent.fork({ b: 99, c: 3 });
    expect(child.get("a")).toBe(1);
    expect(child.get("b")).toBe(99);
    expect(child.get("c")).toBe(3);
  });

  it("set finds parent when root key exists", () => {
    const parent = new ExecutionContext({ a: 1, b: 2 });
    const child = parent.fork({ c: 3 });
    child.set("b", 99);
    expect(parent.get("b")).toBe(99);
  });

  it("new variable stays in child", () => {
    const parent = new ExecutionContext({ a: 1 });
    const child = parent.fork();
    child.set("newVar", "hello");
    expect(child.get("newVar")).toBe("hello");
    expect(parent.get("newVar")).toBe(undefined);
  });
});

describe("ExecutionContext — toJSON", () => {
  it("flattens all scope layers", () => {
    const parent = new ExecutionContext({ data: { name: "test", items: [1, 2] } });
    const child = parent.fork({ result: { count: 3 } });
    const json = child.toJSON();
    expect(json.data).toEqual({ name: "test", items: [1, 2] });
    expect(json.result).toEqual({ count: 3 });
  });

  it("child variables override parent in toJSON", () => {
    const parent = new ExecutionContext({ a: 1, b: 2 });
    const child = parent.fork({ b: 99, c: 3 });
    const json = child.toJSON();
    expect(json.a).toBe(1);
    expect(json.b).toBe(99);
    expect(json.c).toBe(3);
  });

  it("toJSON with multiple fork levels", () => {
    const root = new ExecutionContext({ root: "root" });
    const level1 = root.fork({ l1: "level1" });
    const level2 = level1.fork({ l2: "level2" });
    const json = level2.toJSON();
    expect(json.root).toBe("root");
    expect(json.l1).toBe("level1");
    expect(json.l2).toBe("level2");
  });
});
