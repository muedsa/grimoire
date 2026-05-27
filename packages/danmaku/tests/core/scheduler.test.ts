import { describe, expect, it } from "vitest";
import { resolveDanmakuConfig } from "../../src/core/config";
import { DanmakuScheduler } from "../../src/core/scheduler";
import { EstimateTextMeasurer } from "../../src/core/measurer";
import { DanmakuStore } from "../../src/core/store";
import type { DanmakuItem } from "../../src/core/types";
import { FilterChain } from "../../src/core/filter";
import { DanmakuMerger } from "../../src/core/merger";
import { TrackAllocator } from "../../src/core/track-allocator";

const config = resolveDanmakuConfig({
  scrollDurationMs: 8000,
  fixedDurationMs: 4000,
  maxOnScreen: 10,
  defaultFontSize: 24,
  trackGap: 4,
});

function mkScheduler(items: DanmakuItem[]) {
  const store = new DanmakuStore(items);
  const filter = new FilterChain();
  const merger = new DanmakuMerger();
  const allocator = new TrackAllocator({
    viewport: { width: 800, height: 400 },
    config,
  });
  const measurer = new EstimateTextMeasurer();
  return new DanmakuScheduler({ store, filter, merger, allocator, measurer, config });
}

describe("DanmakuScheduler", () => {
  it("空集合输出空 snapshot", () => {
    const s = mkScheduler([]);
    const snap = s.tick(0);
    expect(snap.items).toEqual([]);
    expect(snap.version).toBe(0);
  });

  it("到达时间的弹幕进入 snapshot", () => {
    const s = mkScheduler([{ id: "a", time: 100, text: "hi" }]);
    expect(s.tick(50).items).toEqual([]);
    const snap = s.tick(100);
    expect(snap.items.map((it) => it.id)).toEqual(["a"]);
  });

  it("过期弹幕从 snapshot 移除", () => {
    const s = mkScheduler([{ id: "a", time: 0, text: "hi" }]);
    const snap1 = s.tick(0);
    expect(snap1.items.map((it) => it.id)).toEqual(["a"]);
    const snap2 = s.tick(9000); // 超过 scrollDurationMs=8000
    expect(snap2.items).toEqual([]);
  });

  it("snapshot.version 仅在集合变化时 +1", () => {
    const s = mkScheduler([{ id: "a", time: 100, text: "hi" }]);
    expect(s.tick(50).version).toBe(0);
    expect(s.tick(60).version).toBe(0);
    const snap = s.tick(100);
    expect(snap.version).toBeGreaterThan(0);
    expect(s.tick(101).version).toBe(snap.version);
  });

  it("seek 清空轨道并按目标时间重建", () => {
    const s = mkScheduler([
      { id: "a", time: 0, text: "hi" },
      { id: "b", time: 10_000, text: "yo" },
    ]);
    s.tick(0);
    const snap = s.seek(10_000);
    expect(snap.items.map((it) => it.id)).toEqual(["b"]);
  });
});
