import { describe, expect, it } from "vitest";
import { DanmakuStore } from "../../src/core/store";
import type { DanmakuItem } from "../../src/core/types";

const mk = (id: string, time: number, text = id): DanmakuItem => ({
  id,
  time,
  text,
});

describe("DanmakuStore", () => {
  it("初始化按 time 升序排列", () => {
    const s = new DanmakuStore([mk("c", 300), mk("a", 100), mk("b", 200)]);
    expect(s.list().map((it) => it.id)).toEqual(["a", "b", "c"]);
  });

  it("append 按 id 去重，后到的同 id 被丢弃", () => {
    const s = new DanmakuStore([mk("a", 100)]);
    s.append([mk("a", 999, "duplicate"), mk("b", 200)]);
    const list = s.list();
    expect(list.map((it) => it.id)).toEqual(["a", "b"]);
    expect(list[0]!.time).toBe(100);
    expect(list[0]!.text).toBe("a");
  });

  it("append 维持按 time 升序", () => {
    const s = new DanmakuStore([mk("a", 100), mk("c", 300)]);
    s.append([mk("b", 200), mk("d", 400)]);
    expect(s.list().map((it) => it.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("slice(t0, t1) 用二分查找返回 [t0, t1] 内的子集（左闭右闭）", () => {
    const s = new DanmakuStore([
      mk("a", 100),
      mk("b", 200),
      mk("c", 300),
      mk("d", 400),
    ]);
    expect(s.slice(150, 350).map((it) => it.id)).toEqual(["b", "c"]);
    expect(s.slice(100, 400).map((it) => it.id)).toEqual(["a", "b", "c", "d"]);
    expect(s.slice(500, 600)).toEqual([]);
  });

  it("setItems 完全替换并重新排序", () => {
    const s = new DanmakuStore([mk("a", 100)]);
    s.setItems([mk("z", 300), mk("y", 200)]);
    expect(s.list().map((it) => it.id)).toEqual(["y", "z"]);
  });

  it("clear 清空", () => {
    const s = new DanmakuStore([mk("a", 100)]);
    s.clear();
    expect(s.list()).toEqual([]);
  });

  it("has(id) 检查存在性", () => {
    const s = new DanmakuStore([mk("a", 100)]);
    expect(s.has("a")).toBe(true);
    expect(s.has("z")).toBe(false);
  });
});
