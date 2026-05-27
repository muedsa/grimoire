import { describe, expect, it } from "vitest";
import { resolveDanmakuConfig } from "../../src/core/config";
import { DensityGovernor } from "../../src/core/density";

describe("DensityGovernor", () => {
  const baseConfig = resolveDanmakuConfig({
    maxOnScreen: 80,
    adaptive: {
      enabled: true,
      targetFps: 60,
      minMaxOnScreen: 30,
    },
  });

  it("默认 effectiveMaxOnScreen === config.maxOnScreen", () => {
    const g = new DensityGovernor(baseConfig);
    expect(g.effectiveMaxOnScreen).toBe(80);
  });

  it("持续低于 downscaleFps 触发降级（×0.8）并发 onOverload", () => {
    const g = new DensityGovernor(baseConfig);
    const observed: number[] = [];
    g.setOnOverload((fps, effective) => {
      observed.push(effective);
      void fps;
    });
    // 模拟 1.2s 内 60 帧、每帧 dt = 25ms → fps ≈ 40，远低于 55 阈值。
    let now = 0;
    for (let i = 0; i < 60; i += 1) {
      now += 25;
      g.tick(now);
    }
    expect(g.effectiveMaxOnScreen).toBeLessThan(80);
    expect(g.effectiveMaxOnScreen).toBeGreaterThanOrEqual(30);
    expect(observed.length).toBeGreaterThan(0);
  });

  it("持续高于 upscaleFps 触发回升（+5）", () => {
    const g = new DensityGovernor(baseConfig);
    // 先降级到 64：80 × 0.8。
    let now = 0;
    for (let i = 0; i < 60; i += 1) {
      now += 25;
      g.tick(now);
    }
    const after_down = g.effectiveMaxOnScreen;
    expect(after_down).toBeLessThan(80);
    // 再持续足够多帧高 fps：dt = 16.67ms → fps ≈ 60。
    // 需要先填满 60 帧滑动窗口（约 60 帧），再持续 3s（约 180 帧）才触发回升。
    for (let i = 0; i < 300; i += 1) {
      now += 16.67;
      g.tick(now);
    }
    expect(g.effectiveMaxOnScreen).toBeGreaterThan(after_down);
  });

  it("回升不会超过 config.maxOnScreen", () => {
    const g = new DensityGovernor(baseConfig);
    let now = 0;
    for (let i = 0; i < 2000; i += 1) {
      now += 16;
      g.tick(now);
    }
    expect(g.effectiveMaxOnScreen).toBe(80);
  });

  it("降级有下限 minMaxOnScreen", () => {
    const tight = resolveDanmakuConfig({
      maxOnScreen: 50,
      adaptive: {
        enabled: true,
        targetFps: 60,
        minMaxOnScreen: 30,
      },
    });
    const g = new DensityGovernor(tight);
    let now = 0;
    // 持续高延迟：dt = 100ms → fps = 10。降级多次直到触底。
    for (let i = 0; i < 600; i += 1) {
      now += 100;
      g.tick(now);
    }
    expect(g.effectiveMaxOnScreen).toBe(30);
  });

  it("adaptive.enabled=false 时不调整", () => {
    const off = resolveDanmakuConfig({
      maxOnScreen: 80,
      adaptive: { enabled: false },
    });
    const g = new DensityGovernor(off);
    let now = 0;
    for (let i = 0; i < 60; i += 1) {
      now += 100;
      g.tick(now);
    }
    expect(g.effectiveMaxOnScreen).toBe(80);
  });
});
