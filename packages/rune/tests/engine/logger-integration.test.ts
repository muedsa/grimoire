import { describe, it, expect } from "vitest";
import { RuleEngine, Logger, RuleDefinition } from "../../src/index";

/** 创建带记录功能的 mock logger，返回 logger 和各方法调用记录 */
function createMockLogger() {
  const calls: { level: string; message: string; data?: unknown }[] = [];
  const logger: Logger = {
    debug: (msg, data) => calls.push({ level: "debug", message: msg, data }),
    info: (msg, data) => calls.push({ level: "info", message: msg, data }),
    warn: (msg, data) => calls.push({ level: "warn", message: msg, data }),
    error: (msg, data) => calls.push({ level: "error", message: msg, data }),
  };
  return { logger, calls };
}

describe("RuleEngine — Logger 集成", () => {
  it("正常执行流程应产生 info 和 debug 日志", async () => {
    const { logger, calls } = createMockLogger();
    const engine = new RuleEngine({ logger });

    const rule: RuleDefinition = {
      variables: { x: 1, y: 2 },
      nodes: {
        main: [
          { type: "set", variable: "result.sum", value: "${x} + ${y}" },
        ],
      },
    };

    const result = await engine.execute(rule);
    expect(result.status).toBe("success");

    // 验证 info 级别：execute 开始和结束
    const infoMessages = calls.filter((c) => c.level === "info").map((c) => c.message);
    expect(infoMessages).toContain("[execute] 开始执行");
    expect(infoMessages.some((m) => m.includes("执行完成"))).toBe(true);

    // 验证 debug 级别：节点执行
    const debugMessages = calls.filter((c) => c.level === "debug").map((c) => c.message);
    expect(debugMessages.some((m) => m.includes("executeNodes"))).toBe(true);
    expect(debugMessages.some((m) => m.includes("executeSet"))).toBe(true);
  });

  it("编译失败应产生 error 日志", async () => {
    const { logger, calls } = createMockLogger();
    const engine = new RuleEngine({ logger });

    const rule: RuleDefinition = {
      nodes: {},
    };

    const result = await engine.execute(rule);
    expect(result.status).toBe("failed");

    const errorCalls = calls.filter((c) => c.level === "error");
    expect(errorCalls.length).toBeGreaterThan(0);
  });

  it("If 分支应记录分支选择日志", async () => {
    const { logger, calls } = createMockLogger();
    const engine = new RuleEngine({ logger });

    const rule: RuleDefinition = {
      variables: { flag: true },
      nodes: {
        main: [
          {
            type: "if",
            condition: "flag",
            then: [{ type: "set", variable: "result.chosen", value: '"then"' }],
            else: [{ type: "set", variable: "result.chosen", value: '"else"' }],
          },
        ],
      },
    };

    await engine.execute(rule);

    const ifDebug = calls.filter(
      (c) => c.level === "debug" && c.message.includes("executeIf"),
    );
    expect(ifDebug.length).toBeGreaterThan(0);
  });

  it("Foreach 循环应记录迭代日志", async () => {
    const { logger, calls } = createMockLogger();
    const engine = new RuleEngine({ logger });

    const rule: RuleDefinition = {
      variables: { items: ["a", "b", "c"] },
      nodes: {
        main: [
          {
            type: "foreach",
            collection: "items",
            item: "it",
            body: [{ type: "set", variable: "result.last", value: "${it}" }],
          },
        ],
      },
    };

    await engine.execute(rule);

    const foreachDebug = calls.filter(
      (c) => c.level === "debug" && c.message.includes("executeForeach"),
    );
    expect(foreachDebug.length).toBe(3); // 三个元素三次迭代
  });

  it("默认 NoopLogger 不应抛异常（向后兼容）", async () => {
    const engine = new RuleEngine();

    const rule: RuleDefinition = {
      variables: { x: 1 },
      nodes: {
        main: [{ type: "set", variable: "result.x", value: "${x}" }],
      },
    };

    const result = await engine.execute(rule);
    expect(result.status).toBe("success");
  });
});
