import { resolveDanmakuConfig } from "./config";
import { DensityGovernor } from "./density";
import { EventBus } from "./event-bus";
import { FilterChain } from "./filter";
import { EstimateTextMeasurer } from "./measurer";
import { DanmakuMerger } from "./merger";
import { DanmakuScheduler } from "./scheduler";
import { DanmakuStore } from "./store";
import { TrackAllocator } from "./track-allocator";
import { defaultClockRuntime, TimeKeeper, type ClockRuntime } from "./time";
import type {
  ActiveLayoutSnapshot,
  DanmakuAdaptiveConfig,
  DanmakuConfig,
  DanmakuEvent,
  DanmakuEventHandler,
  DanmakuEventType,
  DanmakuItem,
  DanmakuMergeConfig,
  DanmakuMode,
  DanmakuViewport,
  ResolvedDanmakuConfig,
  TextMeasurer,
  TimelineSource,
} from "./types";

export interface DanmakuControllerOptions {
  items?: DanmakuItem[];
  config?: DanmakuConfig;
  viewport: DanmakuViewport;
  measurer?: TextMeasurer;
  // 仅用于测试注入；默认使用 defaultClockRuntime。
  clockRuntime?: ClockRuntime;
}

// 对外门面（设计文档第 5 节）。组合 store / filter / merger / allocator / scheduler /
// density / time / eventBus，提供命令式 API 与事件订阅。
export class DanmakuController {
  private store: DanmakuStore;
  private readonly filter = new FilterChain();
  private readonly merger = new DanmakuMerger();
  private allocator: TrackAllocator;
  private scheduler: DanmakuScheduler;
  private density: DensityGovernor;
  private timeKeeper: TimeKeeper | null = null;
  private readonly bus = new EventBus<DanmakuEvent>();
  private config: ResolvedDanmakuConfig;
  private viewport: DanmakuViewport;
  private measurer: TextMeasurer;

  private clockRuntime: ClockRuntime;
  private detachOnSeek: (() => void) | null = null;
  private paused = false;
  private visible = true;
  private destroyed = false;
  private lastSnapshot: ActiveLayoutSnapshot = {
    timeMs: 0,
    items: [],
    version: 0,
  };

  constructor(options: DanmakuControllerOptions) {
    this.config = resolveDanmakuConfig(options.config);
    this.viewport = options.viewport;
    this.measurer = options.measurer ?? new EstimateTextMeasurer();
    this.clockRuntime = options.clockRuntime ?? defaultClockRuntime;

    this.store = new DanmakuStore(options.items);
    this.allocator = new TrackAllocator({
      viewport: this.viewport,
      config: this.config,
    });
    this.merger.configure(this.config.merge);
    this.density = new DensityGovernor(this.config);
    this.density.setOnOverload((fps, effective) => {
      this.allocator.setMaxOnScreen(effective);
      this.bus.emit({ type: "overload", fps, effectiveMaxOnScreen: effective });
    });
    this.scheduler = new DanmakuScheduler({
      store: this.store,
      filter: this.filter,
      merger: this.merger,
      allocator: this.allocator,
      measurer: this.measurer,
      config: this.config,
    });
  }

  // 只读访问。
  get opacity(): number {
    return this.config.opacity;
  }

  // ===== 时间源 =====
  attachTimeline(source: TimelineSource): void {
    this.detachTimeline();
    this.timeKeeper = new TimeKeeper({
      runtime: this.clockRuntime,
      getAuthoritativeTime: () => source.getCurrentTime(),
      isPlaying: () => !this.paused && source.isPlaying(),
      onTick: (timeMs) => this.onTick(timeMs),
      onSeek: (timeMs) => {
        this.scheduler.seek(timeMs);
        this.emitLayout(timeMs);
      },
    });
    this.timeKeeper.start();
    if (source.onSeek) {
      this.detachOnSeek = source.onSeek((timeMs) => {
        this.timeKeeper?.syncTo(timeMs);
        this.scheduler.seek(timeMs);
        this.emitLayout(timeMs);
      });
    }
  }

  detachTimeline(): void {
    this.timeKeeper?.stop();
    this.timeKeeper = null;
    this.detachOnSeek?.();
    this.detachOnSeek = null;
  }

  // ===== 手动驱动 / 调度 =====
  tick(timeMs: number): ActiveLayoutSnapshot {
    if (this.destroyed) return this.lastSnapshot;
    if (!this.visible) {
      this.lastSnapshot = {
        timeMs,
        items: [],
        version: this.lastSnapshot.version,
      };
      this.bus.emit({ type: "tick", timeMs });
      return this.lastSnapshot;
    }
    if (this.paused) {
      this.bus.emit({ type: "tick", timeMs });
      return this.lastSnapshot;
    }
    return this.onTick(timeMs);
  }

  seek(timeMs: number): ActiveLayoutSnapshot {
    if (this.destroyed) return this.lastSnapshot;
    const snap = this.scheduler.seek(timeMs);
    this.lastSnapshot = snap;
    this.bus.emit({ type: "layout", snapshot: snap });
    return snap;
  }

  // ===== 数据 =====
  append(items: DanmakuItem[]): void {
    this.store.append(items);
  }

  setItems(items: DanmakuItem[]): void {
    this.store = new DanmakuStore(items);
    this.scheduler.resetData(this.store);
    this.lastSnapshot = {
      timeMs: 0,
      items: [],
      version: this.lastSnapshot.version,
    };
  }

  clearItems(): void {
    this.store.clear();
    this.scheduler.resetData(this.store);
    this.lastSnapshot = {
      timeMs: 0,
      items: [],
      version: this.lastSnapshot.version,
    };
  }

  // ===== 播放控制 =====
  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    if (!visible) {
      this.scheduler.resetData(this.store);
      this.lastSnapshot = {
        timeMs: 0,
        items: [],
        version: this.lastSnapshot.version,
      };
      this.bus.emit({ type: "layout", snapshot: this.lastSnapshot });
    }
  }

  setRate(rate: number): void {
    this.updateConfig({ rate });
  }

  // ===== 过滤 =====
  setBlockedKeywords(words: readonly string[]): void {
    this.filter.setBlockedKeywords(words);
    this.scheduler.refilterActive();
  }

  setBlockedPatterns(patterns: readonly RegExp[]): void {
    this.filter.setBlockedPatterns(patterns);
    this.scheduler.refilterActive();
  }

  setBlockedUserIds(ids: readonly string[]): void {
    this.filter.setBlockedUserIds(ids);
    this.scheduler.refilterActive();
  }

  setBlockedModes(modes: readonly DanmakuMode[]): void {
    this.filter.setBlockedModes(modes);
    this.scheduler.refilterActive();
  }

  setFilter(predicate: ((item: DanmakuItem) => boolean) | null): void {
    this.filter.setFilter(predicate);
    this.scheduler.refilterActive();
  }

  // ===== 视觉 / 配置 =====
  setOpacity(opacity: number): void {
    this.updateConfig({ opacity });
  }

  setFontScale(scale: number): void {
    this.updateConfig({ fontScale: scale });
  }

  setDisplayArea(ratio: number): void {
    this.updateConfig({ displayArea: ratio });
  }

  setMaxOnScreen(n: number): void {
    this.updateConfig({ maxOnScreen: n });
  }

  setViewport(viewport: DanmakuViewport): void {
    this.viewport = viewport;
    this.allocator.setViewport(viewport);
  }

  updateConfig(patch: Partial<DanmakuConfig>): void {
    this.config = resolveDanmakuConfig({ ...this.serializeConfig(), ...patch });
    this.allocator.setConfig(this.config);
    this.allocator.setMaxOnScreen(this.config.maxOnScreen);
    this.merger.configure(this.config.merge);
    this.density.applyConfig(this.config);
    this.scheduler.setConfig(this.config);
  }

  setMerge(config: DanmakuMergeConfig): void {
    this.updateConfig({ merge: config });
  }

  setAdaptive(config: DanmakuAdaptiveConfig): void {
    this.updateConfig({ adaptive: config });
  }

  setMeasurer(measurer: TextMeasurer): void {
    this.measurer = measurer;
    this.scheduler.setMeasurer(measurer);
  }

  // 获取当前文本测量器，供适配层（如 DanmakuView）获取 SkiaTextMeasurer 实例。
  getMeasurer(): TextMeasurer {
    return this.measurer;
  }

  // ===== 事件 =====
  on<T extends DanmakuEventType>(
    type: T,
    handler: DanmakuEventHandler<T>,
  ): () => void {
    return this.bus.on(type, handler);
  }

  // ===== 生命周期 =====
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.detachTimeline();
    this.bus.clear();
  }

  // ===== 内部 =====
  private onTick(timeMs: number): ActiveLayoutSnapshot {
    if (this.timeKeeper) {
      // 由 TimeKeeper 驱动时，density tick 用真实 raf 时间戳更合适，
      // 但此处接受的 timeMs 是插值后的播放时间，作为近似可用。
      this.density.tick(this.clockRuntime.now());
      this.allocator.setMaxOnScreen(this.density.effectiveMaxOnScreen);
    }

    const snap = this.scheduler.tick(timeMs);
    const versionChanged = snap.version !== this.lastSnapshot.version;
    this.lastSnapshot = snap;
    this.bus.emit({ type: "tick", timeMs });
    if (versionChanged) {
      this.bus.emit({ type: "layout", snapshot: snap });
    }
    return snap;
  }

  private emitLayout(timeMs: number): void {
    const snap = this.scheduler.tick(timeMs);
    this.lastSnapshot = snap;
    this.bus.emit({ type: "layout", snapshot: snap });
  }

  // 把已 resolve 的配置反序列化成 DanmakuConfig（供 updateConfig 合并）。
  private serializeConfig(): DanmakuConfig {
    return { ...this.config };
  }
}
