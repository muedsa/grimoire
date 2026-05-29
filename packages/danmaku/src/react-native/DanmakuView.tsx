import { Canvas } from "@shopify/react-native-skia";
import { useEffect, useState, type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import type { ActiveLayoutSnapshot, DanmakuController } from "../core";
import { DanmakuTextNode } from "./DanmakuTextNode";
import { SkiaTextMeasurer } from "./skia-measurer";

interface DanmakuViewProps {
  controller: DanmakuController;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  onLayoutSize?: (size: { width: number; height: number }) => void;
}

const EMPTY_SNAPSHOT: ActiveLayoutSnapshot = {
  timeMs: 0,
  items: [],
  version: 0,
};

// 容器组件；focusable=false + pointerEvents="none" 让 TV 遥控器与触摸都不会停留在弹幕层。
export function DanmakuView({
  controller,
  style,
  children,
  onLayoutSize,
}: DanmakuViewProps) {
  const [snapshot, setSnapshot] =
    useState<ActiveLayoutSnapshot>(EMPTY_SNAPSHOT);
  const clock = useSharedValue(0);
  const opacity = useSharedValue(controller.opacity);

  // 从 controller 内部获取唯一的 measurer，无需外部传入。
  // font 加载中时 measurer 为 EstimateTextMeasurer（不含 fontFor 方法），
  // 仅 SkiaTextMeasurer 可用时才渲染弹幕节点。
  const rawMeasurer = controller.getMeasurer();
  const measurer = rawMeasurer instanceof SkiaTextMeasurer ? rawMeasurer : null;

  useEffect(() => {
    const offLayout = controller.on("layout", ({ snapshot: snap }) => {
      setSnapshot(snap);
      opacity.value = controller.opacity;
    });
    const offTick = controller.on("tick", ({ timeMs }) => {
      clock.value = timeMs;
    });
    return () => {
      offLayout();
      offTick();
    };
  }, [controller, clock, opacity]);

  return (
    <View
      style={[styles.container, style]}
      focusable={false}
      pointerEvents="none"
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        controller.setViewport({ width, height });
        onLayoutSize?.({ width, height });
      }}
    >
      <Canvas style={styles.canvas} pointerEvents="none">
        {measurer &&
          snapshot.items.map((item) => (
            <DanmakuTextNode
              key={item.id}
              item={item}
              clock={clock}
              opacity={opacity}
              measurer={measurer}
            />
          ))}
      </Canvas>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
    pointerEvents: "none",
  },
  canvas: {
    ...StyleSheet.absoluteFill,
  },
});
