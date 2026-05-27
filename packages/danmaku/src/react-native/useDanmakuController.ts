import { useEffect, useState } from "react";
import {
  DanmakuController,
  type DanmakuControllerOptions,
  type DanmakuViewport,
  type TimelineSource,
} from "../core";
import type { SkFont } from "@shopify/react-native-skia";
import { SkiaTextMeasurer } from "./skia-measurer";

// useDanmakuController 的入参：基于 DanmakuControllerOptions，
// 但 measurer 由 hook 内部创建，font 由用户通过 RN-Skia 的 useFont 提供。
export interface UseDanmakuControllerOptions
  extends Omit<DanmakuControllerOptions, "measurer"> {
  // RN-Skia useFont 的返回值；可为 null（字体加载中）。
  // font 为 null 时 controller 仍会创建，使用 EstimateTextMeasurer 回退；
  // font 就绪后通过 useEffect 注入 SkiaTextMeasurer 替换。
  font: SkFont | null;
  timeline?: TimelineSource;
}

// React 适配层 hook：接收 RN-Skia useFont 返回的 SkFont（可为 null），
// 内部创建唯一的 SkiaTextMeasurer 并注入 DanmakuController。
// font 为 null 时 controller 仍会创建（使用 EstimateTextMeasurer 回退测量），
// font 就绪后通过 useEffect 注入 SkiaTextMeasurer 替换。
export function useDanmakuController(
  options: UseDanmakuControllerOptions,
): DanmakuController {
  const { font, timeline, ...rest } = options;

  // 创建 controller；若 font 已就绪则同步传入 SkiaTextMeasurer，否则回退到 EstimateTextMeasurer。
  const [controller] = useState(() => {
    return new DanmakuController({
      ...rest,
      measurer: font
        ? new SkiaTextMeasurer(font)
        : undefined,
    });
  });

  // font 就绪后注入真正的 SkiaTextMeasurer（替换 EstimateTextMeasurer 回退）。
  useEffect(() => {
    if (!font) return;
    controller.setMeasurer(new SkiaTextMeasurer(font));
  }, [controller, font]);

  // 同步 viewport。
  const { width, height } = rest.viewport;
  useEffect(() => {
    controller.setViewport({ width, height });
  }, [controller, width, height]);

  // 同步 timeline。
  useEffect(() => {
    if (!timeline) return;
    controller.attachTimeline(timeline);
    return () => {
      controller.detachTimeline();
    };
  }, [controller, timeline]);

  // 卸载时销毁 controller。
  useEffect(() => {
    return () => {
      controller.destroy();
    };
  }, [controller]);

  return controller;
}

// 暴露 viewport / timeline 类型给消费者。
export type { DanmakuViewport, TimelineSource };
