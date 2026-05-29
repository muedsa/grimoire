import { describe, it, expect } from "vitest";
import { RuleEngine, RuleDefinition } from "../../src/index";
import { d } from "../helpers";

describe("JSON — json_stringify", () => {
  it("serializes object in set node", async () => {
    const engine = new RuleEngine();
    const result = await engine.execute({
      variables: { data: { user: { name: "Alice", age: 30 } } },
      nodes: {
        main: [
          {
            type: "set",
            variable: "result.jsonStr",
            value: "${json_stringify(data.user)}",
          },
        ],
      },
    });
    expect((d(result).result as any)?.jsonStr).toBe(
      '{"name":"Alice","age":30}',
    );
  });

  it("serializes array", async () => {
    const engine = new RuleEngine();
    const result = await engine.execute({
      variables: { data: { items: [1, 2, 3] } },
      nodes: {
        main: [
          {
            type: "set",
            variable: "result.jsonStr",
            value: "${json_stringify(data.items)}",
          },
        ],
      },
    });
    expect((d(result).result as any)?.jsonStr).toBe("[1,2,3]");
  });
});

describe("JSON — json_parse", () => {
  it("deserializes JSON string in set node", async () => {
    const engine = new RuleEngine();
    const result = await engine.execute({
      variables: { data: { jsonStr: '{"name":"Alice","age":30}' } },
      nodes: {
        main: [
          {
            type: "set",
            variable: "result.user",
            value: "${json_parse(data.jsonStr)}",
          },
          {
            type: "set",
            variable: "result.userName",
            value: "${result.user.name}",
          },
        ],
      },
    });
    expect((d(result).result as any)?.userName).toBe("Alice");
  });
});

describe("JSON — round-trip", () => {
  it("serialize then deserialize through engine", async () => {
    const engine = new RuleEngine();
    const result = await engine.execute({
      variables: { data: { payload: { items: [1, 2, 3], flag: true } } },
      nodes: {
        main: [
          {
            type: "set",
            variable: "result.serialized",
            value: "${json_stringify(data.payload)}",
          },
          {
            type: "set",
            variable: "result.parsed",
            value: "${json_parse(result.serialized)}",
          },
          {
            type: "set",
            variable: "result.flag",
            value: "${result.parsed.flag}",
          },
        ],
      },
    });
    expect((d(result).result as any)?.flag).toBe(true);
  });
});
