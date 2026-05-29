import type { ResolvedDanmakuConfig } from "./types";

const FPS_WINDOW = 60; // 滑动窗口帧数
const DOWNSCALE_HOLD_MS = 1000; // 低于阈值需持续此时长才降级
const UPSCALE_HOLD_MS = 3000; // 高于阈值需持续此时长才回升
const DOWNSCALE_FACTOR = 0.8; // 降级系数
const UPSCALE_STEP = 5; // 回升步长（条）

// 衡量帧负载、动态调整 effectiveMaxOnScreen 上限。设计文档第 10 节。
export class DensityGovernor {
  private config: ResolvedDanmakuConfig;
  private _effectiveMaxOnScreen: number;
  private lastTickMs = -1;
  private readonly dtSamples: number[] = [];
  // 状态机：记录上次"低于 / 高于阈值"的起始时间，便于按 hold 时长判定。
  private downscaleSince = -1;
  private upscaleSince = -1;
  private onOverload: ((fps: number, effective: number) => void) | null = null;

  constructor(config: ResolvedDanmakuConfig) {
    this.config = config;
    this._effectiveMaxOnScreen = config.maxOnScreen;
  }

  get effectiveMaxOnScreen(): number {
    return this._effectiveMaxOnScreen;
  }

  // 由 controller 在 setMaxOnScreen / updateConfig 时调用，
  // 保证 effectiveMaxOnScreen ≤ 新上限。
  applyConfig(config: ResolvedDanmakuConfig): void {
    this.config = config;
    if (this._effectiveMaxOnScreen > config.maxOnScreen) {
      this._effectiveMaxOnScreen = config.maxOnScreen;
    }
  }

  setOnOverload(
    handler: ((fps: number, effective: number) => void) | null,
  ): void {
    this.onOverload = handler;
  }

  // 每次 RAF 的回调；timestampMs 是当帧时间戳（来自 performance.now()）。
  tick(timestampMs: number): void {
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

    const fps = 1000 / median(this.dtSamples);
    this.evaluate(fps, timestampMs);
  }

  private evaluate(fps: number, now: number): void {
    const { adaptive, maxOnScreen } = this.config;

    if (fps < adaptive.downscaleFps) {
      // 持续低于阈值的起点。
      if (this.downscaleSince < 0) this.downscaleSince = now;
      this.upscaleSince = -1;
      if (now - this.downscaleSince >= DOWNSCALE_HOLD_MS) {
        const next = Math.max(
          adaptive.minMaxOnScreen,
          Math.floor(this._effectiveMaxOnScreen * DOWNSCALE_FACTOR),
        );
        if (next < this._effectiveMaxOnScreen) {
          this._effectiveMaxOnScreen = next;
          this.onOverload?.(fps, next);
        }
        // 触发一次后立即重置时间窗口，避免连续降级到 0。
        this.downscaleSince = now;
      }
      return;
    }

    if (fps >= adaptive.upscaleFps) {
      if (this.upscaleSince < 0) this.upscaleSince = now;
      this.downscaleSince = -1;
      if (
        now - this.upscaleSince >= UPSCALE_HOLD_MS &&
        this._effectiveMaxOnScreen < maxOnScreen
      ) {
        this._effectiveMaxOnScreen = Math.min(
          maxOnScreen,
          this._effectiveMaxOnScreen + UPSCALE_STEP,
        );
        this.upscaleSince = now;
      }
      return;
    }

    // 处于 [downscaleFps, upscaleFps) 中间区间：reset 两个计时器。
    this.downscaleSince = -1;
    this.upscaleSince = -1;
  }
}

function median(arr: readonly number[]): number {
  const sorted = arr.slice().sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return 0;
  if (n % 2 === 1) return sorted[(n - 1) >>> 1]!;
  return (sorted[n / 2 - 1]! + sorted[n / 2]!) / 2;
}
