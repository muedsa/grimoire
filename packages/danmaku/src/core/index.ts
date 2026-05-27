// @grimoire/danmaku 核心入口；零运行时依赖，可在 Node 下用 vitest 测试。
export { DEFAULT_DANMAKU_CONFIG, resolveDanmakuConfig } from "./config";
export { DanmakuController } from "./controller";
export type { DanmakuControllerOptions } from "./controller";
export { EstimateTextMeasurer } from "./measurer";
export type { EstimateTextMeasurerOptions } from "./measurer";
export type {
  ActiveLayoutItem,
  ActiveLayoutSnapshot,
  DanmakuAdaptiveConfig,
  DanmakuConfig,
  DanmakuEvent,
  DanmakuEventHandler,
  DanmakuEventOf,
  DanmakuEventType,
  DanmakuItem,
  DanmakuMergeConfig,
  DanmakuMode,
  DanmakuSafeAreaInsets,
  DanmakuViewport,
  DanmakuWeight,
  ResolvedDanmakuConfig,
  TextMeasurer,
  TimelineSource,
} from "./types";
