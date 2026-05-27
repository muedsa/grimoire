import { Text, Group } from "@shopify/react-native-skia";
import { useDerivedValue, type SharedValue } from "react-native-reanimated";
import { Platform } from "react-native";
import type { ActiveLayoutItem } from "../core";
import type { SkiaTextMeasurer } from "./skia-measurer";

interface DanmakuTextNodeProps {
  item: ActiveLayoutItem;
  // UI thread 时钟（毫秒）。
  clock: SharedValue<number>;
  // UI thread 全局透明度。
  opacity: SharedValue<number>;
  // 字体测量器；由 DanmakuView 从 controller.getMeasurer() 获取后传入。
  measurer: SkiaTextMeasurer;
}

// 单条弹幕的 Skia 节点。
// x 通过 useDerivedValue 派生：完全在 UI thread 运行，不触发 React reconcile。
export function DanmakuTextNode({
  item,
  clock,
  opacity,
  measurer,
}: DanmakuTextNodeProps) {
  const x = useDerivedValue(() => {
    "worklet";
    const elapsed = clock.value - item.startTimeMs;
    if (elapsed <= 0) return item.startX;
    if (elapsed >= item.durationMs) return item.endX;
    const p = elapsed / item.durationMs;
    return item.startX + p * (item.endX - item.startX);
  }, [item.startTimeMs, item.durationMs, item.startX, item.endX]);

  // y 是稳定值；不需要派生。
  const y = item.trackY + item.fontSize;
  const text =
    item.mergeCount > 1 ? `${item.text} ×${item.mergeCount}` : item.text;
  const font = measurer.fontFor(item.fontSize, item.weight);

  // Web 端使用 baseFont + scale 变换渲染不同字号；
  // CanvasKit WASM 中 font.getTypeface() 返回的是借用指针，无法用于创建新 SkFont。
  const scale =
    measurer.baseFontSize > 0
      ? item.fontSize / measurer.baseFontSize
      : 1;
  const needsScale =
    Platform.OS === "web" && Math.abs(scale - 1) > 0.001;

  // 始终计算 scaledX（避免 React hooks 条件调用）。
  const scaledX = useDerivedValue(() => {
    return x.value / scale;
  }, [x, scale]);

  if (needsScale) {
    const effectiveFont = measurer.baseFont;
    return (
      <Group transform={[{ scale }]}>
        <Text
          x={scaledX}
          y={y / scale}
          text={text}
          font={effectiveFont as never}
          color={item.color}
          opacity={opacity}
        />
      </Group>
    );
  }

  return (
    <Text
      x={x}
      y={y}
      text={text}
      font={font as never}
      color={item.color}
      opacity={opacity}
    />
  );
}
