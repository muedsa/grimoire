import type { DanmakuItem } from "@grimoire/danmaku";

// 单位毫秒。
export const DEMO_DURATION_MS = 18_000;

export const DEMO_DANMAKU_ITEMS: DanmakuItem[] = [
  {
    id: "welcome",
    time: 400,
    text: "Grimoire Danmaku 多端示例",
    mode: "top",
    color: "#f8fafc",
    fontSize: 30,
    weight: "bold",
  },
  { id: "android", time: 1000, text: "Android / iOS / Web / TV 使用同一套调度接口", color: "#7dd3fc" },
  { id: "scheduler", time: 2200, text: "DanmakuScheduler 根据 currentTime 生成当前帧", color: "#bef264" },
  { id: "skia", time: 3400, text: "这里用 Skia Canvas 直接绘制弹幕文本", color: "#fda4af" },
  { id: "top", time: 4200, text: "顶部固定弹幕", mode: "top", color: "#fde68a" },
  { id: "bottom", time: 5200, text: "底部固定弹幕", mode: "bottom", color: "#c4b5fd" },
  { id: "safe-area", time: 6400, text: "safeAreaInsets 会参与轨道与坐标计算", color: "#67e8f9" },
  { id: "density", time: 7200, text: "maxOnScreen 控制同屏弹幕密度", color: "#bbf7d0" },
  { id: "seek", time: 8400, text: "重播时会重新构建当前时间窗口", color: "#fecdd3" },
  { id: "tv", time: 9500, text: "TV 端建议使用更低密度和更大字号", color: "#ddd6fe", fontSize: 28 },
  { id: "long-1", time: 10200, text: "滚动轨道会尽量避免碰撞", color: "#fef3c7" },
  { id: "long-2", time: 10800, text: "大字号弹幕也会参与轨道高度计算", color: "#bae6fd", fontSize: 32 },
  {
    id: "finish",
    time: 14000,
    text: "示例结束，点击重播继续观察",
    mode: "top",
    color: "#ffffff",
    fontSize: 30,
    weight: "bold",
  },
];
