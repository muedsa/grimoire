import { type RuleDefinition } from "@grimoire/rune";
import { MediaDetail, MediaSection } from "./media";

/** 媒体提供者元数据 — 描述提供者的基本信息 */
export type MediaProviderMetadata = {
  readonly namespace: string;
  readonly name: string;
  readonly author: string;
  readonly url: string;
  readonly version: string;
  readonly versionCode: number;
};

/** 媒体提供者 — 元数据 + 功能规则列表 */
export type MediaProvider = MediaProviderMetadata & {
  readonly features: RuleDefinition[];
};

/** 媒体提供者功能执行参数 */
export type MediaProviderParms = {
  "media-explore": null;
  "media-detail": {
    mediaId: string;
  };
};

/** 媒体提供者功能执行结果 */
export type MediaProviderFeatureResult = {
  "media-explore": MediaSection[];
  "media-detail": MediaDetail;
};

/* 媒体提供者支持的功能类型 */
export type MediaProviderFeature = keyof MediaProviderFeatureResult;
