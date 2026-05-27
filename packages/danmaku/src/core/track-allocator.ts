import type {
  DanmakuItem,
  DanmakuMode,
  DanmakuViewport,
  ResolvedDanmakuConfig,
} from "./types";

// 已分配条目；同 id 二次 allocate 直接返回已有记录（持久轨道）。
export interface AllocatedDanmaku {
  id: string;
  mode: DanmakuMode;
  trackY: number;
  startTimeMs: number;
  durationMs: number;
  startX: number;
  endX: number;
  width: number;
  height: number;
  // 弹幕尾部完全离开屏幕的时间，仅滚动弹幕使用；top/bottom 用 startTime + durationMs。
  tailLeavesAtMs: number;
}

export interface TrackAllocatorOptions {
  viewport: DanmakuViewport;
  config: ResolvedDanmakuConfig;
}

// 跨 tick 保留轨道占用状态的轨道分配器（设计文档第 8 节）。
// 不计算实时 x：渲染层从 (startX, endX, startTimeMs, durationMs) + clock 派生。
export class TrackAllocator {
  private viewport: DanmakuViewport;
  private config: ResolvedDanmakuConfig;
  private maxOnScreen: number;
  // id → 已分配条目；用作"持久状态"+"同 id 复用"。
  private readonly assigned = new Map<string, AllocatedDanmaku>();
  // 滚动 / 顶部 / 底部三类轨道各自的最近一次占用（按 trackIndex 索引）。
  private scrollTracks: (AllocatedDanmaku | null)[] = [];
  private topTracks: (AllocatedDanmaku | null)[] = [];
  private bottomTracks: (AllocatedDanmaku | null)[] = [];

  constructor(options: TrackAllocatorOptions) {
    this.viewport = options.viewport;
    this.config = options.config;
    this.maxOnScreen = options.config.maxOnScreen;
    this.rebuildTrackPools();
  }

  setViewport(viewport: DanmakuViewport): void {
    this.viewport = viewport;
    this.rebuildTrackPools();
  }

  setConfig(config: ResolvedDanmakuConfig): void {
    this.config = config;
    this.rebuildTrackPools();
  }

  setMaxOnScreen(n: number): void {
    this.maxOnScreen = Math.max(1, Math.floor(n));
  }

  // 清空所有占用，调用方应在 seek 后调用。
  seek(_timeMs: number): void {
    this.assigned.clear();
    this.scrollTracks.fill(null);
    this.topTracks.fill(null);
    this.bottomTracks.fill(null);
  }

  // 返回当前已激活的所有弹幕；调用方按时间过滤。
  list(): readonly AllocatedDanmaku[] {
    return Array.from(this.assigned.values());
  }

  // 回收已过期的占用（已 active 但生命周期结束）。
  prune(currentTimeMs: number): void {
    for (const [id, allocated] of this.assigned) {
      if (currentTimeMs >= allocated.tailLeavesAtMs) {
        this.assigned.delete(id);
        this.releaseFromTrack(allocated);
      }
    }
  }

  // 尝试为 item 分配轨道；返回已分配条目或 null（被同屏上限拒绝）。
  allocate(
    item: DanmakuItem,
    currentTimeMs: number,
    width: number,
    height: number,
  ): AllocatedDanmaku | null {
    // 持久轨道：同 id 重复 allocate 返回原占用。
    const existing = this.assigned.get(item.id);
    if (existing) return existing;

    // 同屏上限判定（用 active 总数，已过期的应由 prune 提前清理）。
    if (this.assigned.size >= this.maxOnScreen) return null;

    const mode: DanmakuMode = item.mode ?? "scroll";
    const lineHeight = this.lineHeight(height);

    if (mode === "top" || mode === "bottom") {
      return this.allocateFixed(item, mode, currentTimeMs, width, height, lineHeight);
    }
    return this.allocateScroll(item, currentTimeMs, width, height, lineHeight);
  }

  // 滚动弹幕：找一条"尾部已离开右边界 + 不会追上前车"的轨道。
  private allocateScroll(
    item: DanmakuItem,
    currentTimeMs: number,
    width: number,
    height: number,
    lineHeight: number,
  ): AllocatedDanmaku | null {
    const trackCount = this.scrollTracks.length;
    if (trackCount === 0) return null;
    const durationMs = this.scrollDurationMs();
    const startX = this.viewport.width - this.config.safeAreaInsets.right;
    const endX = -width - this.config.safeAreaInsets.left;
    const tailLeavesAtMs = currentTimeMs + durationMs;

    for (let i = 0; i < trackCount; i += 1) {
      const prev = this.scrollTracks[i] ?? null;
      if (prev === null || this.canEnterScrollTrack(prev, item.time, width)) {
        const y = this.scrollTrackY(i, lineHeight);
        const allocated: AllocatedDanmaku = {
          id: item.id,
          mode: "scroll",
          trackY: y,
          startTimeMs: item.time,
          durationMs,
          startX,
          endX,
          width,
          height,
          tailLeavesAtMs,
        };
        this.scrollTracks[i] = allocated;
        this.assigned.set(item.id, allocated);
        return allocated;
      }
    }
    return null;
  }

  // 固定弹幕：找一条尚未被占用 / 已过期的顶（底）部轨道。
  private allocateFixed(
    item: DanmakuItem,
    mode: "top" | "bottom",
    currentTimeMs: number,
    width: number,
    height: number,
    lineHeight: number,
  ): AllocatedDanmaku | null {
    const pool = mode === "top" ? this.topTracks : this.bottomTracks;
    const trackCount = pool.length;
    if (trackCount === 0) return null;
    const durationMs = this.fixedDurationMs();
    const tailLeavesAtMs = item.time + durationMs;

    for (let i = 0; i < trackCount; i += 1) {
      const prev = pool[i] ?? null;
      if (prev === null || currentTimeMs >= prev.tailLeavesAtMs) {
        const y =
          mode === "top"
            ? this.topTrackY(i, lineHeight)
            : this.bottomTrackY(i, lineHeight);
        const centerX =
          this.config.safeAreaInsets.left +
          (this.activeWidth() - width) / 2;
        const allocated: AllocatedDanmaku = {
          id: item.id,
          mode,
          trackY: y,
          startTimeMs: item.time,
          durationMs,
          startX: centerX,
          endX: centerX,
          width,
          height,
          tailLeavesAtMs,
        };
        pool[i] = allocated;
        this.assigned.set(item.id, allocated);
        return allocated;
      }
    }
    return null;
  }

  // 判断滚动轨道是否可接纳下一条（不追上前车）。
  // minGap 公式：前车滚完所需时间 × (前车宽 / (有效宽 + 前车宽))
  private canEnterScrollTrack(
    prev: AllocatedDanmaku,
    nextStartTime: number,
    nextWidth: number,
  ): boolean {
    if (nextStartTime - prev.startTimeMs >= prev.durationMs) return true;
    const minGap =
      (prev.durationMs * prev.width) /
      (this.activeWidth() + Math.max(prev.width, nextWidth));
    return nextStartTime - prev.startTimeMs >= minGap;
  }

  private releaseFromTrack(allocated: AllocatedDanmaku): void {
    const pool =
      allocated.mode === "scroll"
        ? this.scrollTracks
        : allocated.mode === "top"
          ? this.topTracks
          : this.bottomTracks;
    for (let i = 0; i < pool.length; i += 1) {
      if (pool[i] === allocated) {
        pool[i] = null;
        return;
      }
    }
  }

  private rebuildTrackPools(): void {
    const lineHeight = this.lineHeight(this.config.defaultFontSize);
    const innerHeight =
      this.viewport.height -
      this.config.safeAreaInsets.top -
      this.config.safeAreaInsets.bottom;
    const tracks = Math.max(
      0,
      Math.floor((innerHeight * this.config.displayArea) / lineHeight),
    );
    // 已分配 trackY 不变：保留 assigned 与已占用轨道的引用。仅扩 / 缩 pool 数组长度。
    this.scrollTracks = padOrTrim(this.scrollTracks, tracks);
    this.topTracks = padOrTrim(this.topTracks, tracks);
    this.bottomTracks = padOrTrim(this.bottomTracks, tracks);
  }

  private lineHeight(fontSize: number): number {
    return fontSize + this.config.trackGap;
  }

  private scrollTrackY(trackIndex: number, lineHeight: number): number {
    return this.config.safeAreaInsets.top + trackIndex * lineHeight;
  }

  private topTrackY(trackIndex: number, lineHeight: number): number {
    return this.config.safeAreaInsets.top + trackIndex * lineHeight;
  }

  private bottomTrackY(trackIndex: number, lineHeight: number): number {
    return (
      this.viewport.height -
      this.config.safeAreaInsets.bottom -
      (trackIndex + 1) * lineHeight
    );
  }

  private scrollDurationMs(): number {
    // setRate(rate) 通过 config.rate 改变新弹幕的滚动 durationMs。
    return Math.max(1, this.config.scrollDurationMs / this.config.rate);
  }

  private fixedDurationMs(): number {
    return Math.max(1, this.config.fixedDurationMs / this.config.rate);
  }

  private activeWidth(): number {
    return (
      this.viewport.width -
      this.config.safeAreaInsets.left -
      this.config.safeAreaInsets.right
    );
  }
}

// 在保留前 N 项的前提下扩展或收缩数组到 length；扩展时填 null。
function padOrTrim(
  arr: (AllocatedDanmaku | null)[],
  length: number,
): (AllocatedDanmaku | null)[] {
  if (arr.length === length) return arr;
  if (arr.length > length) return arr.slice(0, length);
  const out = arr.slice();
  while (out.length < length) out.push(null);
  return out;
}
