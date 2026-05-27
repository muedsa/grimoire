import { describe, expect, it } from "vitest";
import { DanmakuMerger } from "../../src/core/merger";
import type { DanmakuItem } from "../../src/core/types";

const mk = (id: string, text: string, time: number): DanmakuItem => ({
  id,
  text,
  time,
});

describe("DanmakuMerger", () => {
  it("默认 disabled，所有弹幕原样通过且 mergeCount=1", () => {
    const m = new DanmakuMerger();
    const r1 = m.acquire(mk("a", "hi", 0), 0);
    const r2 = m.acquire(mk("b", "hi", 100), 100);
    expect(r1).toEqual({ kind: "new", representativeId: "a", mergeCount: 1 });
    expect(r2).toEqual({ kind: "new", representativeId: "b", mergeCount: 1 });
  });

  it("enabled 后，窗口内同 text 第二条起被合并到代表", () => {
    const m = new DanmakuMerger();
    m.configure({ enabled: true, windowMs: 5000, minCount: 3 });

    const r1 = m.acquire(mk("a", "666", 0), 0);
    const r2 = m.acquire(mk("b", "666", 500), 500);
    const r3 = m.acquire(mk("c", "666", 1000), 1000);

    expect(r1.kind).toBe("new");
    expect(r1.representativeId).toBe("a");
    expect(r1.mergeCount).toBe(1);

    expect(r2.kind).toBe("merged");
    expect(r2.representativeId).toBe("a");
    expect(r2.mergeCount).toBe(2);

    expect(r3.kind).toBe("merged");
    expect(r3.representativeId).toBe("a");
    expect(r3.mergeCount).toBe(3);
  });

  it("窗口过期后同 text 弹幕作为新代表", () => {
    const m = new DanmakuMerger();
    m.configure({ enabled: true, windowMs: 5000, minCount: 3 });

    m.acquire(mk("a", "666", 0), 0);
    // 窗口 5000ms，到 6000 时已经过期，currentTimeMs=6000 时调用 acquire 会触发清理。
    const r = m.acquire(mk("b", "666", 6000), 6000);
    expect(r).toEqual({ kind: "new", representativeId: "b", mergeCount: 1 });
  });

  it("configure 关闭后清空内部状态", () => {
    const m = new DanmakuMerger();
    m.configure({ enabled: true, windowMs: 5000, minCount: 3 });
    m.acquire(mk("a", "x", 0), 0);

    m.configure({ enabled: false });
    const r = m.acquire(mk("b", "x", 100), 100);
    expect(r).toEqual({ kind: "new", representativeId: "b", mergeCount: 1 });
  });

  it("不同 text 互不合并", () => {
    const m = new DanmakuMerger();
    m.configure({ enabled: true, windowMs: 5000, minCount: 3 });
    expect(m.acquire(mk("a", "hi", 0), 0).kind).toBe("new");
    expect(m.acquire(mk("b", "yo", 100), 100).kind).toBe("new");
  });
});
