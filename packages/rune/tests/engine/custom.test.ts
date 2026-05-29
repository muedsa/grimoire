import { describe, it, expect } from "vitest";
import {
  RuleEngine,
  RuleDefinition,
  CustomNodeRegistry,
} from "../../src/index";
import { d } from "../helpers";

describe("CustomNode — registration", () => {
  it("sync custom node", async () => {
    const registry = new CustomNodeRegistry();
    registry.register("double", (params) => ({
      status: "success",
      data: (params as Record<string, number>).value * 2,
    }));

    const engine = new RuleEngine({ registry });
    const rule: RuleDefinition = {
      variables: { data: { value: 21 } },
      nodes: {
        main: [
          {
            type: "custom",
            name: "double",
            params: { value: "${data.value}" },
          },
        ],
      },
    };
    const result = await engine.execute(rule);
    expect(result.status).toBe("success");
  });
});

describe("CustomNode — async", () => {
  it("handles async custom node", async () => {
    const registry = new CustomNodeRegistry();
    registry.register("async.fetch", async (_params, ctx) => {
      await new Promise((r) => setTimeout(r, 10));
      ctx.set("result.fetched", true);
      return { status: "success" };
    });

    const engine = new RuleEngine({ registry });
    const result = await engine.execute({
      variables: {},
      nodes: {
        main: [{ type: "custom", name: "async.fetch", params: {} }],
      },
    });
    expect(result.status).toBe("success");
    expect((d(result).result as any)?.fetched).toBe(true);
  });
});

describe("CustomNode — error handling", () => {
  it("unregistered handler returns failed result", async () => {
    const engine = new RuleEngine();
    const result = await engine.execute({
      variables: {},
      nodes: {
        main: [{ type: "custom", name: "nonexistent.handler", params: {} }],
      },
    });
    expect(result.status).toBe("failed");
    expect(result.error?.message).toContain("not found");
  });

  it("handler returning failed status propagates to top level", async () => {
    const registry = new CustomNodeRegistry();
    registry.register("failing.handler", () => ({
      status: "failed",
      error: new (class extends Error {
        code = "EXECUTE_ERROR";
        message = "handler failed";
      })(),
    }));

    const engine = new RuleEngine({ registry });
    const result = await engine.execute({
      variables: {},
      nodes: {
        main: [{ type: "custom", name: "failing.handler", params: {} }],
      },
    });
    expect(result.status).toBe("failed");
  });
});

describe("CustomNode — context access", () => {
  it("custom node reads context variables", async () => {
    const registry = new CustomNodeRegistry();
    registry.register("readTotal", (_params, ctx) => ({
      status: "success",
      data: ctx.get("result.total"),
    }));

    const engine = new RuleEngine({ registry });
    const rule: RuleDefinition = {
      variables: { data: {} },
      nodes: {
        main: [
          { type: "set", variable: "result.total", value: 42 },
          { type: "custom", name: "readTotal", params: {} },
        ],
      },
    };
    const result = await engine.execute(rule);
    expect((d(result).result as any)?.total).toBe(42);
  });

  it("custom node params use AssignTemplate", async () => {
    const registry = new CustomNodeRegistry();
    registry.register("buildUrl", (params, ctx) => {
      const config = (params as Record<string, unknown>).config as Record<
        string,
        unknown
      >;
      const url = (config.baseUrl as string) + (config.path as string);
      ctx.set("result.url", url);
      return { status: "success" };
    });

    const engine = new RuleEngine({ registry });
    const rule: RuleDefinition = {
      variables: { data: { userId: 42 } },
      nodes: {
        main: [
          {
            type: "custom",
            name: "buildUrl",
            params: {
              config: {
                baseUrl: "https://api.example.com",
                path: "/users/${data.userId}",
              },
            },
          },
        ],
      },
    };
    const result = await engine.execute(rule);
    expect((d(result).result as any)?.url).toBe(
      "https://api.example.com/users/42",
    );
  });

  it("custom node modifies context inside loop", async () => {
    const registry = new CustomNodeRegistry();
    registry.register("addTen", (_params, ctx) => {
      const current = ctx.get("result.sum") as number;
      ctx.set("result.sum", current + 10);
      return { status: "success" };
    });

    const engine = new RuleEngine({ registry });
    const rule: RuleDefinition = {
      variables: { data: { items: [1, 2, 3] } },
      nodes: {
        main: [
          { type: "set", variable: "result.sum", value: 0 },
          {
            type: "foreach",
            collection: "data.items",
            item: "item",
            body: [{ type: "custom", name: "addTen", params: {} }],
          },
        ],
      },
    };
    const result = await engine.execute(rule);
    expect((d(result).result as any)?.sum).toBe(30);
  });
});

describe("RuleEngine — custom node registry", () => {
  it("unknown handler returns failed result", async () => {
    const engine = new RuleEngine();
    const result = await engine.execute({
      variables: {},
      nodes: {
        main: [{ type: "custom", name: "nonexistent" }],
      },
    });

    expect(result.status).toBe("failed");
    expect(result.error?.message).toContain("not found");
  });

  it("handler receives context reference for mutation", async () => {
    const registry = new CustomNodeRegistry();
    registry.register("mutator", async (_params, ctx) => {
      ctx.set("result.mutated", "yes");
      return { status: "success" };
    });

    const engine = new RuleEngine({ registry });
    const result = await engine.execute({
      variables: {},
      nodes: {
        main: [
          { type: "set", variable: "result.before", value: "ok" },
          { type: "custom", name: "mutator" },
        ],
      },
    });

    expect(result.status).toBe("success");
    expect((d(result).result as any)?.mutated).toBe("yes");
  });
});
