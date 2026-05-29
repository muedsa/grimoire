import { describe, it, expect } from "vitest";
import {
  RuleEngine,
  RuleDefinition,
  ExecutionContext,
  CustomNodeRegistry,
  DebugStepController,
} from "../../src/index";
import type { StepContext } from "../../src/index";

/** 收集 onAfterStep 调用记录 */
interface DebugCall {
  nodeType: string;
  contextSnapshot: Record<string, unknown>;
}

function createCollectingController(calls: DebugCall[]): DebugStepController {
  const controller = new DebugStepController();
  controller.onAfterStep = (stepCtx, execCtx) => {
    calls.push({
      nodeType: stepCtx.node.type,
      contextSnapshot: execCtx.toJSON(),
    });
  };
  controller.runToCompletion(); // 非调试模式，连续执行
  return controller;
}

async function collectDebugCalls(rule: RuleDefinition): Promise<DebugCall[]> {
  const calls: DebugCall[] = [];
  const engine = new RuleEngine();
  const controller = createCollectingController(calls);

  await engine.execute(rule, { stepController: controller });

  return calls;
}

describe("RuleEngine -- DebugStepController", () => {
  it("should call onAfterStep for each executed node", async () => {
    const calls: Array<{ nodeType: string }> = [];
    const engine = new RuleEngine();
    const controller = createCollectingController(
      calls as unknown as DebugCall[],
    );

    const rule: RuleDefinition = {
      name: "test",
      variables: { x: 0 },
      nodes: {
        main: [
          { type: "set", variable: "x", value: 10 },
          { type: "set", variable: "y", value: 20 },
        ],
      },
    };

    await engine.execute(rule, { stepController: controller });

    expect(calls).toHaveLength(2);
    expect(calls[0].nodeType).toBe("set");
    expect(calls[1].nodeType).toBe("set");
  });

  it("should provide context snapshot after set node execution", async () => {
    const calls: DebugCall[] = await collectDebugCalls({
      name: "test",
      variables: { x: 0 },
      nodes: {
        main: [{ type: "set", variable: "x", value: 42 }],
      },
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].nodeType).toBe("set");
    expect(calls[0].contextSnapshot.x).toBe(42);
  });

  it("should call onAfterStep for if node with correct branch context", async () => {
    const calls: DebugCall[] = await collectDebugCalls({
      name: "test",
      variables: { x: 10 },
      nodes: {
        main: [
          {
            type: "if",
            condition: "x > 5",
            then: [{ type: "set", variable: "result", value: "big" }],
          },
        ],
      },
    });

    const setCalls = calls.filter((c) => c.nodeType === "set");
    expect(setCalls).toHaveLength(1);
    expect(setCalls[0].contextSnapshot.result).toBe("big");
  });

  it("should call onAfterStep for foreach iterations", async () => {
    const calls: DebugCall[] = await collectDebugCalls({
      name: "test",
      variables: { sum: 0 },
      nodes: {
        main: [
          {
            type: "foreach",
            collection: "[1, 2, 3]",
            item: "item",
            body: [{ type: "set", variable: "sum", value: "${sum + item}" }],
          },
        ],
      },
    });

    const setCalls = calls.filter((c) => c.nodeType === "set");
    expect(setCalls).toHaveLength(3);
    expect(setCalls[2].contextSnapshot.sum).toBe(6);
  });

  it("should call onAfterStep for while loop iterations", async () => {
    const calls: DebugCall[] = await collectDebugCalls({
      name: "test",
      variables: { i: 0 },
      nodes: {
        main: [
          {
            type: "while",
            condition: "i < 3",
            body: [{ type: "set", variable: "i", value: "${i + 1}" }],
          },
        ],
      },
    });

    const setCalls = calls.filter((c) => c.nodeType === "set");
    expect(setCalls).toHaveLength(3);
    expect(setCalls[2].contextSnapshot.i).toBe(3);
  });

  it("should call onAfterStep for return node", async () => {
    const calls: DebugCall[] = await collectDebugCalls({
      name: "test",
      variables: {},
      nodes: {
        main: [
          { type: "return", value: "hello" },
          { type: "set", variable: "x", value: 1 },
        ],
      },
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].nodeType).toBe("return");
  });

  it("should call onAfterStep for break node", async () => {
    const calls: DebugCall[] = await collectDebugCalls({
      name: "test",
      variables: { i: 0 },
      nodes: {
        main: [
          {
            type: "while",
            condition: "true",
            body: [
              { type: "set", variable: "i", value: "${i + 1}" },
              { type: "break" },
            ],
          },
        ],
      },
    });

    const breakCalls = calls.filter((c) => c.nodeType === "break");
    expect(breakCalls).toHaveLength(1);
  });

  it("should call onAfterStep for continue node", async () => {
    const calls: DebugCall[] = await collectDebugCalls({
      name: "test",
      variables: { i: 0 },
      nodes: {
        main: [
          {
            type: "foreach",
            collection: "[1, 2, 3]",
            item: "item",
            body: [
              { type: "set", variable: "i", value: "${i + 1}" },
              { type: "continue" },
              { type: "set", variable: "skip", value: "never" },
            ],
          },
        ],
      },
    });

    const continueCalls = calls.filter((c) => c.nodeType === "continue");
    expect(continueCalls).toHaveLength(3);

    const skipCalls = calls.filter(
      (c) => c.nodeType === "set" && c.contextSnapshot.skip === "never",
    );
    expect(skipCalls).toHaveLength(0);
  });

  it("should not call onAfterStep when stepController not provided", async () => {
    const engine = new RuleEngine();
    const rule: RuleDefinition = {
      name: "test",
      variables: {},
      nodes: {
        main: [{ type: "set", variable: "x", value: 1 }],
      },
    };

    const result = await engine.execute(rule);
    expect(result.status).toBe("success");
  });

  it("should call onAfterStep for custom nodes", async () => {
    const calls: DebugCall[] = [];
    const registry = new CustomNodeRegistry();
    registry.register("test.node", (params, ctx) => {
      ctx.set("custom", "done");
      return { status: "success" };
    });
    const engine = new RuleEngine({ registry });
    const controller = createCollectingController(calls);

    const rule: RuleDefinition = {
      name: "test",
      variables: {},
      nodes: {
        main: [{ type: "custom", name: "test.node", params: {} }],
      },
    };

    await engine.execute(rule, { stepController: controller });

    expect(calls).toHaveLength(1);
    expect(calls[0].nodeType).toBe("custom");
    expect(calls[0].contextSnapshot.custom).toBe("done");
  });

  it("should track nested if/else branch execution", async () => {
    const calls: DebugCall[] = await collectDebugCalls({
      name: "test",
      variables: { x: 0 },
      nodes: {
        main: [
          {
            type: "if",
            condition: "x > 10",
            then: [{ type: "set", variable: "branch", value: "then" }],
            else: [{ type: "set", variable: "branch", value: "else" }],
          },
        ],
      },
    });

    const setCalls = calls.filter((c) => c.nodeType === "set");
    expect(setCalls).toHaveLength(1);
    expect(setCalls[0].contextSnapshot.branch).toBe("else");
  });

  it("should call onAfterStep for exec node", async () => {
    const calls: DebugCall[] = await collectDebugCalls({
      name: "test",
      variables: {},
      nodes: {
        main: [{ type: "exec", expression: "len([1, 2, 3])" }],
      },
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].nodeType).toBe("exec");
  });
});

describe("StepContext — loopStack in foreach", () => {
  it("should provide loopStack with correct index and total for each foreach iteration", async () => {
    const afterCalls: {
      nodeType: string;
      loopStack: StepContext["loopStack"];
    }[] = [];
    const engine = new RuleEngine();
    const controller = new DebugStepController();
    controller.onAfterStep = (ctx) => {
      afterCalls.push({ nodeType: ctx.node.type, loopStack: ctx.loopStack });
    };
    controller.runToCompletion();

    const rule: RuleDefinition = {
      name: "test",
      variables: { sum: 0 },
      nodes: {
        main: [
          {
            type: "foreach",
            collection: "[10, 20, 30]",
            item: "item",
            body: [{ type: "set", variable: "sum", value: "${sum + item}" }],
          },
        ],
      },
    };

    await engine.execute(rule, { stepController: controller });

    // 3 次迭代 × 每个 body 节点 = 3 次 onAfterStep 调用
    const bodyCalls = afterCalls.filter((c) => c.nodeType === "set");
    expect(bodyCalls).toHaveLength(3);

    // 每次迭代的 loopStack 应包含正确的 foreach 帧
    expect(bodyCalls[0].loopStack).toEqual([
      { type: "foreach", index: 0, itemKey: "item", total: 3 },
    ]);
    expect(bodyCalls[1].loopStack).toEqual([
      { type: "foreach", index: 1, itemKey: "item", total: 3 },
    ]);
    expect(bodyCalls[2].loopStack).toEqual([
      { type: "foreach", index: 2, itemKey: "item", total: 3 },
    ]);
  });

  it("should provide empty loopStack for nodes outside loops", async () => {
    const afterCalls: {
      nodeType: string;
      loopStack: StepContext["loopStack"];
    }[] = [];
    const engine = new RuleEngine();
    const controller = new DebugStepController();
    controller.onAfterStep = (ctx) => {
      afterCalls.push({ nodeType: ctx.node.type, loopStack: ctx.loopStack });
    };
    controller.runToCompletion();

    const rule: RuleDefinition = {
      name: "test",
      variables: {},
      nodes: {
        main: [
          { type: "set", variable: "x", value: 1 },
          { type: "set", variable: "y", value: 2 },
        ],
      },
    };

    await engine.execute(rule, { stepController: controller });

    const setCalls = afterCalls.filter((c) => c.nodeType === "set");
    expect(setCalls).toHaveLength(2);
    expect(setCalls[0].loopStack).toEqual([]);
    expect(setCalls[1].loopStack).toEqual([]);
  });
});

describe("StepContext — loopStack in while", () => {
  it("should provide loopStack with index for each while iteration", async () => {
    const afterCalls: {
      nodeType: string;
      loopStack: StepContext["loopStack"];
    }[] = [];
    const engine = new RuleEngine();
    const controller = new DebugStepController();
    controller.onAfterStep = (ctx) => {
      afterCalls.push({ nodeType: ctx.node.type, loopStack: ctx.loopStack });
    };
    controller.runToCompletion();

    const rule: RuleDefinition = {
      name: "test",
      variables: { i: 0 },
      nodes: {
        main: [
          {
            type: "while",
            condition: "i < 2",
            body: [{ type: "set", variable: "i", value: "${i + 1}" }],
          },
        ],
      },
    };

    await engine.execute(rule, { stepController: controller });

    const bodyCalls = afterCalls.filter((c) => c.nodeType === "set");
    expect(bodyCalls).toHaveLength(2);
    expect(bodyCalls[0].loopStack).toEqual([{ type: "while", index: 0 }]);
    expect(bodyCalls[1].loopStack).toEqual([{ type: "while", index: 1 }]);
  });
});

describe("StepContext — nested loops", () => {
  it("should provide nested loopStack for nested foreach", async () => {
    const afterCalls: {
      nodeType: string;
      loopStack: StepContext["loopStack"];
    }[] = [];
    const engine = new RuleEngine();
    const controller = new DebugStepController();
    controller.onAfterStep = (ctx) => {
      afterCalls.push({ nodeType: ctx.node.type, loopStack: ctx.loopStack });
    };
    controller.runToCompletion();

    const rule: RuleDefinition = {
      name: "test",
      variables: {},
      nodes: {
        main: [
          {
            type: "foreach",
            collection: "[1, 2]",
            item: "outer",
            body: [
              {
                type: "foreach",
                collection: "[10, 20]",
                item: "inner",
                body: [
                  { type: "set", variable: "x", value: "${outer + inner}" },
                ],
              },
            ],
          },
        ],
      },
    };

    await engine.execute(rule, { stepController: controller });

    const bodyCalls = afterCalls.filter((c) => c.nodeType === "set");
    // 2 外层 × 2 内层 = 4 次 body 执行
    expect(bodyCalls).toHaveLength(4);

    expect(bodyCalls[0].loopStack).toEqual([
      { type: "foreach", index: 0, itemKey: "outer", total: 2 },
      { type: "foreach", index: 0, itemKey: "inner", total: 2 },
    ]);
    expect(bodyCalls[1].loopStack).toEqual([
      { type: "foreach", index: 0, itemKey: "outer", total: 2 },
      { type: "foreach", index: 1, itemKey: "inner", total: 2 },
    ]);
    expect(bodyCalls[2].loopStack).toEqual([
      { type: "foreach", index: 1, itemKey: "outer", total: 2 },
      { type: "foreach", index: 0, itemKey: "inner", total: 2 },
    ]);
  });
});

describe("StepContext — break/continue/return", () => {
  it("should not include loopStack for nodes after break exits the loop", async () => {
    const afterCalls: {
      nodeType: string;
      loopStack: StepContext["loopStack"];
    }[] = [];
    const engine = new RuleEngine();
    const controller = new DebugStepController();
    controller.onAfterStep = (ctx) => {
      afterCalls.push({ nodeType: ctx.node.type, loopStack: ctx.loopStack });
    };
    controller.runToCompletion();

    const rule: RuleDefinition = {
      name: "test",
      variables: {},
      nodes: {
        main: [
          {
            type: "foreach",
            collection: "[1, 2, 3]",
            item: "item",
            body: [
              {
                type: "if",
                condition: "item == 2",
                then: [{ type: "break" }],
              },
            ],
          },
          { type: "set", variable: "after", value: "done" },
        ],
      },
    };

    await engine.execute(rule, { stepController: controller });

    // 最后的 set 节点应在空 loopStack 中执行
    const lastSetCall = afterCalls.filter((c) => c.nodeType === "set");
    expect(lastSetCall).toHaveLength(1);
    expect(lastSetCall[0].loopStack).toEqual([]);
  });

  it("should call onAfterStep for return inside foreach loop", async () => {
    const afterCalls: DebugCall[] = [];
    const engine = new RuleEngine();
    const controller = new DebugStepController();
    controller.onAfterStep = (stepCtx, execCtx) => {
      afterCalls.push({
        nodeType: stepCtx.node.type,
        contextSnapshot: execCtx.toJSON(),
      });
    };
    controller.runToCompletion();

    const rule: RuleDefinition = {
      name: "test",
      variables: {},
      nodes: {
        main: [
          {
            type: "foreach",
            collection: "[1, 2, 3]",
            item: "item",
            body: [
              {
                type: "if",
                condition: "item == 2",
                then: [{ type: "return", value: "'early'" }],
              },
            ],
          },
        ],
      },
    };

    await engine.execute(rule, { stepController: controller });

    // return 终止执行，onAfterStep 应被调用
    const returnCalls = afterCalls.filter((c) => c.nodeType === "return");
    expect(returnCalls).toHaveLength(1);
  });
});
