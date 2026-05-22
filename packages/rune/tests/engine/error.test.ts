import { describe, it, expect } from "vitest";
import { RuleEngine, CustomNodeRegistry } from "../../src/index";

describe("RuleEngine — error handling", () => {
  it("wraps non-EngineError in ExecuteResult", async () => {
    const registry = new CustomNodeRegistry();
    registry.register("thrower", async () => {
      throw new TypeError("Something went wrong");
    });
    const engine = new RuleEngine({ registry });

    const result = await engine.execute({
      variables: {},
      nodes: {
        main: [{ type: "custom", name: "thrower" }],
      },
    });

    expect(result.status).toBe("failed");
    expect(result.error?.message).toContain("Something went wrong");
  });

  it("returns failed result for unknown node type at runtime", async () => {
    const engine = new RuleEngine();

    const result = await engine.execute({
      variables: {},
      nodes: {
        main: [{ type: "unknown" } as any],
      },
    });

    expect(result.status).toBe("failed");
    expect(result.error?.message).toContain("Unknown node type");
  });

  it("handles non-Error exceptions in execution", async () => {
    const registry = new CustomNodeRegistry();
    registry.register("throwString", async () => {
      throw "just a string error";
    });
    const engine = new RuleEngine({ registry });

    const result = await engine.execute({
      variables: {},
      nodes: {
        main: [{ type: "custom", name: "throwString" }],
      },
    });

    expect(result.status).toBe("failed");
    expect(result.error?.message).toContain("string error");
  });
});
