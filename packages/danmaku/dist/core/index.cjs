"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/core/index.ts
var core_exports = {};
__export(core_exports, {
  DEFAULT_DANMAKU_CONFIG: () => DEFAULT_DANMAKU_CONFIG,
  DanmakuController: () => DanmakuController,
  EstimateTextMeasurer: () => EstimateTextMeasurer,
  resolveDanmakuConfig: () => resolveDanmakuConfig
});
module.exports = __toCommonJS(core_exports);

// src/core/config.ts
var DEFAULT_SAFE_AREA = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0
};
var DEFAULT_MERGE = {
  enabled: false,
  windowMs: 5e3,
  minCount: 3
};
var DEFAULT_ADAPTIVE_TARGET_FPS = 60;
var DEFAULT_ADAPTIVE_DOWNSCALE_TOLERANCE = 5;
var DEFAULT_ADAPTIVE_UPSCALE_TOLERANCE = 1;
var DEFAULT_ADAPTIVE = {
  enabled: false,
  targetFps: DEFAULT_ADAPTIVE_TARGET_FPS,
  downscaleFps: DEFAULT_ADAPTIVE_TARGET_FPS - DEFAULT_ADAPTIVE_DOWNSCALE_TOLERANCE,
  upscaleFps: DEFAULT_ADAPTIVE_TARGET_FPS - DEFAULT_ADAPTIVE_UPSCALE_TOLERANCE,
  minMaxOnScreen: 30
};
var DEFAULT_DANMAKU_CONFIG = {
  scrollDurationMs: 8e3,
  fixedDurationMs: 4e3,
  maxOnScreen: 80,
  opacity: 1,
  rate: 1,
  fontScale: 1,
  displayArea: 1,
  trackGap: 4,
  defaultFontSize: 24,
  safeAreaInsets: DEFAULT_SAFE_AREA,
  merge: DEFAULT_MERGE,
  adaptive: DEFAULT_ADAPTIVE
};
function resolveDanmakuConfig(config) {
  if (!config) {
    return DEFAULT_DANMAKU_CONFIG;
  }
  const safeArea = {
    ...DEFAULT_SAFE_AREA,
    ...config.safeAreaInsets
  };
  const merge = {
    ...DEFAULT_MERGE,
    ...config.merge
  };
  const targetFps = config.adaptive?.targetFps ?? DEFAULT_ADAPTIVE.targetFps;
  const adaptive = {
    enabled: config.adaptive?.enabled ?? DEFAULT_ADAPTIVE.enabled,
    targetFps,
    downscaleFps: config.adaptive?.downscaleFps ?? targetFps - DEFAULT_ADAPTIVE_DOWNSCALE_TOLERANCE,
    upscaleFps: config.adaptive?.upscaleFps ?? targetFps - DEFAULT_ADAPTIVE_UPSCALE_TOLERANCE,
    minMaxOnScreen: config.adaptive?.minMaxOnScreen ?? DEFAULT_ADAPTIVE.minMaxOnScreen
  };
  return {
    scrollDurationMs: config.scrollDurationMs ?? DEFAULT_DANMAKU_CONFIG.scrollDurationMs,
    fixedDurationMs: config.fixedDurationMs ?? DEFAULT_DANMAKU_CONFIG.fixedDurationMs,
    maxOnScreen: config.maxOnScreen ?? DEFAULT_DANMAKU_CONFIG.maxOnScreen,
    opacity: config.opacity ?? DEFAULT_DANMAKU_CONFIG.opacity,
    rate: config.rate ?? DEFAULT_DANMAKU_CONFIG.rate,
    fontScale: config.fontScale ?? DEFAULT_DANMAKU_CONFIG.fontScale,
    displayArea: config.displayArea ?? DEFAULT_DANMAKU_CONFIG.displayArea,
    trackGap: config.trackGap ?? DEFAULT_DANMAKU_CONFIG.trackGap,
    defaultFontSize: config.defaultFontSize ?? DEFAULT_DANMAKU_CONFIG.defaultFontSize,
    safeAreaInsets: safeArea,
    merge,
    adaptive
  };
}

// src/core/density.ts
var FPS_WINDOW = 60;
var DOWNSCALE_HOLD_MS = 1e3;
var UPSCALE_HOLD_MS = 3e3;
var DOWNSCALE_FACTOR = 0.8;
var UPSCALE_STEP = 5;
var DensityGovernor = class {
  constructor(config) {
    this.lastTickMs = -1;
    this.dtSamples = [];
    // 状态机：记录上次"低于 / 高于阈值"的起始时间，便于按 hold 时长判定。
    this.downscaleSince = -1;
    this.upscaleSince = -1;
    this.onOverload = null;
    this.config = config;
    this._effectiveMaxOnScreen = config.maxOnScreen;
  }
  get effectiveMaxOnScreen() {
    return this._effectiveMaxOnScreen;
  }
  // 由 controller 在 setMaxOnScreen / updateConfig 时调用，
  // 保证 effectiveMaxOnScreen ≤ 新上限。
  applyConfig(config) {
    this.config = config;
    if (this._effectiveMaxOnScreen > config.maxOnScreen) {
      this._effectiveMaxOnScreen = config.maxOnScreen;
    }
  }
  setOnOverload(handler) {
    this.onOverload = handler;
  }
  // 每次 RAF 的回调；timestampMs 是当帧时间戳（来自 performance.now()）。
  tick(timestampMs) {
    if (!this.config.adaptive.enabled) {
      this.lastTickMs = timestampMs;
      return;
    }
    if (this.lastTickMs < 0) {
      this.lastTickMs = timestampMs;
      return;
    }
    const dt = timestampMs - this.lastTickMs;
    this.lastTickMs = timestampMs;
    if (dt <= 0) return;
    this.dtSamples.push(dt);
    if (this.dtSamples.length > FPS_WINDOW) this.dtSamples.shift();
    if (this.dtSamples.length < Math.min(FPS_WINDOW, 10)) return;
    const fps = 1e3 / median(this.dtSamples);
    this.evaluate(fps, timestampMs);
  }
  evaluate(fps, now) {
    const { adaptive, maxOnScreen } = this.config;
    if (fps < adaptive.downscaleFps) {
      if (this.downscaleSince < 0) this.downscaleSince = now;
      this.upscaleSince = -1;
      if (now - this.downscaleSince >= DOWNSCALE_HOLD_MS) {
        const next = Math.max(
          adaptive.minMaxOnScreen,
          Math.floor(this._effectiveMaxOnScreen * DOWNSCALE_FACTOR)
        );
        if (next < this._effectiveMaxOnScreen) {
          this._effectiveMaxOnScreen = next;
          this.onOverload?.(fps, next);
        }
        this.downscaleSince = now;
      }
      return;
    }
    if (fps >= adaptive.upscaleFps) {
      if (this.upscaleSince < 0) this.upscaleSince = now;
      this.downscaleSince = -1;
      if (now - this.upscaleSince >= UPSCALE_HOLD_MS && this._effectiveMaxOnScreen < maxOnScreen) {
        this._effectiveMaxOnScreen = Math.min(
          maxOnScreen,
          this._effectiveMaxOnScreen + UPSCALE_STEP
        );
        this.upscaleSince = now;
      }
      return;
    }
    this.downscaleSince = -1;
    this.upscaleSince = -1;
  }
};
function median(arr) {
  const sorted = arr.slice().sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return 0;
  if (n % 2 === 1) return sorted[n - 1 >>> 1];
  return (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
}

// src/core/event-bus.ts
var EventBus = class {
  constructor() {
    // 用 Set 而不是 Array：自然去重、移除 O(1)。
    // value 类型故意宽松成 (event: any) => void，调用 on 时由方法签名保障类型。
    this.handlers = /* @__PURE__ */ new Map();
  }
  on(type, handler) {
    let set = this.handlers.get(type);
    if (!set) {
      set = /* @__PURE__ */ new Set();
      this.handlers.set(type, set);
    }
    const wrapped = handler;
    set.add(wrapped);
    return () => {
      set?.delete(wrapped);
    };
  }
  emit(event) {
    const set = this.handlers.get(event.type);
    if (!set) return;
    const snapshot = Array.from(set);
    for (const handler of snapshot) {
      try {
        handler(event);
      } catch (error) {
        console.error("[EventBus] handler threw", error);
      }
    }
  }
  clear() {
    this.handlers.clear();
  }
};

// src/core/filter.ts
var FilterChain = class {
  constructor() {
    this.blockedKeywords = [];
    this.blockedPatterns = [];
    this.blockedUserIds = /* @__PURE__ */ new Set();
    this.blockedModes = /* @__PURE__ */ new Set();
    this.customFilter = null;
  }
  setBlockedKeywords(words) {
    this.blockedKeywords = words.slice();
  }
  setBlockedPatterns(patterns) {
    this.blockedPatterns = patterns.slice();
  }
  setBlockedUserIds(ids) {
    this.blockedUserIds = new Set(ids);
  }
  setBlockedModes(modes) {
    this.blockedModes = new Set(modes);
  }
  setFilter(predicate) {
    this.customFilter = predicate;
  }
  accept(item) {
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
    if (item.userId !== void 0 && this.blockedUserIds.has(item.userId)) {
      return false;
    }
    if (item.mode !== void 0 && this.blockedModes.has(item.mode)) {
      return false;
    }
    if (this.customFilter !== null && !this.customFilter(item)) {
      return false;
    }
    return true;
  }
};

// src/core/measurer.ts
var CJK_FACTOR = 1;
var ASCII_FACTOR = 0.56;
var BOLD_FACTOR = 1.06;
var DEFAULT_CACHE_SIZE = 4096;
var EstimateTextMeasurer = class {
  constructor(options) {
    // 用 Map 自身的插入顺序作为 LRU 序，命中时先 delete 再 set 移到末尾。
    this.cache = /* @__PURE__ */ new Map();
    this.cacheSize = options?.cacheSize ?? DEFAULT_CACHE_SIZE;
  }
  measureText(text, fontSize, weight) {
    const key = `${text}|${fontSize}|${weight}`;
    const existing = this.cache.get(key);
    if (existing) {
      this.cache.delete(key);
      this.cache.set(key, existing);
      return existing;
    }
    let baseWidth = 0;
    for (const char of text) {
      const cp = char.codePointAt(0) ?? 0;
      baseWidth += cp > 255 ? CJK_FACTOR * fontSize : ASCII_FACTOR * fontSize;
    }
    const width = Math.ceil(weight === "bold" ? baseWidth * BOLD_FACTOR : baseWidth);
    const entry = { width, height: fontSize };
    if (this.cache.size >= this.cacheSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== void 0) {
        this.cache.delete(oldest);
      }
    }
    this.cache.set(key, entry);
    return entry;
  }
};

// src/core/merger.ts
var DanmakuMerger = class {
  constructor() {
    this.enabled = false;
    this.windowMs = 5e3;
    // 维护 text → representative。
    this.representatives = /* @__PURE__ */ new Map();
  }
  configure(config) {
    this.enabled = config.enabled;
    if (config.windowMs !== void 0) {
      this.windowMs = config.windowMs;
    }
    if (!config.enabled) {
      this.representatives.clear();
    }
  }
  reset() {
    this.representatives.clear();
  }
  // 输入一条已经通过过滤的弹幕，决定是否分配为代表 / 合并到现有代表。
  acquire(item, currentTimeMs) {
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
        mergeCount: existing.mergeCount
      };
    }
    this.representatives.set(item.text, {
      id: item.id,
      startTimeMs: item.time,
      mergeCount: 1
    });
    return { kind: "new", representativeId: item.id, mergeCount: 1 };
  }
  // 清理已经超过窗口的代表，让后续同 text 可以作为新代表。
  evict(currentTimeMs) {
    if (this.representatives.size === 0) return;
    const cutoff = currentTimeMs - this.windowMs;
    for (const [text, record] of this.representatives) {
      if (record.startTimeMs < cutoff) {
        this.representatives.delete(text);
      }
    }
  }
};

// src/core/scheduler.ts
var DanmakuScheduler = class {
  constructor(options) {
    // 已被 scheduler 处理过的弹幕 id（无论入屏成功与否），避免重复评估。
    this.processed = /* @__PURE__ */ new Set();
    // 已生成 layout 节点对应的 mergeCount 状态。
    this.mergeMeta = /* @__PURE__ */ new Map();
    // 当前 layout 集合（按 id 字典序与 startTimeMs 升序输出）。
    this.active = /* @__PURE__ */ new Map();
    this.versionCounter = 0;
    // 集合签名：用于侦测"集合按 id 变化或 mergeCount 变化"。
    this.lastSignature = "";
    this.store = options.store;
    this.filter = options.filter;
    this.merger = options.merger;
    this.allocator = options.allocator;
    this.measurer = options.measurer;
    this.config = options.config;
  }
  setMeasurer(measurer) {
    this.measurer = measurer;
    for (const [id, layout] of this.active) {
      const measured = this.measurer.measureText(
        layout.text,
        layout.fontSize,
        layout.weight
      );
      const next = {
        ...layout,
        width: measured.width,
        height: measured.height,
        endX: this.recalcEndX(layout, measured.width),
        startX: this.recalcStartX(layout, measured.width)
      };
      this.active.set(id, next);
    }
  }
  setConfig(config) {
    this.config = config;
  }
  // 替换 store（setItems / clearItems 时被 controller 调用）。
  resetData(store) {
    this.store = store;
    this.processed.clear();
    this.mergeMeta.clear();
    this.active.clear();
    this.merger.reset();
    this.allocator.seek(0);
  }
  // 重新评估屏上所有弹幕是否仍通过过滤；用于"立即生效"语义的过滤变更。
  refilterActive() {
    for (const [id] of this.active) {
      const raw = this.findRaw(id);
      if (raw && !this.filter.accept(raw)) {
        this.active.delete(id);
      }
    }
  }
  // 主入口：按当前时间产出 snapshot。
  tick(currentTimeMs) {
    this.allocator.prune(currentTimeMs);
    this.evictExpiredActive(currentTimeMs);
    this.ingest(currentTimeMs);
    return this.buildSnapshot(currentTimeMs);
  }
  seek(currentTimeMs) {
    this.processed.clear();
    this.mergeMeta.clear();
    this.active.clear();
    this.merger.reset();
    this.allocator.seek(currentTimeMs);
    const t0 = currentTimeMs - Math.max(this.config.scrollDurationMs, this.config.fixedDurationMs);
    const candidates = this.store.slice(t0, currentTimeMs);
    for (const item of candidates) {
      this.evaluate(item, currentTimeMs);
    }
    return this.buildSnapshot(currentTimeMs);
  }
  // ingest：把"上次 tick 时刻 → 当前"之间到达的弹幕评估入屏。
  // 这里偷个懒：每次 tick 都把窗口范围内所有未 processed 的项跑一遍 evaluate。
  // evaluate 内部用 processed 去重，避免 O(n) × tick 频率的真重复劳动。
  ingest(currentTimeMs) {
    const t0 = currentTimeMs - Math.max(this.config.scrollDurationMs, this.config.fixedDurationMs);
    const candidates = this.store.slice(t0, currentTimeMs);
    for (const item of candidates) {
      if (this.processed.has(item.id)) continue;
      this.evaluate(item, currentTimeMs);
    }
  }
  evaluate(item, currentTimeMs) {
    this.processed.add(item.id);
    if (!this.filter.accept(item)) return;
    const mergeRes = this.merger.acquire(item, currentTimeMs);
    if (mergeRes.kind === "merged") {
      const repId = mergeRes.representativeId;
      const meta = this.mergeMeta.get(repId);
      if (meta) {
        meta.mergeCount = mergeRes.mergeCount;
        const layout2 = this.active.get(repId);
        if (layout2 && layout2.mergeCount !== mergeRes.mergeCount) {
          this.active.set(repId, { ...layout2, mergeCount: mergeRes.mergeCount });
        }
      }
      return;
    }
    const fontSize = (item.fontSize ?? this.config.defaultFontSize) * this.config.fontScale;
    const weight = item.weight ?? "normal";
    const measured = this.measurer.measureText(item.text, fontSize, weight);
    const allocated = this.allocator.allocate(
      item,
      currentTimeMs,
      measured.width,
      measured.height
    );
    if (!allocated) return;
    const layout = {
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
      mergeCount: mergeRes.mergeCount
    };
    this.active.set(layout.id, layout);
    this.mergeMeta.set(layout.id, { mergeCount: 1 });
  }
  evictExpiredActive(currentTimeMs) {
    for (const [id, layout] of this.active) {
      if (currentTimeMs >= layout.startTimeMs + layout.durationMs) {
        this.active.delete(id);
        this.mergeMeta.delete(id);
      }
    }
  }
  buildSnapshot(currentTimeMs) {
    const items = Array.from(this.active.values()).sort(
      (a, b) => a.startTimeMs - b.startTimeMs
    );
    const signature = items.map((it) => `${it.id}:${it.mergeCount}`).join("|");
    if (signature !== this.lastSignature) {
      this.versionCounter += 1;
      this.lastSignature = signature;
    }
    return { timeMs: currentTimeMs, items, version: this.versionCounter };
  }
  findRaw(id) {
    const ref = this.active.get(id);
    if (!ref) return void 0;
    const candidates = this.store.slice(ref.startTimeMs - 1, ref.startTimeMs + 1);
    return candidates.find((it) => it.id === id);
  }
  recalcStartX(layout, _width) {
    return layout.startX;
  }
  recalcEndX(layout, width) {
    if (layout.mode === "scroll") {
      return -width;
    }
    return layout.endX;
  }
};

// src/core/store.ts
var DanmakuStore = class {
  constructor(initial) {
    this.items = [];
    this.index = /* @__PURE__ */ new Map();
    if (initial && initial.length > 0) {
      this.setItems(initial);
    }
  }
  // 整体替换：清空索引并按 time 排序。
  setItems(items) {
    this.items = [];
    this.index.clear();
    const seen = /* @__PURE__ */ new Set();
    for (const item of items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      this.items.push(item);
      this.index.set(item.id, item);
    }
    this.items.sort((a, b) => a.time - b.time);
  }
  // 增量追加：按 time 二分插入；已存在 id 静默丢弃。
  append(items) {
    for (const item of items) {
      if (this.index.has(item.id)) continue;
      const insertAt = this.lowerBound(item.time);
      this.items.splice(insertAt, 0, item);
      this.index.set(item.id, item);
    }
  }
  clear() {
    this.items = [];
    this.index.clear();
  }
  has(id) {
    return this.index.has(id);
  }
  list() {
    return this.items;
  }
  // 返回 time ∈ [t0, t1] 的子集（左闭右闭）。
  slice(t0, t1) {
    const start = this.lowerBound(t0);
    const end = this.upperBound(t1);
    return this.items.slice(start, end);
  }
  // 二分：第一个 time >= target 的下标。
  lowerBound(target) {
    let low = 0;
    let high = this.items.length;
    while (low < high) {
      const mid = low + high >>> 1;
      if (this.items[mid].time < target) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    return low;
  }
  // 二分：第一个 time > target 的下标。
  upperBound(target) {
    let low = 0;
    let high = this.items.length;
    while (low < high) {
      const mid = low + high >>> 1;
      if (this.items[mid].time <= target) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    return low;
  }
};

// src/core/track-allocator.ts
var TrackAllocator = class {
  constructor(options) {
    // id → 已分配条目；用作"持久状态"+"同 id 复用"。
    this.assigned = /* @__PURE__ */ new Map();
    // 滚动 / 顶部 / 底部三类轨道各自的最近一次占用（按 trackIndex 索引）。
    this.scrollTracks = [];
    this.topTracks = [];
    this.bottomTracks = [];
    this.viewport = options.viewport;
    this.config = options.config;
    this.maxOnScreen = options.config.maxOnScreen;
    this.rebuildTrackPools();
  }
  setViewport(viewport) {
    this.viewport = viewport;
    this.rebuildTrackPools();
  }
  setConfig(config) {
    this.config = config;
    this.rebuildTrackPools();
  }
  setMaxOnScreen(n) {
    this.maxOnScreen = Math.max(1, Math.floor(n));
  }
  // 清空所有占用，调用方应在 seek 后调用。
  seek(_timeMs) {
    this.assigned.clear();
    this.scrollTracks.fill(null);
    this.topTracks.fill(null);
    this.bottomTracks.fill(null);
  }
  // 返回当前已激活的所有弹幕；调用方按时间过滤。
  list() {
    return Array.from(this.assigned.values());
  }
  // 回收已过期的占用（已 active 但生命周期结束）。
  prune(currentTimeMs) {
    for (const [id, allocated] of this.assigned) {
      if (currentTimeMs >= allocated.tailLeavesAtMs) {
        this.assigned.delete(id);
        this.releaseFromTrack(allocated);
      }
    }
  }
  // 尝试为 item 分配轨道；返回已分配条目或 null（被同屏上限拒绝）。
  allocate(item, currentTimeMs, width, height) {
    const existing = this.assigned.get(item.id);
    if (existing) return existing;
    if (this.assigned.size >= this.maxOnScreen) return null;
    const mode = item.mode ?? "scroll";
    const lineHeight = this.lineHeight(height);
    if (mode === "top" || mode === "bottom") {
      return this.allocateFixed(item, mode, currentTimeMs, width, height, lineHeight);
    }
    return this.allocateScroll(item, currentTimeMs, width, height, lineHeight);
  }
  // 滚动弹幕：找一条"尾部已离开右边界 + 不会追上前车"的轨道。
  allocateScroll(item, currentTimeMs, width, height, lineHeight) {
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
        const allocated = {
          id: item.id,
          mode: "scroll",
          trackY: y,
          startTimeMs: item.time,
          durationMs,
          startX,
          endX,
          width,
          height,
          tailLeavesAtMs
        };
        this.scrollTracks[i] = allocated;
        this.assigned.set(item.id, allocated);
        return allocated;
      }
    }
    return null;
  }
  // 固定弹幕：找一条尚未被占用 / 已过期的顶（底）部轨道。
  allocateFixed(item, mode, currentTimeMs, width, height, lineHeight) {
    const pool = mode === "top" ? this.topTracks : this.bottomTracks;
    const trackCount = pool.length;
    if (trackCount === 0) return null;
    const durationMs = this.fixedDurationMs();
    const tailLeavesAtMs = item.time + durationMs;
    for (let i = 0; i < trackCount; i += 1) {
      const prev = pool[i] ?? null;
      if (prev === null || currentTimeMs >= prev.tailLeavesAtMs) {
        const y = mode === "top" ? this.topTrackY(i, lineHeight) : this.bottomTrackY(i, lineHeight);
        const centerX = this.config.safeAreaInsets.left + (this.activeWidth() - width) / 2;
        const allocated = {
          id: item.id,
          mode,
          trackY: y,
          startTimeMs: item.time,
          durationMs,
          startX: centerX,
          endX: centerX,
          width,
          height,
          tailLeavesAtMs
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
  canEnterScrollTrack(prev, nextStartTime, nextWidth) {
    if (nextStartTime - prev.startTimeMs >= prev.durationMs) return true;
    const minGap = prev.durationMs * prev.width / (this.activeWidth() + Math.max(prev.width, nextWidth));
    return nextStartTime - prev.startTimeMs >= minGap;
  }
  releaseFromTrack(allocated) {
    const pool = allocated.mode === "scroll" ? this.scrollTracks : allocated.mode === "top" ? this.topTracks : this.bottomTracks;
    for (let i = 0; i < pool.length; i += 1) {
      if (pool[i] === allocated) {
        pool[i] = null;
        return;
      }
    }
  }
  rebuildTrackPools() {
    const lineHeight = this.lineHeight(this.config.defaultFontSize);
    const innerHeight = this.viewport.height - this.config.safeAreaInsets.top - this.config.safeAreaInsets.bottom;
    const tracks = Math.max(
      0,
      Math.floor(innerHeight * this.config.displayArea / lineHeight)
    );
    this.scrollTracks = padOrTrim(this.scrollTracks, tracks);
    this.topTracks = padOrTrim(this.topTracks, tracks);
    this.bottomTracks = padOrTrim(this.bottomTracks, tracks);
  }
  lineHeight(fontSize) {
    return fontSize + this.config.trackGap;
  }
  scrollTrackY(trackIndex, lineHeight) {
    return this.config.safeAreaInsets.top + trackIndex * lineHeight;
  }
  topTrackY(trackIndex, lineHeight) {
    return this.config.safeAreaInsets.top + trackIndex * lineHeight;
  }
  bottomTrackY(trackIndex, lineHeight) {
    return this.viewport.height - this.config.safeAreaInsets.bottom - (trackIndex + 1) * lineHeight;
  }
  scrollDurationMs() {
    return Math.max(1, this.config.scrollDurationMs / this.config.rate);
  }
  fixedDurationMs() {
    return Math.max(1, this.config.fixedDurationMs / this.config.rate);
  }
  activeWidth() {
    return this.viewport.width - this.config.safeAreaInsets.left - this.config.safeAreaInsets.right;
  }
};
function padOrTrim(arr, length) {
  if (arr.length === length) return arr;
  if (arr.length > length) return arr.slice(0, length);
  const out = arr.slice();
  while (out.length < length) out.push(null);
  return out;
}

// src/core/time.ts
var defaultClockRuntime = {
  requestRaf: typeof globalThis !== "undefined" && typeof globalThis.requestAnimationFrame === "function" ? (h) => globalThis.requestAnimationFrame(h) : (h) => setTimeout(() => h(Date.now()), 16),
  cancelRaf: typeof globalThis !== "undefined" && typeof globalThis.cancelAnimationFrame === "function" ? (id) => globalThis.cancelAnimationFrame(id) : (id) => clearTimeout(id),
  now: typeof globalThis !== "undefined" && typeof globalThis.performance?.now === "function" ? () => globalThis.performance.now() : () => Date.now()
};
var SEEK_THRESHOLD_MS = 250;
var RESYNC_INTERVAL_MS = 1e3;
var TimeKeeper = class {
  constructor(options) {
    this.rafHandle = null;
    this.anchor = null;
    this.lastResyncMs = -1;
    this.runtime = options.runtime ?? defaultClockRuntime;
    this.options = options;
  }
  start() {
    if (this.rafHandle !== null) return;
    this.scheduleFrame();
  }
  stop() {
    if (this.rafHandle !== null) {
      this.runtime.cancelRaf(this.rafHandle);
      this.rafHandle = null;
    }
    this.anchor = null;
    this.lastResyncMs = -1;
  }
  // 外部主动同步（onSeek 回调 / 显式 seek）。
  syncTo(authoritativeMs) {
    this.anchor = { authoritativeMs, rafMs: this.runtime.now() };
    this.lastResyncMs = this.anchor.rafMs;
  }
  scheduleFrame() {
    this.rafHandle = this.runtime.requestRaf((rafMs) => {
      this.rafHandle = null;
      this.onFrame(rafMs);
      this.scheduleFrame();
    });
  }
  onFrame(rafMs) {
    if (!this.options.isPlaying()) {
      this.anchor = null;
      return;
    }
    const authoritative = this.options.getAuthoritativeTime();
    if (this.anchor === null) {
      this.anchor = { authoritativeMs: authoritative, rafMs };
      this.lastResyncMs = rafMs;
      this.options.onTick(authoritative);
      return;
    }
    const interpolated = this.anchor.authoritativeMs + (rafMs - this.anchor.rafMs);
    if (Math.abs(authoritative - interpolated) > SEEK_THRESHOLD_MS) {
      this.anchor = { authoritativeMs: authoritative, rafMs };
      this.lastResyncMs = rafMs;
      this.options.onSeek(authoritative);
      return;
    }
    if (rafMs - this.lastResyncMs >= RESYNC_INTERVAL_MS) {
      this.anchor = { authoritativeMs: authoritative, rafMs };
      this.lastResyncMs = rafMs;
    }
    this.options.onTick(interpolated);
  }
};

// src/core/controller.ts
var DanmakuController = class {
  constructor(options) {
    this.filter = new FilterChain();
    this.merger = new DanmakuMerger();
    this.timeKeeper = null;
    this.bus = new EventBus();
    this.detachOnSeek = null;
    this.paused = false;
    this.visible = true;
    this.destroyed = false;
    this.lastSnapshot = { timeMs: 0, items: [], version: 0 };
    this.config = resolveDanmakuConfig(options.config);
    this.viewport = options.viewport;
    this.measurer = options.measurer ?? new EstimateTextMeasurer();
    this.clockRuntime = options.clockRuntime ?? defaultClockRuntime;
    this.store = new DanmakuStore(options.items);
    this.allocator = new TrackAllocator({
      viewport: this.viewport,
      config: this.config
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
      config: this.config
    });
  }
  // 只读访问。
  get opacity() {
    return this.config.opacity;
  }
  // ===== 时间源 =====
  attachTimeline(source) {
    this.detachTimeline();
    this.timeKeeper = new TimeKeeper({
      runtime: this.clockRuntime,
      getAuthoritativeTime: () => source.getCurrentTime(),
      isPlaying: () => !this.paused && source.isPlaying(),
      onTick: (timeMs) => this.onTick(timeMs),
      onSeek: (timeMs) => {
        this.scheduler.seek(timeMs);
        this.emitLayout(timeMs);
      }
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
  detachTimeline() {
    this.timeKeeper?.stop();
    this.timeKeeper = null;
    this.detachOnSeek?.();
    this.detachOnSeek = null;
  }
  // ===== 手动驱动 / 调度 =====
  tick(timeMs) {
    if (this.destroyed) return this.lastSnapshot;
    if (!this.visible) {
      this.lastSnapshot = { timeMs, items: [], version: this.lastSnapshot.version };
      this.bus.emit({ type: "tick", timeMs });
      return this.lastSnapshot;
    }
    if (this.paused) {
      this.bus.emit({ type: "tick", timeMs });
      return this.lastSnapshot;
    }
    return this.onTick(timeMs);
  }
  seek(timeMs) {
    if (this.destroyed) return this.lastSnapshot;
    const snap = this.scheduler.seek(timeMs);
    this.lastSnapshot = snap;
    this.bus.emit({ type: "layout", snapshot: snap });
    return snap;
  }
  // ===== 数据 =====
  append(items) {
    this.store.append(items);
  }
  setItems(items) {
    this.store = new DanmakuStore(items);
    this.scheduler.resetData(this.store);
    this.lastSnapshot = { timeMs: 0, items: [], version: this.lastSnapshot.version };
  }
  clearItems() {
    this.store.clear();
    this.scheduler.resetData(this.store);
    this.lastSnapshot = { timeMs: 0, items: [], version: this.lastSnapshot.version };
  }
  // ===== 播放控制 =====
  pause() {
    this.paused = true;
  }
  resume() {
    this.paused = false;
  }
  setVisible(visible) {
    this.visible = visible;
    if (!visible) {
      this.scheduler.resetData(this.store);
      this.lastSnapshot = { timeMs: 0, items: [], version: this.lastSnapshot.version };
      this.bus.emit({ type: "layout", snapshot: this.lastSnapshot });
    }
  }
  setRate(rate) {
    this.updateConfig({ rate });
  }
  // ===== 过滤 =====
  setBlockedKeywords(words) {
    this.filter.setBlockedKeywords(words);
    this.scheduler.refilterActive();
  }
  setBlockedPatterns(patterns) {
    this.filter.setBlockedPatterns(patterns);
    this.scheduler.refilterActive();
  }
  setBlockedUserIds(ids) {
    this.filter.setBlockedUserIds(ids);
    this.scheduler.refilterActive();
  }
  setBlockedModes(modes) {
    this.filter.setBlockedModes(modes);
    this.scheduler.refilterActive();
  }
  setFilter(predicate) {
    this.filter.setFilter(predicate);
    this.scheduler.refilterActive();
  }
  // ===== 视觉 / 配置 =====
  setOpacity(opacity) {
    this.updateConfig({ opacity });
  }
  setFontScale(scale) {
    this.updateConfig({ fontScale: scale });
  }
  setDisplayArea(ratio) {
    this.updateConfig({ displayArea: ratio });
  }
  setMaxOnScreen(n) {
    this.updateConfig({ maxOnScreen: n });
  }
  setViewport(viewport) {
    this.viewport = viewport;
    this.allocator.setViewport(viewport);
  }
  updateConfig(patch) {
    this.config = resolveDanmakuConfig({ ...this.serializeConfig(), ...patch });
    this.allocator.setConfig(this.config);
    this.allocator.setMaxOnScreen(this.config.maxOnScreen);
    this.merger.configure(this.config.merge);
    this.density.applyConfig(this.config);
    this.scheduler.setConfig(this.config);
  }
  setMerge(config) {
    this.updateConfig({ merge: config });
  }
  setAdaptive(config) {
    this.updateConfig({ adaptive: config });
  }
  setMeasurer(measurer) {
    this.measurer = measurer;
    this.scheduler.setMeasurer(measurer);
  }
  // 获取当前文本测量器，供适配层（如 DanmakuView）获取 SkiaTextMeasurer 实例。
  getMeasurer() {
    return this.measurer;
  }
  // ===== 事件 =====
  on(type, handler) {
    return this.bus.on(type, handler);
  }
  // ===== 生命周期 =====
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.detachTimeline();
    this.bus.clear();
  }
  // ===== 内部 =====
  onTick(timeMs) {
    if (this.timeKeeper) {
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
  emitLayout(timeMs) {
    const snap = this.scheduler.tick(timeMs);
    this.lastSnapshot = snap;
    this.bus.emit({ type: "layout", snapshot: snap });
  }
  // 把已 resolve 的配置反序列化成 DanmakuConfig（供 updateConfig 合并）。
  serializeConfig() {
    return { ...this.config };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DEFAULT_DANMAKU_CONFIG,
  DanmakuController,
  EstimateTextMeasurer,
  resolveDanmakuConfig
});
//# sourceMappingURL=index.cjs.map