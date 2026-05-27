import { describe, expect, it } from "vitest";
import { FilterChain } from "../../src/core/filter";
import type { DanmakuItem } from "../../src/core/types";

const mk = (
  id: string,
  text: string,
  extra: Partial<DanmakuItem> = {},
): DanmakuItem => ({ id, time: 0, text, ...extra });

describe("FilterChain", () => {
  it("默认全部通过", () => {
    const f = new FilterChain();
    expect(f.accept(mk("a", "hello"))).toBe(true);
  });

  it("blockedKeywords 命中 → reject（包含匹配）", () => {
    const f = new FilterChain();
    f.setBlockedKeywords(["广告"]);
    expect(f.accept(mk("a", "这是一条广告弹幕"))).toBe(false);
    expect(f.accept(mk("b", "这是一条正常弹幕"))).toBe(true);
  });

  it("blockedPatterns 命中 → reject（正则）", () => {
    const f = new FilterChain();
    f.setBlockedPatterns([/^\d+$/]);
    expect(f.accept(mk("a", "123"))).toBe(false);
    expect(f.accept(mk("b", "abc"))).toBe(true);
  });

  it("blockedUserIds 命中 → reject", () => {
    const f = new FilterChain();
    f.setBlockedUserIds(["u1"]);
    expect(f.accept(mk("a", "x", { userId: "u1" }))).toBe(false);
    expect(f.accept(mk("b", "x", { userId: "u2" }))).toBe(true);
    expect(f.accept(mk("c", "x"))).toBe(true);
  });

  it("blockedModes 命中 → reject", () => {
    const f = new FilterChain();
    f.setBlockedModes(["top"]);
    expect(f.accept(mk("a", "x", { mode: "top" }))).toBe(false);
    expect(f.accept(mk("b", "x", { mode: "scroll" }))).toBe(true);
    expect(f.accept(mk("c", "x"))).toBe(true);
  });

  it("自定义 filter 返回 false → reject；返回 null 等价于不设", () => {
    const f = new FilterChain();
    f.setFilter((it) => !it.text.startsWith("__"));
    expect(f.accept(mk("a", "__hidden"))).toBe(false);
    expect(f.accept(mk("b", "visible"))).toBe(true);

    f.setFilter(null);
    expect(f.accept(mk("c", "__hidden"))).toBe(true);
  });

  it("多过滤源任一 reject → reject（短路）", () => {
    const f = new FilterChain();
    f.setBlockedKeywords(["bad"]);
    f.setBlockedUserIds(["u1"]);
    expect(f.accept(mk("a", "bad", { userId: "u2" }))).toBe(false);
    expect(f.accept(mk("b", "good", { userId: "u1" }))).toBe(false);
    expect(f.accept(mk("c", "good", { userId: "u2" }))).toBe(true);
  });
});
