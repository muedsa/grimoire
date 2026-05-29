import { RuleDefinition } from '@grimoire/rune';

type MediaItem = {
    id: string;
    title: string;
    cover: string;
    subtitle?: string;
};
type MediaSection = {
    title: string;
    items: MediaItem[];
    aspectRatio: number;
};
type EpisodeGroup = {
    sourceName: string;
    list: {
        id: string;
        name: string;
    }[];
};
type MediaDetail = MediaItem & {
    description?: string;
    episodes: EpisodeGroup[];
};
type HttpPlayUrlResult = {
    url: string;
    headers?: Record<string, string>;
};

/** 媒体提供者元数据 — 描述提供者的基本信息 */
type MediaProviderMetadata = {
    readonly namespace: string;
    readonly name: string;
    readonly author: string;
    readonly url: string;
    readonly version: string;
    readonly versionCode: number;
};
/** 媒体提供者 — 元数据 + 功能规则列表 */
type MediaProvider = MediaProviderMetadata & {
    readonly features: RuleDefinition[];
};
/** 媒体提供者功能执行参数 */
type MediaProviderParms = {
    "media-explore": null;
    "media-detail": {
        mediaId: string;
    };
};
/** 媒体提供者功能执行结果 */
type MediaProviderFeatureResult = {
    "media-explore": MediaSection[];
    "media-detail": MediaDetail;
};
type MediaProviderFeature = keyof MediaProviderFeatureResult;

declare class MediaProviderManager {
    private providers;
    private engines;
    /** 懒加载的 schema 校验器 */
    private validator;
    /** 从 JSON 字符串加载并校验 media provider */
    loadProviderFromJson(dataStr: string): MediaProvider;
    /** 注册媒体提供者，并为其创建规则引擎实例 */
    registerProvider(provider: MediaProvider): void;
    /** 注销媒体提供者 */
    unregisterProvider(namespace: string): void;
    /** 根据 namespace 获取媒体提供者 */
    getProvider(id: string): MediaProvider | undefined;
    /** 列出所有已注册提供者的元数据（不含 features） */
    listProviderMetadata(): MediaProviderMetadata[];
    /** 执行指定提供者的某个功能 */
    executeFeature<Feat extends MediaProviderFeature>(namespace: string, feature: Feat, params: MediaProviderParms[Feat]): Promise<MediaProviderFeatureResult[Feat]>;
}

export { type EpisodeGroup, type HttpPlayUrlResult, type MediaDetail, type MediaItem, type MediaProvider, type MediaProviderFeature, type MediaProviderFeatureResult, MediaProviderManager, type MediaProviderMetadata, type MediaProviderParms, type MediaSection };
