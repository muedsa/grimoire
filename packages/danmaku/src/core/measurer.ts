import type { DanmakuWeight, TextMeasurer } from "./types";

// 估算策略：CJK 字符（char code > 0xff）按 1 倍字号；ASCII 按 0.56 倍字号。
// bold 整体放大 6%。这与浏览器 / Skia 真实测量有偏差，仅作为没注入真实 measurer 时的兜底。
const CJK_FACTOR = 1;
const ASCII_FACTOR = 0.56;
const BOLD_FACTOR = 1.06;

const DEFAULT_CACHE_SIZE = 4096;

interface CacheEntry {
  width: number;
  height: number;
}

export interface EstimateTextMeasurerOptions {
  cacheSize?: number;
}

// 兜底测量器；core 在未注入真实 measurer 时使用此实例。
// 缓存按 (text|fontSize|weight) 拼接为 key，LRU 淘汰。
export class EstimateTextMeasurer implements TextMeasurer {
  private readonly cacheSize: number;
  // 用 Map 自身的插入顺序作为 LRU 序，命中时先 delete 再 set 移到末尾。
  private readonly cache = new Map<string, CacheEntry>();

  constructor(options?: EstimateTextMeasurerOptions) {
    this.cacheSize = options?.cacheSize ?? DEFAULT_CACHE_SIZE;
  }

  measureText(
    text: string,
    fontSize: number,
    weight: DanmakuWeight,
  ): CacheEntry {
    const key = `${text}|${fontSize}|${weight}`;
    const existing = this.cache.get(key);
    if (existing) {
      // 命中后移到末尾，更新 LRU 顺序。
      this.cache.delete(key);
      this.cache.set(key, existing);
      return existing;
    }

    let baseWidth = 0;
    for (const char of text) {
      const cp = char.codePointAt(0) ?? 0;
      baseWidth += cp > 0xff ? CJK_FACTOR * fontSize : ASCII_FACTOR * fontSize;
    }
    const width = Math.ceil(
      weight === "bold" ? baseWidth * BOLD_FACTOR : baseWidth,
    );
    const entry: CacheEntry = { width, height: fontSize };

    if (this.cache.size >= this.cacheSize) {
      // 删掉最老一条（Map 的第一个 key）。
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) {
        this.cache.delete(oldest);
      }
    }
    this.cache.set(key, entry);
    return entry;
  }
}
