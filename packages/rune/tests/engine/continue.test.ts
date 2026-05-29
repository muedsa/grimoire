import { describe, it, expect } from "vitest";
import { RuleEngine, RuleDefinition } from "../../src/index";
import { d } from "../helpers";

describe("RuleEngine — continue", () => {
  it("skips to next iteration", async () => {
    const engine = new RuleEngine();
    const result = await engine.execute({
      variables: { data: { items: [1, 2, 3, 4, 5] } },
      nodes: {
        main: [
          { type: "set", variable: "result.sum", value: 0 },
          {
            type: "foreach",
            collection: "data.items",
            item: "item",
            body: [
              {
                type: "if",
                condition: "item == 3",
                then: [{ type: "continue" }],
              },
              {
                type: "set",
                variable: "result.sum",
                value: "${result.sum + item}",
              },
            ],
          },
        ],
      },
    });
    expect(result.status).toBe("success");
    // 1 + 2 + 4 + 5 = 12 (skipped 3)
    expect((d(result).result as any)?.sum).toBe(12);
  });

  it("works in nested loops", async () => {
    const engine = new RuleEngine();
    const result = await engine.execute({
      variables: {
        data: {
          rows: [
            [1, 2],
            [3, 4],
          ],
        },
      },
      nodes: {
        main: [
          { type: "set", variable: "result.count", value: 0 },
          {
            type: "foreach",
            collection: "data.rows",
            item: "row",
            body: [
              {
                type: "foreach",
                collection: "row",
                item: "val",
                body: [
                  {
                    type: "if",
                    condition: "val == 2",
                    then: [{ type: "continue" }],
                  },
                  {
                    type: "set",
                    variable: "result.count",
                    value: "${result.count + 1}",
                  },
                ],
              },
            ],
          },
        ],
      },
    });
    expect(result.status).toBe("success");
    // 1, 3, 4 counted (2 skipped) = 3
    expect((d(result).result as any)?.count).toBe(3);
  });

  it("continue in outer loop skips to next outer iteration", async () => {
    const engine = new RuleEngine();
    const result = await engine.execute({
      variables: { data: { items: [1, 2, 3] } },
      nodes: {
        main: [
          { type: "set", variable: "result.items", value: [] },
          {
            type: "foreach",
            collection: "data.items",
            item: "item",
            body: [
              {
                type: "if",
                condition: "item == 2",
                then: [{ type: "continue" }],
              },
              { type: "set", variable: "result.last", value: "${item}" },
            ],
          },
        ],
      },
    });
    expect(result.status).toBe("success");
    // last should be 3 (item=2 was skipped, item=3 was last)
    expect((d(result).result as any)?.last).toBe(3);
  });
});

describe("RuleEngine — break outside loop detection", () => {
  it("break outside loop returns failed", async () => {
    const engine = new RuleEngine();
    const result = await engine.execute({
      variables: {},
      nodes: {
        main: [{ type: "break" }],
      },
    });
    expect(result.status).toBe("failed");
    expect(result.error?.message).toContain(
      "'break' can only be used inside a foreach/while",
    );
  });

  it("continue outside loop returns failed", async () => {
    const engine = new RuleEngine();
    const result = await engine.execute({
      variables: {},
      nodes: {
        main: [{ type: "continue" }],
      },
    });
    expect(result.status).toBe("failed");
    expect(result.error?.message).toContain(
      "'continue' can only be used inside a foreach/while",
    );
  });

  it("break inside if outside loop returns failed", async () => {
    const engine = new RuleEngine();
    const result = await engine.execute({
      variables: {},
      nodes: {
        main: [{ type: "if", condition: "true", then: [{ type: "break" }] }],
      },
    });
    expect(result.status).toBe("failed");
    expect(result.error?.message).toContain(
      "'break' can only be used inside a foreach/while",
    );
  });
});
