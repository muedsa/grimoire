import { describe, expect, it } from "vitest";
import { resolveDanmakuConfig } from "../../src/core/config";
import { TrackAllocator } from "../../src/core/track-allocator";
import type { DanmakuItem } from "../../src/core/types";

const mk = (
  id: string,
  time: number,
  extra: Partial<DanmakuItem> = {},
): DanmakuItem => ({ id, time, text: id, ...extra });

const config = resolveDanmakuConfig({
  scrollDurationMs: 8000,
  fixedDurationMs: 4000,
  maxOnScreen: 10,
  defaultFontSize: 24,
  trackGap: 4,
});

describe("TrackAllocator", () => {
  it("空 allocator 分配滚动弹幕到第 0 轨", () => {
    const allocator = new TrackAllocator({
      viewport: { width: 800, height: 400 },
      config,
    });
    const res = allocator.allocate(mk("a", 0), 0, 100, 24);
    expect(res).not.toBeNull();
    expect(res!.trackY).toBe(0);
  });

  it("两条接踵而至的滚动弹幕分配到不同轨道（垂直避让）", () => {
    const allocator = new TrackAllocator({
      viewport: { width: 800, height: 400 },
      config,
    });
    const a = allocator.allocate(mk("a", 0), 0, 200, 24);
    const b = allocator.allocate(mk("b", 100), 100, 200, 24);
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a!.trackY).not.toBe(b!.trackY);
  });

  it("同一条目第二次 allocate 返回原占用（持久状态，不跳轨）", () => {
    const allocator = new TrackAllocator({
      viewport: { width: 800, height: 400 },
      config,
    });
    const first = allocator.allocate(mk("a", 0), 0, 200, 24);
    const second = allocator.allocate(mk("a", 0), 200, 200, 24);
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(second!.trackY).toBe(first!.trackY);
    expect(second!.startTimeMs).toBe(first!.startTimeMs);
  });

  it("超过同屏上限的弹幕返回 null", () => {
    const tight = resolveDanmakuConfig({
      scrollDurationMs: 8000,
      maxOnScreen: 1,
      defaultFontSize: 24,
      trackGap: 4,
    });
    const allocator = new TrackAllocator({
      viewport: { width: 800, height: 400 },
      config: tight,
    });
    expect(allocator.allocate(mk("a", 0), 0, 100, 24)).not.toBeNull();
    expect(allocator.allocate(mk("b", 100), 100, 100, 24)).toBeNull();
  });

  it("顶部弹幕和底部弹幕轨道独立", () => {
    const allocator = new TrackAllocator({
      viewport: { width: 800, height: 400 },
      config,
    });
    const top = allocator.allocate(mk("t", 0, { mode: "top" }), 0, 200, 24);
    const bot = allocator.allocate(mk("b", 0, { mode: "bottom" }), 0, 200, 24);
    expect(top).not.toBeNull();
    expect(bot).not.toBeNull();
    expect(top!.trackY).toBeLessThan(bot!.trackY);
    // 滚动轨道使用独立计数；与 top/bottom 不冲突。
    const scroll = allocator.allocate(mk("s", 0), 0, 200, 24);
    expect(scroll).not.toBeNull();
  });

  it("seek 清空全部轨道占用", () => {
    const allocator = new TrackAllocator({
      viewport: { width: 800, height: 400 },
      config,
    });
    allocator.allocate(mk("a", 0), 0, 200, 24);
    allocator.seek(10_000);
    // seek 后 'a' 已被清除，效果上首次进入时间窗口重新分配，trackY 仍是 0。
    const r = allocator.allocate(mk("a", 10_000), 10_000, 200, 24);
    expect(r).not.toBeNull();
    expect(r!.trackY).toBe(0);
  });

  it("setMaxOnScreen 影响后续接纳判定", () => {
    const allocator = new TrackAllocator({
      viewport: { width: 800, height: 400 },
      config,
    });
    allocator.setMaxOnScreen(1);
    expect(allocator.allocate(mk("a", 0), 0, 100, 24)).not.toBeNull();
    expect(allocator.allocate(mk("b", 100), 100, 100, 24)).toBeNull();
  });

  it("setViewport 后已分配弹幕的 trackY 不变", () => {
    const allocator = new TrackAllocator({
      viewport: { width: 800, height: 400 },
      config,
    });
    const first = allocator.allocate(mk("a", 0), 0, 200, 24);
    allocator.setViewport({ width: 800, height: 600 });
    const second = allocator.allocate(mk("a", 0), 100, 200, 24);
    expect(second!.trackY).toBe(first!.trackY);
  });
});
