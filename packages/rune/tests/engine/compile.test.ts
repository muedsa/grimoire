import { describe, it, expect } from "vitest";
import {
  compileRule,
  RuleDefinition,
  clearExpressionCache,
} from "../../src/index";
import { EngineError, ErrorCode } from "../../src/index";

describe("compileRule — error paths", () => {
  it("throws on empty nodes object", () => {
    const rule: RuleDefinition = { variables: {}, nodes: {} };
    expect(() => compileRule(rule)).toThrow(
      "must have a non-empty nodes object",
    );
  });

  it("throws on missing nodes field", () => {
    const rule: RuleDefinition = { variables: {}, nodes: undefined as any };
    expect(() => compileRule(rule)).toThrow(
      "must have a non-empty nodes object",
    );
  });

  it("throws on missing entry node group", () => {
    const rule: RuleDefinition = { variables: {}, nodes: { other: [] } };
    expect(() => compileRule(rule)).toThrow(
      "Entry node group 'main' not found or empty",
    );
  });

  it("throws on non-array node group", () => {
    const rule: RuleDefinition = {
      variables: {},
      nodes: { main: { not: "array" } as any },
    };
    expect(() => compileRule(rule)).toThrow("must be an array");
  });

  it("throws on if node without condition", () => {
    const rule: RuleDefinition = {
      variables: {},
      nodes: { main: [{ type: "if", condition: "", then: [] }] },
    };
    expect(() => compileRule(rule)).toThrow("must have a condition");
  });

  it("throws on loop node without collection", () => {
    const rule: RuleDefinition = {
      variables: {},
      nodes: {
        main: [{ type: "foreach", collection: "", item: "x", body: [] }],
      },
    };
    expect(() => compileRule(rule)).toThrow("must have a collection");
  });

  it("throws on while node without condition", () => {
    const rule: RuleDefinition = {
      variables: {},
      nodes: { main: [{ type: "while", condition: "", body: [] }] },
    };
    expect(() => compileRule(rule)).toThrow("While node must have a condition");
  });

  it("throws on while node with undefined condition", () => {
    const rule: RuleDefinition = {
      variables: {},
      nodes: {
        main: [{ type: "while", condition: undefined as any, body: [] }],
      },
    };
    expect(() => compileRule(rule)).toThrow("While node must have a condition");
  });

  it("throws on invalid expression in set value", () => {
    const rule: RuleDefinition = {
      variables: {},
      nodes: { main: [{ type: "set", variable: "x", value: "${a @ b}" }] },
    };
    expect(() => compileRule(rule)).toThrow();
  });

  it("throws on invalid expression in custom params", () => {
    const rule: RuleDefinition = {
      variables: {},
      nodes: {
        main: [{ type: "custom", name: "handler", params: { x: "${a @ b}" } }],
      },
    };
    expect(() => compileRule(rule)).toThrow();
  });

  it("catches exception with correct error code", () => {
    const rule: RuleDefinition = { variables: {}, nodes: {} };
    try {
      compileRule(rule);
    } catch (err) {
      expect(err).toBeInstanceOf(EngineError);
      expect((err as EngineError).code).toBe(ErrorCode.NODE_TYPE_ERROR);
    }
  });
});

describe("compileRule — success paths", () => {
  it("compiles valid rule without throwing", () => {
    const rule: RuleDefinition = {
      variables: { data: { name: "test" } },
      nodes: {
        main: [
          { type: "set", variable: "result.x", value: "${data.name}" },
          { type: "if", condition: "data.name == 'test'", then: [] },
          { type: "foreach", collection: "data.items", item: "item", body: [] },
        ],
      },
    };
    expect(() => compileRule(rule)).not.toThrow();
  });

  it("compiles rule with break and return", () => {
    const rule: RuleDefinition = {
      variables: {},
      nodes: {
        main: [{ type: "break" }, { type: "return", value: "1" }],
      },
    };
    expect(() => compileRule(rule)).not.toThrow();
  });

  it("compiles rule with empty else branch", () => {
    const rule: RuleDefinition = {
      variables: {},
      nodes: {
        main: [{ type: "if", condition: "true", then: [], else: [] }],
      },
    };
    expect(() => compileRule(rule)).not.toThrow();
  });
});

describe("compileRule — set node validation", () => {
  it("throws on set node with empty variable", () => {
    const rule: RuleDefinition = {
      variables: {},
      nodes: { main: [{ type: "set", variable: "", value: "val" }] },
    };
    expect(() => compileRule(rule)).toThrow(
      "Set node must have a non-empty variable",
    );
  });

  it("throws on set node with whitespace-only variable", () => {
    const rule: RuleDefinition = {
      variables: {},
      nodes: { main: [{ type: "set", variable: "   ", value: "val" }] },
    };
    expect(() => compileRule(rule)).toThrow(
      "Set node must have a non-empty variable",
    );
  });

  it("throws on set node with missing variable field", () => {
    const rule: RuleDefinition = {
      variables: {},
      nodes: {
        main: [{ type: "set", variable: undefined as any, value: "val" }],
      },
    };
    expect(() => compileRule(rule)).toThrow(
      "Set node must have a non-empty variable",
    );
  });
});

describe("compileRule — exec node validation", () => {
  it("compiles exec node with expression", () => {
    const rule: RuleDefinition = {
      variables: {},
      nodes: { main: [{ type: "exec", expression: "len(data.items)" }] },
    };
    expect(() => compileRule(rule)).not.toThrow();
  });

  it("throws on exec node with empty expression", () => {
    const rule: RuleDefinition = {
      variables: {},
      nodes: { main: [{ type: "exec", expression: "" }] },
    };
    expect(() => compileRule(rule)).toThrow(
      "Exec node must have a non-empty expression",
    );
  });

  it("throws on exec node with whitespace-only expression", () => {
    const rule: RuleDefinition = {
      variables: {},
      nodes: { main: [{ type: "exec", expression: "   " }] },
    };
    expect(() => compileRule(rule)).toThrow(
      "Exec node must have a non-empty expression",
    );
  });

  it("throws on exec node with missing expression field", () => {
    const rule: RuleDefinition = {
      variables: {},
      nodes: { main: [{ type: "exec", expression: undefined as any }] },
    };
    expect(() => compileRule(rule)).toThrow(
      "Exec node must have a non-empty expression",
    );
  });
});

describe("compileRule — unknown node type", () => {
  it("does not throw during compilation (caught at runtime)", () => {
    const rule: RuleDefinition = {
      variables: {},
      nodes: { main: [{ type: "unknown" } as any] },
    };
    // 未知节点在编译时不会被检测到，只在执行时报错
    expect(() => compileRule(rule)).not.toThrow();
  });
});
