import type { DanmakuItem, DanmakuMode } from "./types";

// 组合多个过滤源的链；任一源 reject 整体 reject。
// 顺序按设计文档 9.1：keywords → patterns → userIds → modes → 自定义 filter。
export class FilterChain {
  private blockedKeywords: string[] = [];
  private blockedPatterns: RegExp[] = [];
  private blockedUserIds: Set<string> = new Set();
  private blockedModes: Set<DanmakuMode> = new Set();
  private customFilter: ((item: DanmakuItem) => boolean) | null = null;

  setBlockedKeywords(words: readonly string[]): void {
    // 复制一份避免外部数组被修改影响过滤行为。
    this.blockedKeywords = words.slice();
  }

  setBlockedPatterns(patterns: readonly RegExp[]): void {
    this.blockedPatterns = patterns.slice();
  }

  setBlockedUserIds(ids: readonly string[]): void {
    this.blockedUserIds = new Set(ids);
  }

  setBlockedModes(modes: readonly DanmakuMode[]): void {
    this.blockedModes = new Set(modes);
  }

  setFilter(predicate: ((item: DanmakuItem) => boolean) | null): void {
    this.customFilter = predicate;
  }

  accept(item: DanmakuItem): boolean {
    if (this.blockedKeywords.length > 0) {
      for (const word of this.blockedKeywords) {
        if (item.text.includes(word)) return false;
      }
    }
    if (this.blockedPatterns.length > 0) {
      for (const pattern of this.blockedPatterns) {
        if (pattern.test(item.text)) return false;
      }
    }
    if (item.userId !== undefined && this.blockedUserIds.has(item.userId)) {
      return false;
    }
    if (item.mode !== undefined && this.blockedModes.has(item.mode)) {
      return false;
    }
    if (this.customFilter !== null && !this.customFilter(item)) {
      return false;
    }
    return true;
  }
}
