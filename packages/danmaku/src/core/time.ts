// runtime-agnostic 的 RAF 循环 + 漂移修正。
// 不直接依赖浏览器的 requestAnimationFrame，构造时通过依赖注入传入。
// 让 controller 在 node 环境（vitest）下可用 setImmediate 桩。

export interface ClockRuntime {
  // 注册一次帧回调；通常映射到 globalThis.requestAnimationFrame。
  // 返回值是 raf 句柄，cancel 时传给 cancelRaf。
  requestRaf(handler: (timestampMs: number) => void): number;
  cancelRaf(handle: number): void;
  // 当前高精度时间（毫秒）；通常映射到 performance.now()。
  now(): number;
}

export const defaultClockRuntime: ClockRuntime = {
  requestRaf:
    typeof globalThis !== "undefined" &&
    typeof globalThis.requestAnimationFrame === "function"
      ? (h) => globalThis.requestAnimationFrame(h)
      : (h) => setTimeout(() => h(Date.now()), 16) as unknown as number,
  cancelRaf:
    typeof globalThis !== "undefined" &&
    typeof globalThis.cancelAnimationFrame === "function"
      ? (id) => globalThis.cancelAnimationFrame(id)
      : (id) => clearTimeout(id as unknown as ReturnType<typeof setTimeout>),
  now:
    typeof globalThis !== "undefined" &&
    typeof globalThis.performance?.now === "function"
      ? () => globalThis.performance.now()
      : () => Date.now(),
};

const SEEK_THRESHOLD_MS = 250;
const RESYNC_INTERVAL_MS = 1000;

export interface TimeKeeperOptions {
  runtime?: ClockRuntime;
  // 每帧拿到的"权威时间"，由 attachTimeline 提供。
  getAuthoritativeTime: () => number;
  isPlaying: () => boolean;
  // 实际推动 scheduler 的 tick；返回的时间作为下一次插值的锚点。
  onTick: (timeMs: number) => void;
  // 检测到 seek 时调用，传入新锚点时间。
  onSeek: (timeMs: number) => void;
}

interface AnchorState {
  authoritativeMs: number;
  rafMs: number;
}

// RAF 循环 + 漂移修正（设计文档 6.2）。
export class TimeKeeper {
  private readonly runtime: ClockRuntime;
  private readonly options: TimeKeeperOptions;
  private rafHandle: number | null = null;
  private anchor: AnchorState | null = null;
  private lastResyncMs = -1;

  constructor(options: TimeKeeperOptions) {
    this.runtime = options.runtime ?? defaultClockRuntime;
    this.options = options;
  }

  start(): void {
    if (this.rafHandle !== null) return;
    this.scheduleFrame();
  }

  stop(): void {
    if (this.rafHandle !== null) {
      this.runtime.cancelRaf(this.rafHandle);
      this.rafHandle = null;
    }
    this.anchor = null;
    this.lastResyncMs = -1;
  }

  // 外部主动同步（onSeek 回调 / 显式 seek）。
  syncTo(authoritativeMs: number): void {
    this.anchor = { authoritativeMs, rafMs: this.runtime.now() };
    this.lastResyncMs = this.anchor.rafMs;
  }

  private scheduleFrame(): void {
    this.rafHandle = this.runtime.requestRaf((rafMs) => {
      this.rafHandle = null;
      this.onFrame(rafMs);
      this.scheduleFrame();
    });
  }

  private onFrame(rafMs: number): void {
    if (!this.options.isPlaying()) {
      // 暂停：不前进时间，下次恢复时重新锚定。
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
    const interpolated =
      this.anchor.authoritativeMs + (rafMs - this.anchor.rafMs);
    if (Math.abs(authoritative - interpolated) > SEEK_THRESHOLD_MS) {
      // 视为 seek / 漂移过大；以权威值重新锚定。
      this.anchor = { authoritativeMs: authoritative, rafMs };
      this.lastResyncMs = rafMs;
      this.options.onSeek(authoritative);
      return;
    }
    if (rafMs - this.lastResyncMs >= RESYNC_INTERVAL_MS) {
      // 周期性温和重锚（避免本地时钟与权威时钟长期累积漂移）。
      this.anchor = { authoritativeMs: authoritative, rafMs };
      this.lastResyncMs = rafMs;
    }
    this.options.onTick(interpolated);
  }
}
