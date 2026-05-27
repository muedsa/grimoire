import type {
  DanmakuAdaptiveConfig,
  DanmakuConfig,
  DanmakuMergeConfig,
  DanmakuSafeAreaInsets,
  ResolvedDanmakuConfig,
} from "./types";

// 全局默认配置；resolveDanmakuConfig 在用户未填字段时使用。
// 默认行为：merge / adaptive 均关闭，需要业务显式开启。
const DEFAULT_SAFE_AREA: Required<DanmakuSafeAreaInsets> = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

const DEFAULT_MERGE: Required<DanmakuMergeConfig> = {
  enabled: false,
  windowMs: 5000,
  minCount: 3,
};

const DEFAULT_ADAPTIVE_TARGET_FPS = 60;
const DEFAULT_ADAPTIVE_DOWNSCALE_TOLERANCE = 5;
const DEFAULT_ADAPTIVE_UPSCALE_TOLERANCE = 1;

const DEFAULT_ADAPTIVE: Required<DanmakuAdaptiveConfig> = {
  enabled: false,
  targetFps: DEFAULT_ADAPTIVE_TARGET_FPS,
  downscaleFps:
    DEFAULT_ADAPTIVE_TARGET_FPS - DEFAULT_ADAPTIVE_DOWNSCALE_TOLERANCE,
  upscaleFps: DEFAULT_ADAPTIVE_TARGET_FPS - DEFAULT_ADAPTIVE_UPSCALE_TOLERANCE,
  minMaxOnScreen: 30,
};

export const DEFAULT_DANMAKU_CONFIG: ResolvedDanmakuConfig = {
  scrollDurationMs: 8000,
  fixedDurationMs: 4000,
  maxOnScreen: 80,
  opacity: 1,
  rate: 1,
  fontScale: 1,
  displayArea: 1,
  trackGap: 4,
  defaultFontSize: 24,
  safeAreaInsets: DEFAULT_SAFE_AREA,
  merge: DEFAULT_MERGE,
  adaptive: DEFAULT_ADAPTIVE,
};

// 把"用户传入的部分配置"合并到默认配置，输出全字段填充的 ResolvedDanmakuConfig。
// adaptive.downscaleFps / upscaleFps 未填时按 targetFps 自动派生（设计文档 10.2）。
export function resolveDanmakuConfig(
  config: DanmakuConfig | undefined,
): ResolvedDanmakuConfig {
  if (!config) {
    return DEFAULT_DANMAKU_CONFIG;
  }

  const safeArea: Required<DanmakuSafeAreaInsets> = {
    ...DEFAULT_SAFE_AREA,
    ...config.safeAreaInsets,
  };

  const merge: Required<DanmakuMergeConfig> = {
    ...DEFAULT_MERGE,
    ...config.merge,
  };

  const targetFps =
    config.adaptive?.targetFps ?? DEFAULT_ADAPTIVE.targetFps;
  const adaptive: Required<DanmakuAdaptiveConfig> = {
    enabled: config.adaptive?.enabled ?? DEFAULT_ADAPTIVE.enabled,
    targetFps,
    downscaleFps:
      config.adaptive?.downscaleFps ??
      targetFps - DEFAULT_ADAPTIVE_DOWNSCALE_TOLERANCE,
    upscaleFps:
      config.adaptive?.upscaleFps ??
      targetFps - DEFAULT_ADAPTIVE_UPSCALE_TOLERANCE,
    minMaxOnScreen:
      config.adaptive?.minMaxOnScreen ?? DEFAULT_ADAPTIVE.minMaxOnScreen,
  };

  return {
    scrollDurationMs:
      config.scrollDurationMs ?? DEFAULT_DANMAKU_CONFIG.scrollDurationMs,
    fixedDurationMs:
      config.fixedDurationMs ?? DEFAULT_DANMAKU_CONFIG.fixedDurationMs,
    maxOnScreen: config.maxOnScreen ?? DEFAULT_DANMAKU_CONFIG.maxOnScreen,
    opacity: config.opacity ?? DEFAULT_DANMAKU_CONFIG.opacity,
    rate: config.rate ?? DEFAULT_DANMAKU_CONFIG.rate,
    fontScale: config.fontScale ?? DEFAULT_DANMAKU_CONFIG.fontScale,
    displayArea: config.displayArea ?? DEFAULT_DANMAKU_CONFIG.displayArea,
    trackGap: config.trackGap ?? DEFAULT_DANMAKU_CONFIG.trackGap,
    defaultFontSize:
      config.defaultFontSize ?? DEFAULT_DANMAKU_CONFIG.defaultFontSize,
    safeAreaInsets: safeArea,
    merge,
    adaptive,
  };
}
