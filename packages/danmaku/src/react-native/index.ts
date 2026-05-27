// @grimoire/danmaku/react-native 子入口。
// 依赖 react / react-native / @shopify/react-native-skia / react-native-reanimated。
export { DanmakuView } from "./DanmakuView";
export { DanmakuTextNode } from "./DanmakuTextNode";
export {
  useDanmakuController,
  type UseDanmakuControllerOptions,
} from "./useDanmakuController";
export { SkiaTextMeasurer } from "./skia-measurer";
// 二次导出 core 类型，方便消费者 import 一个子入口。
export type {
  ActiveLayoutItem,
  ActiveLayoutSnapshot,
  DanmakuAdaptiveConfig,
  DanmakuConfig,
  DanmakuEvent,
  DanmakuItem,
  DanmakuMergeConfig,
  DanmakuMode,
  DanmakuViewport,
  DanmakuWeight,
  TextMeasurer,
  TimelineSource,
} from "../core";
export { DanmakuController } from "../core";
