import { describe, expect, it, vi } from "vitest";
import { DanmakuController } from "../../src/core/controller";
import type { DanmakuItem } from "../../src/core/types";

const items: DanmakuItem[] = [
  { id: "a", time: 0, text: "hi" },
  { id: "b", time: 500, text: "yo" },
  { id: "c", time: 1000, text: "广告内容" },
];

const baseOptions = {
  viewport: { width: 800, height: 400 },
};

describe("DanmakuController", () => {
  it("初始化后 tick 输出 ActiveLayoutSnapshot", () => {
    const c = new DanmakuController({ ...baseOptions, items });
    const snap = c.tick(0);
    expect(snap.items.map((it) => it.id)).toContain("a");
  });

  it("append 后的弹幕在当前时间窗口内立即可见", () => {
    const c = new DanmakuController({ ...baseOptions, items });
    c.tick(5000); // 此时 a, b 已过期，c 仍在
    c.append([{ id: "live", time: 5000, text: "hi-live" }]);
    const snap = c.tick(5000);
    expect(snap.items.map((it) => it.id)).toContain("live");
  });

  it("setBlockedKeywords 立即影响屏上弹幕", () => {
    const c = new DanmakuController({ ...baseOptions, items });
    expect(c.tick(1000).items.map((it) => it.id)).toContain("c");
    c.setBlockedKeywords(["广告"]);
    expect(c.tick(1000).items.map((it) => it.id)).not.toContain("c");
  });

  it("setVisible(false) 清屏，恢复后重建", () => {
    const c = new DanmakuController({ ...baseOptions, items });
    c.tick(0);
    c.setVisible(false);
    expect(c.tick(0).items).toEqual([]);
    c.setVisible(true);
    expect(c.tick(0).items.length).toBeGreaterThan(0);
  });

  it("pause 后 tick 仍返回当前帧但不前进", () => {
    const c = new DanmakuController({ ...baseOptions, items });
    c.tick(0);
    c.pause();
    const snap = c.tick(0);
    // pause 行为：snapshot 保持上次帧，items 不变。
    expect(snap.items.length).toBeGreaterThan(0);
  });

  it("seek 跳到目标时间立即重建当前帧", () => {
    const c = new DanmakuController({ ...baseOptions, items });
    c.tick(0);
    const snap = c.seek(1000);
    expect(snap.items.map((it) => it.id)).toContain("c");
  });

  it("on('layout') 在 snapshot.version 变化时触发", () => {
    const c = new DanmakuController({ ...baseOptions, items });
    const handler = vi.fn();
    c.on("layout", handler);
    c.tick(0);
    expect(handler).toHaveBeenCalled();
  });

  it("setMeasurer 注入后对屏上弹幕重测宽度", () => {
    const c = new DanmakuController({ ...baseOptions, items });
    const snap1 = c.tick(0);
    const a1 = snap1.items.find((it) => it.id === "a")!;

    c.setMeasurer({
      measureText: () => ({ width: 9999, height: 24 }),
    });
    const snap2 = c.tick(0);
    const a2 = snap2.items.find((it) => it.id === "a")!;
    expect(a2.width).toBe(9999);
    expect(a2.trackY).toBe(a1.trackY); // trackY 不变
  });

  it("destroy 后再 tick 是 noop（不抛错）", () => {
    const c = new DanmakuController({ ...baseOptions, items });
    c.destroy();
    expect(() => c.tick(0)).not.toThrow();
  });
});
