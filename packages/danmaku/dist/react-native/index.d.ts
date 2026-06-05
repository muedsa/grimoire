import * as react_jsx_runtime from 'react/jsx-runtime';
import { ReactNode } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { c as DanmakuController, T as TextMeasurer, n as DanmakuWeight, A as ActiveLayoutItem, d as DanmakuControllerOptions, o as TimelineSource } from '../controller-c5i1BvdK.js';
export { a as ActiveLayoutSnapshot, D as DanmakuAdaptiveConfig, b as DanmakuConfig, e as DanmakuEvent, i as DanmakuItem, j as DanmakuMergeConfig, k as DanmakuMode, m as DanmakuViewport } from '../controller-c5i1BvdK.js';
import { SharedValue } from 'react-native-reanimated';
import { SkFont } from '@shopify/react-native-skia';

interface DanmakuViewProps {
    controller: DanmakuController;
    style?: StyleProp<ViewStyle>;
    children?: ReactNode;
    onLayoutSize?: (size: {
        width: number;
        height: number;
    }) => void;
}
declare function DanmakuView({ controller, style, children, onLayoutSize, }: DanmakuViewProps): react_jsx_runtime.JSX.Element;

declare class SkiaTextMeasurer implements TextMeasurer {
    readonly baseFont: SkFont;
    readonly baseFontSize: number;
    private readonly typeface;
    private readonly fontPool;
    private readonly measureCache;
    constructor(baseFont: SkFont);
    measureText(text: string, fontSize: number, weight: DanmakuWeight): {
        width: number;
        height: number;
    };
    private measureTextWidthWebSafe;
    fontFor(fontSize: number, weight: DanmakuWeight): SkFont;
}

interface DanmakuTextNodeProps {
    item: ActiveLayoutItem;
    clock: SharedValue<number>;
    opacity: SharedValue<number>;
    measurer: SkiaTextMeasurer;
}
declare function DanmakuTextNode({ item, clock, opacity, measurer, }: DanmakuTextNodeProps): react_jsx_runtime.JSX.Element;

interface UseDanmakuControllerOptions extends Omit<DanmakuControllerOptions, "measurer"> {
    font: SkFont | null;
    timeline?: TimelineSource;
}
declare function useDanmakuController(options: UseDanmakuControllerOptions): DanmakuController;

export { ActiveLayoutItem, DanmakuController, DanmakuTextNode, DanmakuView, DanmakuWeight, SkiaTextMeasurer, TextMeasurer, TimelineSource, type UseDanmakuControllerOptions, useDanmakuController };
