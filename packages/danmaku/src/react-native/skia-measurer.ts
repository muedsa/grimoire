import type { SkFont, SkTypeface } from "@shopify/react-native-skia";
import { Skia } from "@shopify/react-native-skia";
import type { DanmakuWeight, TextMeasurer } from "../core";
import { Platform } from "react-native";

// 基于 RN-Skia 的 TextMeasurer 实现；按 (fontSize, weight) 维护 SkFont 对象池。
// 同一 SkTypeface 派生出多种字号的 SkFont，避免重复创建。
export class SkiaTextMeasurer implements TextMeasurer {
  // 保持原始 SkFont 的引用，防止 WASM GC 回收导致其内部 typeface 指针失效。
  readonly baseFont: SkFont;
  // 原始字号，用于 web 端缩放测量与渲染。
  readonly baseFontSize: number;
  // 从 baseFont 中提取的 typeface，原生端用于创建不同字号的 SkFont。
  private readonly typeface: SkTypeface;
  // (fontSize|weight) → SkFont。
  private readonly fontPool = new Map<string, SkFont>();
  // (text|fontSize|weight) → 测量结果。
  private readonly measureCache = new Map<
    string,
    { width: number; height: number }
  >();

  constructor(baseFont: SkFont) {
    this.baseFont = baseFont;
    // 从 SkFont 对象上读取其字号；RN-Skia 的 SkFont 提供 getSize() 方法返回创建时的字号。
    this.baseFontSize = (
      baseFont as unknown as { getSize(): number }
    ).getSize();
    this.typeface = baseFont.getTypeface()!;
  }

  measureText(
    text: string,
    fontSize: number,
    weight: DanmakuWeight,
  ): { width: number; height: number } {
    const cacheKey = `${text}|${fontSize}|${weight}`;
    const hit = this.measureCache.get(cacheKey);
    if (hit) return hit;
    const font = this.fontFor(fontSize, weight);
    let width: number;
    if (Platform.OS === "web") {
      // RN-Skia web 端的 Font.measureText 存在兼容性问题，改用 getGlyphIDs + getGlyphWidths 累加的方式测量文本宽度。
      width = this.measureTextWidthWebSafe(font, text);
      // web 端统一使用 baseFont 测量，按字号比例缩放宽度以适配不同字号。
      if (fontSize !== this.baseFontSize) {
        width *= fontSize / this.baseFontSize;
      }
    } else {
      width = font.measureText(text).width;
    }
    const result = { width, height: fontSize };
    this.measureCache.set(cacheKey, result);
    return result;
  }

  private measureTextWidthWebSafe(font: SkFont, text: string): number {
    // 获取每个字符的内部 ID
    const glyphIds = font.getGlyphIDs(text);
    // 获取每个 ID 对应的宽度
    const widths = font.getGlyphWidths(glyphIds);
    // 累加所有宽度得到文本总宽度
    return widths.reduce((acc, width) => acc + width, 0);
  }

  fontFor(fontSize: number, weight: DanmakuWeight): SkFont {
    const key = `${fontSize}|${weight}`;
    const hit = this.fontPool.get(key);
    if (hit) return hit;

    if (Platform.OS === "web") {
      // CanvasKit WASM 中，font.getTypeface() 返回的是借用指针（non-owning reference），
      // 无法传递给 Skia.Font() 构造函数（要求智能指针）。
      // 因此 web 端统一返回 baseFont，由调用方（measureText / DanmakuTextNode）
      // 通过 scale 方式适配不同字号。
      this.fontPool.set(key, this.baseFont);
      return this.baseFont;
    }

    // RN-Skia 的 Font 构造不区分 weight，weight 视觉效果由 typeface 决定；
    // 此处仍按 key 缓存，将来支持 multi-typeface 时复用同一接口。
    const font = Skia.Font(this.typeface, fontSize);
    this.fontPool.set(key, font);
    return font;
  }
}
