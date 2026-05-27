import type { DanmakuItem } from "./types";

// 维护按 time 升序的弹幕数组 + id → item 去重 Map。
// append 用二分定位插入点；slice 用二分查找上下界。
export class DanmakuStore {
  private items: DanmakuItem[] = [];
  private readonly index = new Map<string, DanmakuItem>();

  constructor(initial?: DanmakuItem[]) {
    if (initial && initial.length > 0) {
      this.setItems(initial);
    }
  }

  // 整体替换：清空索引并按 time 排序。
  setItems(items: DanmakuItem[]): void {
    this.items = [];
    this.index.clear();
    const seen = new Set<string>();
    for (const item of items) {
      // 输入数组内部 id 重复时保留第一次出现的。
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      this.items.push(item);
      this.index.set(item.id, item);
    }
    this.items.sort((a, b) => a.time - b.time);
  }

  // 增量追加：按 time 二分插入；已存在 id 静默丢弃。
  append(items: DanmakuItem[]): void {
    for (const item of items) {
      if (this.index.has(item.id)) continue;
      const insertAt = this.lowerBound(item.time);
      this.items.splice(insertAt, 0, item);
      this.index.set(item.id, item);
    }
  }

  clear(): void {
    this.items = [];
    this.index.clear();
  }

  has(id: string): boolean {
    return this.index.has(id);
  }

  list(): readonly DanmakuItem[] {
    return this.items;
  }

  // 返回 time ∈ [t0, t1] 的子集（左闭右闭）。
  slice(t0: number, t1: number): DanmakuItem[] {
    const start = this.lowerBound(t0);
    const end = this.upperBound(t1);
    return this.items.slice(start, end);
  }

  // 二分：第一个 time >= target 的下标。
  private lowerBound(target: number): number {
    let low = 0;
    let high = this.items.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (this.items[mid]!.time < target) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    return low;
  }

  // 二分：第一个 time > target 的下标。
  private upperBound(target: number): number {
    let low = 0;
    let high = this.items.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (this.items[mid]!.time <= target) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    return low;
  }
}
