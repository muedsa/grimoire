import type { FilterChain } from "./filter";
import type { DanmakuMerger } from "./merger";
import type { TrackAllocator } from "./track-allocator";
import type {
  ActiveLayoutItem,
  ActiveLayoutSnapshot,
  DanmakuItem,
  ResolvedDanmakuConfig,
  TextMeasurer,
} from "./types";
import type { DanmakuStore } from "./store";

export interface DanmakuSchedulerOptions {
  store: DanmakuStore;
  filter: FilterChain;
  merger: DanmakuMerger;
  allocator: TrackAllocator;
  measurer: TextMeasurer;
  config: ResolvedDanmakuConfig;
}

interface MergeMetaEntry {
  // 此 layout id 对应的合并次数；用来侦测 mergeCount 变化触发 version+1。
  mergeCount: number;
}

// 串联 Store / Filter / Merger / Allocator → ActiveLayoutSnapshot。
// 不跑 RAF；外层由 time.ts / controller.ts 驱动 tick。
export class DanmakuScheduler {
  private store: DanmakuStore;
  private readonly filter: FilterChain;
  private readonly merger: DanmakuMerger;
  private readonly allocator: TrackAllocator;
  private measurer: TextMeasurer;
  private config: ResolvedDanmakuConfig;
  // 已被 scheduler 处理过的弹幕 id（无论入屏成功与否），避免重复评估。
  private readonly processed = new Set<string>();
  // 已生成 layout 节点对应的 mergeCount 状态。
  private readonly mergeMeta = new Map<string, MergeMetaEntry>();
  // 当前 layout 集合（按 id 字典序与 startTimeMs 升序输出）。
  private readonly active = new Map<string, ActiveLayoutItem>();
  private versionCounter = 0;
  // 集合签名：用于侦测"集合按 id 变化或 mergeCount 变化"。
  private lastSignature = "";

  constructor(options: DanmakuSchedulerOptions) {
    this.store = options.store;
    this.filter = options.filter;
    this.merger = options.merger;
    this.allocator = options.allocator;
    this.measurer = options.measurer;
    this.config = options.config;
  }

  setMeasurer(measurer: TextMeasurer): void {
    this.measurer = measurer;
    // 注入新测量器：对屏上弹幕重测宽度，保持 trackY、startTimeMs。
    for (const [id, layout] of this.active) {
      const measured = this.measurer.measureText(
        layout.text,
        layout.fontSize,
        layout.weight,
      );
      // 重新计算 endX：滚动 → 左侧出界点；fixed → 居中。
      const next: ActiveLayoutItem = {
        ...layout,
        width: measured.width,
        height: measured.height,
        endX: this.recalcEndX(layout, measured.width),
        startX: this.recalcStartX(layout, measured.width),
      };
      this.active.set(id, next);
    }
  }

  setConfig(config: ResolvedDanmakuConfig): void {
    this.config = config;
  }

  // 替换 store（setItems / clearItems 时被 controller 调用）。
  resetData(store: DanmakuStore): void {
    this.store = store;
    this.processed.clear();
    this.mergeMeta.clear();
    this.active.clear();
    this.merger.reset();
    this.allocator.seek(0);
  }

  // 重新评估屏上所有弹幕是否仍通过过滤；用于"立即生效"语义的过滤变更。
  refilterActive(): void {
    for (const [id] of this.active) {
      const raw = this.findRaw(id);
      if (raw && !this.filter.accept(raw)) {
        this.active.delete(id);
      }
    }
  }

  // 主入口：按当前时间产出 snapshot。
  tick(currentTimeMs: number): ActiveLayoutSnapshot {
    this.allocator.prune(currentTimeMs);
    this.evictExpiredActive(currentTimeMs);
    this.ingest(currentTimeMs);
    return this.buildSnapshot(currentTimeMs);
  }

  seek(currentTimeMs: number): ActiveLayoutSnapshot {
    this.processed.clear();
    this.mergeMeta.clear();
    this.active.clear();
    this.merger.reset();
    this.allocator.seek(currentTimeMs);
    // 重新走过去一段窗口内应该出现的弹幕（按时间正序入屏）。
    const t0 =
      currentTimeMs -
      Math.max(this.config.scrollDurationMs, this.config.fixedDurationMs);
    const candidates = this.store.slice(t0, currentTimeMs);
    for (const item of candidates) {
      this.evaluate(item, currentTimeMs);
    }
    return this.buildSnapshot(currentTimeMs);
  }

  // ingest：把"上次 tick 时刻 → 当前"之间到达的弹幕评估入屏。
  // 这里偷个懒：每次 tick 都把窗口范围内所有未 processed 的项跑一遍 evaluate。
  // evaluate 内部用 processed 去重，避免 O(n) × tick 频率的真重复劳动。
  private ingest(currentTimeMs: number): void {
    const t0 =
      currentTimeMs -
      Math.max(this.config.scrollDurationMs, this.config.fixedDurationMs);
    const candidates = this.store.slice(t0, currentTimeMs);
    for (const item of candidates) {
      if (this.processed.has(item.id)) continue;
      this.evaluate(item, currentTimeMs);
    }
  }

  private evaluate(item: DanmakuItem, currentTimeMs: number): void {
    this.processed.add(item.id);
    if (!this.filter.accept(item)) return;
    const mergeRes = this.merger.acquire(item, currentTimeMs);
    if (mergeRes.kind === "merged") {
      // 合并：更新代表的 mergeCount。
      const repId = mergeRes.representativeId;
      const meta = this.mergeMeta.get(repId);
      if (meta) {
        meta.mergeCount = mergeRes.mergeCount;
        const layout = this.active.get(repId);
        if (layout && layout.mergeCount !== mergeRes.mergeCount) {
          this.active.set(repId, {
            ...layout,
            mergeCount: mergeRes.mergeCount,
          });
        }
      }
      return;
    }
    // 新代表：测量 + 分配轨道。
    const fontSize =
      (item.fontSize ?? this.config.defaultFontSize) * this.config.fontScale;
    const weight = item.weight ?? "normal";
    const measured = this.measurer.measureText(item.text, fontSize, weight);
    const allocated = this.allocator.allocate(
      item,
      currentTimeMs,
      measured.width,
      measured.height,
    );
    if (!allocated) return;

    const layout: ActiveLayoutItem = {
      id: mergeRes.representativeId,
      text: item.text,
      color: item.color ?? "#ffffff",
      fontSize,
      weight,
      borderColor: item.borderColor,
      mode: allocated.mode,
      width: measured.width,
      height: measured.height,
      trackY: allocated.trackY,
      startTimeMs: allocated.startTimeMs,
      durationMs: allocated.durationMs,
      startX: allocated.startX,
      endX: allocated.endX,
      mergeCount: mergeRes.mergeCount,
    };
    this.active.set(layout.id, layout);
    this.mergeMeta.set(layout.id, { mergeCount: 1 });
  }

  private evictExpiredActive(currentTimeMs: number): void {
    for (const [id, layout] of this.active) {
      if (currentTimeMs >= layout.startTimeMs + layout.durationMs) {
        this.active.delete(id);
        this.mergeMeta.delete(id);
      }
    }
  }

  private buildSnapshot(currentTimeMs: number): ActiveLayoutSnapshot {
    const items = Array.from(this.active.values()).sort(
      (a, b) => a.startTimeMs - b.startTimeMs,
    );
    const signature = items.map((it) => `${it.id}:${it.mergeCount}`).join("|");
    if (signature !== this.lastSignature) {
      this.versionCounter += 1;
      this.lastSignature = signature;
    }
    return { timeMs: currentTimeMs, items, version: this.versionCounter };
  }

  private findRaw(id: string): DanmakuItem | undefined {
    // 因为 store 不直接按 id 查，这里线性扫描 active 时间窗内的 store 子集。
    // 用 active 节点的 startTimeMs 作为 raw 的 time 参考。
    const ref = this.active.get(id);
    if (!ref) return undefined;
    const candidates = this.store.slice(
      ref.startTimeMs - 1,
      ref.startTimeMs + 1,
    );
    return candidates.find((it) => it.id === id);
  }

  private recalcStartX(layout: ActiveLayoutItem, _width: number): number {
    // 滚动弹幕的入屏 startX 不依赖宽度，沿用旧值。
    return layout.startX;
  }

  private recalcEndX(layout: ActiveLayoutItem, width: number): number {
    if (layout.mode === "scroll") {
      // 入屏端点是负 (width + leftInset)；这里宽度变化重新算出口点。
      return -width;
    }
    return layout.endX;
  }
}
