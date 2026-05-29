import { describe, it, expect } from "vitest";
import {
  CustomNodeHandler,
  CustomNodeRegistry,
  ExecutionContext,
} from "../src/index";

describe("CustomNodeRegistry", () => {
  it("register and get", () => {
    const registry = new CustomNodeRegistry();
    const handler: CustomNodeHandler = () => ({ status: "success" });
    registry.register("test.handler", handler);
    expect(registry.get("test.handler")).toBe(handler);
  });

  it("get returns undefined for unregistered handler", () => {
    const registry = new CustomNodeRegistry();
    expect(registry.get("nonexistent")).toBe(undefined);
  });

  it("has returns true for registered handlers", () => {
    const registry = new CustomNodeRegistry();
    registry.register("test.one", () => ({ status: "success" }));
    registry.register("test.two", () => ({ status: "success" }));
    expect(registry.has("test.one")).toBe(true);
    expect(registry.has("test.two")).toBe(true);
    expect(registry.has("test.three")).toBe(false);
  });

  it("names returns all registered handler names", () => {
    const registry = new CustomNodeRegistry();
    registry.register("handler.a", () => ({ status: "success" }));
    registry.register("handler.b", () => ({ status: "success" }));
    const names = registry.names();
    expect(names).toContain("handler.a");
    expect(names).toContain("handler.b");
    expect(names.length).toBe(2);
  });

  it("handler receives params and context", async () => {
    const registry = new CustomNodeRegistry();
    registry.register("test.handler", async (params, ctx) => {
      expect((params as Record<string, number>).value).toBe(42);
      ctx.set("result.called", true);
      return { status: "success" };
    });

    const handler = registry.get("test.handler")!;
    const ctx = new ExecutionContext({});
    await handler({ value: 42 }, ctx);
    expect(ctx.get("result.called")).toBe(true);
  });
});
