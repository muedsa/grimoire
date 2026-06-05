// useMediaProvider — 根据路由参数 mediaProvider（即 namespace）
// 获取当前提供者的元数据，并返回绑定了 namespace 的 executeFeature

import { useConduit } from "@/contexts/ConduitContext";
import {
  type MediaProviderMetadata,
  type MediaProviderFeature,
  type MediaProviderParms,
  type MediaProviderFeatureResult,
} from "@grimoire/conduit";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useMemo } from "react";

type UseMediaProviderResult = {
  /** 当前提供者元数据，未找到时为 null */
  provider: MediaProviderMetadata | null;
  /** 绑定了当前 namespace 的 executeFeature，provider 为 null 时不可用 */
  executeFeature: <F extends MediaProviderFeature>(
    feature: F,
    params: MediaProviderParms[F],
  ) => Promise<MediaProviderFeatureResult[F]>;
};

export function useMediaProvider(): UseMediaProviderResult {
  const { mediaProvider } = useLocalSearchParams<{
    mediaProvider: string;
  }>();
  const { getProvider, executeFeature: contextExecute } = useConduit();

  const provider = useMemo(
    () =>
      mediaProvider && typeof mediaProvider === "string"
        ? (getProvider(mediaProvider) ?? null)
        : null,
    [mediaProvider, getProvider],
  );

  const executeFeature = useCallback(
    <F extends MediaProviderFeature>(
      feature: F,
      params: MediaProviderParms[F],
    ): Promise<MediaProviderFeatureResult[F]> => {
      if (!mediaProvider || typeof mediaProvider !== "string") {
        throw new Error("mediaProvider 未设置");
      }
      return contextExecute(mediaProvider, feature, params);
    },
    [mediaProvider, contextExecute],
  );

  return { provider, executeFeature };
}
