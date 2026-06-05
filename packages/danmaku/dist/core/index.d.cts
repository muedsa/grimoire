import { R as ResolvedDanmakuConfig, b as DanmakuConfig, T as TextMeasurer, n as DanmakuWeight } from '../controller-c5i1BvdK.cjs';
export { A as ActiveLayoutItem, a as ActiveLayoutSnapshot, D as DanmakuAdaptiveConfig, c as DanmakuController, d as DanmakuControllerOptions, e as DanmakuEvent, f as DanmakuEventHandler, g as DanmakuEventOf, h as DanmakuEventType, i as DanmakuItem, j as DanmakuMergeConfig, k as DanmakuMode, l as DanmakuSafeAreaInsets, m as DanmakuViewport, o as TimelineSource } from '../controller-c5i1BvdK.cjs';

declare const DEFAULT_DANMAKU_CONFIG: ResolvedDanmakuConfig;
declare function resolveDanmakuConfig(config: DanmakuConfig | undefined): ResolvedDanmakuConfig;

interface CacheEntry {
    width: number;
    height: number;
}
interface EstimateTextMeasurerOptions {
    cacheSize?: number;
}
declare class EstimateTextMeasurer implements TextMeasurer {
    private readonly cacheSize;
    private readonly cache;
    constructor(options?: EstimateTextMeasurerOptions);
    measureText(text: string, fontSize: number, weight: DanmakuWeight): CacheEntry;
}

export { DEFAULT_DANMAKU_CONFIG, DanmakuConfig, DanmakuWeight, EstimateTextMeasurer, type EstimateTextMeasurerOptions, ResolvedDanmakuConfig, TextMeasurer, resolveDanmakuConfig };
