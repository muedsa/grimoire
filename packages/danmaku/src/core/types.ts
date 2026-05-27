// 通用弹幕库的公共类型定义。所有类型均经由 core/index.ts 二次导出，
// 业务侧通过 import { ... } from "@grimoire/danmaku" 使用。

export type DanmakuMode = "scroll" | "top" | "bottom";
export type DanmakuWeight = "normal" | "bold";

// 输入弹幕；唯一时间单位为毫秒（整数）。
export interface DanmakuItem {
  // 去重主键，必填。同 id 后到的会被静默丢弃。
  id: string;
  // 弹幕出现的播放时间，单位毫秒（整数）。
  time: number;
  // 弹幕文本（不支持 HTML / Markdown / 图片）。
  text: string;
  // 默认 'scroll'。
  mode?: DanmakuMode;
  // CSS 颜色字符串，默认 '#ffffff'。
  color?: string;
  // 默认取自 config.defaultFontSize。
  fontSize?: number;
  // 默认 'normal'。
  weight?: DanmakuWeight;
  // 用户 id，仅作为屏蔽用户的索引；可选。
  userId?: string;
  // 描边色，可选；启用后渲染层会在文本下铺一层同形状描边以提升可读性。
  borderColor?: string;
  // 透传业务字段，供自定义 filter 使用，库不解读内容。
  meta?: Record<string, unknown>;
}

// 安全区，所有字段单位像素，默认全 0。
export interface DanmakuSafeAreaInsets {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

// 合并配置。
export interface DanmakuMergeConfig {
  enabled: boolean;
  // 合并窗口长度，单位毫秒，默认 5000。
  windowMs?: number;
  // 触发合并的最小重复次数，默认 3。
  minCount?: number;
}

// 密度自适应配置；典型预设见设计文档 10.3。
export interface DanmakuAdaptiveConfig {
  enabled: boolean;
  // 目标 fps，默认 60。
  targetFps?: number;
  // 降级触发硬阈值，默认 targetFps - 5。
  downscaleFps?: number;
  // 回升触发硬阈值，默认 targetFps - 1。
  upscaleFps?: number;
  // 降级下限，默认 30。
  minMaxOnScreen?: number;
}

// 运行时配置，所有字段可在运行时通过 updateConfig / 专用 setter 修改。
export interface DanmakuConfig {
  scrollDurationMs?: number;
  fixedDurationMs?: number;
  maxOnScreen?: number;
  opacity?: number;
  rate?: number;
  fontScale?: number;
  displayArea?: number;
  trackGap?: number;
  defaultFontSize?: number;
  safeAreaInsets?: DanmakuSafeAreaInsets;
  merge?: DanmakuMergeConfig;
  adaptive?: DanmakuAdaptiveConfig;
}

// 已 resolve 的配置；所有可选字段都填上默认值。供内部使用。
export interface ResolvedDanmakuConfig {
  scrollDurationMs: number;
  fixedDurationMs: number;
  maxOnScreen: number;
  opacity: number;
  rate: number;
  fontScale: number;
  displayArea: number;
  trackGap: number;
  defaultFontSize: number;
  safeAreaInsets: Required<DanmakuSafeAreaInsets>;
  merge: Required<DanmakuMergeConfig>;
  adaptive: Required<DanmakuAdaptiveConfig>;
}

// core → 渲染层契约：稳定的"在屏弹幕"描述，不含动态 x。
export interface ActiveLayoutItem {
  id: string;
  text: string;
  color: string;
  // 已乘 fontScale 后的最终字号。
  fontSize: number;
  weight: DanmakuWeight;
  borderColor?: string;
  mode: DanmakuMode;
  // 文本宽度（来自 TextMeasurer）。
  width: number;
  // 文本高度（来自 TextMeasurer）。
  height: number;
  // 已分配的纵向轨道位置（视口坐标，像素）。
  trackY: number;
  // 此 layout 节点的"出生时间锚点"，单位毫秒。
  // 渲染层用此值 + clock.value 计算插值进度。
  // 合并场景下，id 是"代表弹幕"的 id，被合并掉的不出现。
  startTimeMs: number;
  // 此弹幕的总生命周期长度，单位毫秒。
  durationMs: number;
  // 滚动弹幕的轨迹端点；top/bottom 模式时 startX === endX。
  startX: number;
  endX: number;
  // 合并次数；非合并弹幕为 1。渲染层在 >= minCount 时追加 "×N"。
  mergeCount: number;
}

// 由 scheduler / controller 输出的当前帧快照。
export interface ActiveLayoutSnapshot {
  timeMs: number;
  items: ActiveLayoutItem[];
  // 集合按 id 变化或 mergeCount 变化时 +1，渲染层据此 setState。
  version: number;
}

// 文本测量器接口；纯同步，core 与适配层共同遵循。
export interface TextMeasurer {
  measureText(
    text: string,
    fontSize: number,
    weight: DanmakuWeight,
  ): { width: number; height: number };
}

// 视口尺寸；轨道分配的输入。
export interface DanmakuViewport {
  width: number;
  height: number;
}

// 时间源；attachTimeline 的入参。
export interface TimelineSource {
  // 必须返回毫秒整数；库每帧调用一次。
  getCurrentTime: () => number;
  isPlaying: () => boolean;
  // 可选；若宿主能感知 seek，调用 handler(timeMs) 让库立即重建。
  // 返回 unsubscribe 函数，由库在 detachTimeline 时调用。
  onSeek?: (handler: (timeMs: number) => void) => () => void;
}

// 事件类型联合体；on(type, handler) 据此返回正确的 handler 签名。
export type DanmakuEvent =
  | { type: "tick"; timeMs: number }
  | { type: "layout"; snapshot: ActiveLayoutSnapshot }
  | { type: "overload"; fps: number; effectiveMaxOnScreen: number }
  | {
      type: "warn";
      code: "no-measurer" | "no-font" | "web-system-font";
      message: string;
    }
  | { type: "error"; error: Error };

export type DanmakuEventType = DanmakuEvent["type"];

export type DanmakuEventOf<T extends DanmakuEventType> = Extract<
  DanmakuEvent,
  { type: T }
>;

export type DanmakuEventHandler<T extends DanmakuEventType> = (
  event: DanmakuEventOf<T>,
) => void;
