type DanmakuMode = "scroll" | "top" | "bottom";
type DanmakuWeight = "normal" | "bold";
interface DanmakuItem {
    id: string;
    time: number;
    text: string;
    mode?: DanmakuMode;
    color?: string;
    fontSize?: number;
    weight?: DanmakuWeight;
    userId?: string;
    borderColor?: string;
    meta?: Record<string, unknown>;
}
interface DanmakuSafeAreaInsets {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
}
interface DanmakuMergeConfig {
    enabled: boolean;
    windowMs?: number;
    minCount?: number;
}
interface DanmakuAdaptiveConfig {
    enabled: boolean;
    targetFps?: number;
    downscaleFps?: number;
    upscaleFps?: number;
    minMaxOnScreen?: number;
}
interface DanmakuConfig {
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
interface ResolvedDanmakuConfig {
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
interface ActiveLayoutItem {
    id: string;
    text: string;
    color: string;
    fontSize: number;
    weight: DanmakuWeight;
    borderColor?: string;
    mode: DanmakuMode;
    width: number;
    height: number;
    trackY: number;
    startTimeMs: number;
    durationMs: number;
    startX: number;
    endX: number;
    mergeCount: number;
}
interface ActiveLayoutSnapshot {
    timeMs: number;
    items: ActiveLayoutItem[];
    version: number;
}
interface TextMeasurer {
    measureText(text: string, fontSize: number, weight: DanmakuWeight): {
        width: number;
        height: number;
    };
}
interface DanmakuViewport {
    width: number;
    height: number;
}
interface TimelineSource {
    getCurrentTime: () => number;
    isPlaying: () => boolean;
    onSeek?: (handler: (timeMs: number) => void) => () => void;
}
type DanmakuEvent = {
    type: "tick";
    timeMs: number;
} | {
    type: "layout";
    snapshot: ActiveLayoutSnapshot;
} | {
    type: "overload";
    fps: number;
    effectiveMaxOnScreen: number;
} | {
    type: "warn";
    code: "no-measurer" | "no-font" | "web-system-font";
    message: string;
} | {
    type: "error";
    error: Error;
};
type DanmakuEventType = DanmakuEvent["type"];
type DanmakuEventOf<T extends DanmakuEventType> = Extract<DanmakuEvent, {
    type: T;
}>;
type DanmakuEventHandler<T extends DanmakuEventType> = (event: DanmakuEventOf<T>) => void;

interface ClockRuntime {
    requestRaf(handler: (timestampMs: number) => void): number;
    cancelRaf(handle: number): void;
    now(): number;
}

interface DanmakuControllerOptions {
    items?: DanmakuItem[];
    config?: DanmakuConfig;
    viewport: DanmakuViewport;
    measurer?: TextMeasurer;
    clockRuntime?: ClockRuntime;
}
declare class DanmakuController {
    private store;
    private readonly filter;
    private readonly merger;
    private allocator;
    private scheduler;
    private density;
    private timeKeeper;
    private readonly bus;
    private config;
    private viewport;
    private measurer;
    private clockRuntime;
    private detachOnSeek;
    private paused;
    private visible;
    private destroyed;
    private lastSnapshot;
    constructor(options: DanmakuControllerOptions);
    get opacity(): number;
    attachTimeline(source: TimelineSource): void;
    detachTimeline(): void;
    tick(timeMs: number): ActiveLayoutSnapshot;
    seek(timeMs: number): ActiveLayoutSnapshot;
    append(items: DanmakuItem[]): void;
    setItems(items: DanmakuItem[]): void;
    clearItems(): void;
    pause(): void;
    resume(): void;
    setVisible(visible: boolean): void;
    setRate(rate: number): void;
    setBlockedKeywords(words: readonly string[]): void;
    setBlockedPatterns(patterns: readonly RegExp[]): void;
    setBlockedUserIds(ids: readonly string[]): void;
    setBlockedModes(modes: readonly DanmakuMode[]): void;
    setFilter(predicate: ((item: DanmakuItem) => boolean) | null): void;
    setOpacity(opacity: number): void;
    setFontScale(scale: number): void;
    setDisplayArea(ratio: number): void;
    setMaxOnScreen(n: number): void;
    setViewport(viewport: DanmakuViewport): void;
    updateConfig(patch: Partial<DanmakuConfig>): void;
    setMerge(config: DanmakuMergeConfig): void;
    setAdaptive(config: DanmakuAdaptiveConfig): void;
    setMeasurer(measurer: TextMeasurer): void;
    getMeasurer(): TextMeasurer;
    on<T extends DanmakuEventType>(type: T, handler: DanmakuEventHandler<T>): () => void;
    destroy(): void;
    private onTick;
    private emitLayout;
    private serializeConfig;
}

export { type ActiveLayoutItem as A, type DanmakuConfig as D, type ResolvedDanmakuConfig as R, type TextMeasurer as T, type DanmakuWeight as a, type ActiveLayoutSnapshot as b, type DanmakuAdaptiveConfig as c, DanmakuController as d, type DanmakuControllerOptions as e, type DanmakuEvent as f, type DanmakuEventHandler as g, type DanmakuEventOf as h, type DanmakuEventType as i, type DanmakuItem as j, type DanmakuMergeConfig as k, type DanmakuMode as l, type DanmakuSafeAreaInsets as m, type DanmakuViewport as n, type TimelineSource as o };
