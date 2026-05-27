import type { DanmakuItem, DanmakuMergeConfig } from "./types";

// 合并结果。kind === 'new' 表示需要正常分配轨道；'merged' 表示被合并到代表，不分配。
export type MergeResult =
  | { kind: "new"; representativeId: string; mergeCount: 1 }
  | { kind: "merged"; representativeId: string; mergeCount: number };

interface RepresentativeRecord {
  id: string;
  startTimeMs: number;
  mergeCount: number;
}

// 同文本合并器；在 windowMs 时间窗内对同 text 弹幕只显示一条"代表"，
// 后到的同 text 累加 mergeCount。设计文档 9.2。
export class DanmakuMerger {
  private enabled = false;
  private windowMs = 5000;
  // 维护 text → representative。
  private readonly representatives = new Map<string, RepresentativeRecord>();

  configure(config: DanmakuMergeConfig): void {
    this.enabled = config.enabled;
    if (config.windowMs !== undefined) {
      this.windowMs = config.windowMs;
    }
    if (!config.enabled) {
      // 关闭时清空，后续重新开启从空状态起步。
      this.representatives.clear();
    }
  }

  reset(): void {
    this.representatives.clear();
  }

  // 输入一条已经通过过滤的弹幕，决定是否分配为代表 / 合并到现有代表。
  acquire(item: DanmakuItem, currentTimeMs: number): MergeResult {
    if (!this.enabled) {
      return { kind: "new", representativeId: item.id, mergeCount: 1 };
    }

    this.evict(currentTimeMs);

    const existing = this.representatives.get(item.text);
    if (existing) {
      existing.mergeCount += 1;
      return {
        kind: "merged",
        representativeId: existing.id,
        mergeCount: existing.mergeCount,
      };
    }

    // 新代表登记。代表的 startTimeMs 以 item.time 为锚（被合并的窗口从此弹幕开始算）。
    this.representatives.set(item.text, {
      id: item.id,
      startTimeMs: item.time,
      mergeCount: 1,
    });
    return { kind: "new", representativeId: item.id, mergeCount: 1 };
  }

  // 清理已经超过窗口的代表，让后续同 text 可以作为新代表。
  private evict(currentTimeMs: number): void {
    if (this.representatives.size === 0) return;
    const cutoff = currentTimeMs - this.windowMs;
    for (const [text, record] of this.representatives) {
      if (record.startTimeMs < cutoff) {
        this.representatives.delete(text);
      }
    }
  }
}
