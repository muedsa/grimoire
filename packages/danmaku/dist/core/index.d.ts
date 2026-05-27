import { R as ResolvedDanmakuConfig, D as DanmakuConfig, T as TextMeasurer, a as DanmakuWeight } from '../controller-DHE-XzKf.js';
export { A as ActiveLayoutItem, b as ActiveLayoutSnapshot, c as DanmakuAdaptiveConfig, d as DanmakuController, e as DanmakuControllerOptions, f as DanmakuEvent, g as DanmakuEventHandler, h as DanmakuEventOf, i as DanmakuEventType, j as DanmakuItem, k as DanmakuMergeConfig, l as DanmakuMode, m as DanmakuSafeAreaInsets, n as DanmakuViewport, o as TimelineSource } from '../controller-DHE-XzKf.js';

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
