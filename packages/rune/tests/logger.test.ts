import { describe, it, expect } from "vitest";
import { Logger, NoopLogger } from "../src/logger";

describe("Logger 接口", () => {
  it("NoopLogger 所有方法调用不应抛异常", () => {
    const logger: Logger = new NoopLogger();

    // 每个方法单独调用
    expect(() => logger.debug("test")).not.toThrow();
    expect(() => logger.info("test")).not.toThrow();
    expect(() => logger.warn("test")).not.toThrow();
    expect(() => logger.error("test")).not.toThrow();

    // 带 data 参数调用
    expect(() => logger.debug("test", { key: "value" })).not.toThrow();
    expect(() => logger.info("test", { key: "value" })).not.toThrow();
    expect(() => logger.warn("test", { key: "value" })).not.toThrow();
    expect(() => logger.error("test", { key: "value" })).not.toThrow();
  });

  it("NoopLogger 可被结构类型实现", () => {
    // 验证接口是结构性（duck typing）的 — 任何有这四个方法的对象都是 Logger
    const custom: Logger = {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    };
    expect(() => custom.info("hello")).not.toThrow();
  });
});
