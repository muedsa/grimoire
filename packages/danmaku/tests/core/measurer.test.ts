import { describe, expect, it } from "vitest";
import { EstimateTextMeasurer } from "../../src/core/measurer";

describe("EstimateTextMeasurer", () => {
  const m = new EstimateTextMeasurer();

  it("ASCII 字符按约 0.56 倍字号估算宽度", () => {
    const r = m.measureText("hello", 20, "normal");
    // 5 个 ASCII × 0.56 × 20 = 56
    expect(r.width).toBeGreaterThanOrEqual(50);
    expect(r.width).toBeLessThanOrEqual(70);
    expect(r.height).toBe(20);
  });

  it("CJK 字符按约 1 倍字号估算宽度", () => {
    const r = m.measureText("弹幕", 24, "normal");
    expect(r.width).toBeGreaterThanOrEqual(40);
    expect(r.width).toBeLessThanOrEqual(60);
    expect(r.height).toBe(24);
  });

  it("bold 字体比 normal 略宽", () => {
    const normal = m.measureText("HELLO", 20, "normal");
    const bold = m.measureText("HELLO", 20, "bold");
    expect(bold.width).toBeGreaterThan(normal.width);
  });

  it("同样输入命中缓存返回同对象引用", () => {
    const a = m.measureText("缓存测试", 24, "normal");
    const b = m.measureText("缓存测试", 24, "normal");
    expect(a).toBe(b);
  });

  it("缓存达到上限后会淘汰旧记录", () => {
    const limited = new EstimateTextMeasurer({ cacheSize: 2 });
    const r1 = limited.measureText("a", 20, "normal");
    limited.measureText("b", 20, "normal");
    limited.measureText("c", 20, "normal");
    const r1again = limited.measureText("a", 20, "normal");
    // 命中淘汰后 "a" 应该被重新计算，所以是新对象。
    expect(r1again).not.toBe(r1);
    expect(r1again.width).toBe(r1.width);
  });
});
