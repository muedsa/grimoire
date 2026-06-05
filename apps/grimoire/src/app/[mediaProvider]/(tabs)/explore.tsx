// 首页/探索页 — 展示媒体提供者的首页内容分区

import { LoadingScreen } from "@/components/Loading";
import { MediaCardList } from "@/components/MediaCardList";
import ScreenWrapper from "@/components/ScreenWapper";
import { TVFocusGuideView } from "@/components/TVFocusGuideView";
import { useScreenBackgroundImage } from "@/contexts/ScreenBackgroundImageContext";
import { useSnackbar } from "@/contexts/SnackbarContext";
import { useMediaProvider } from "@/hooks/use-media-provider";
import { MediaItem, type MediaSection } from "@grimoire/conduit";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ScrollView } from "react-native";
import { IconButton } from "react-native-paper";

export default function Explore() {
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const { provider, executeFeature } = useMediaProvider();
  const { changeScreenBackgroundImage } = useScreenBackgroundImage();
  const [mediaSections, setMediaSections] = useState<MediaSection[] | null>(
    null,
  );

  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (provider !== null) {
      setMediaSections(null);
      executeFeature("media-explore", null)
        .then((sections) => {
          setMediaSections(sections);
          if (
            sections.length > 0 &&
            sections[0].items.length > 0 &&
            sections[0].items[0].cover
          ) {
            changeScreenBackgroundImage(sections[0].items[0].cover, "blur");
          }
        })
        .catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : "加载失败";
          showSnackbar(msg);
          setMediaSections([]);
        });
    }
  }, [provider, executeFeature, refresh]);

  const onFocusedItem = useCallback(
    (item: MediaItem, index: number) => {
      changeScreenBackgroundImage(item.cover, "blur");
    },
    [changeScreenBackgroundImage],
  );

  const onPressedItem = useCallback((item: MediaItem, index: number) => {
    router.navigate({
      pathname: `/[mediaProvider]/detail`,
      params: {
        mediaProvider: provider?.namespace ?? "unknown",
        mediaId: item.id,
      },
    });
  }, []);

  if (provider === null || mediaSections === null) {
    return <LoadingScreen />;
  }

  const renderItem = ({ item }: { item: MediaSection }) => (
    <MediaCardList
      key={item.title}
      section={item}
      onFocusedItem={onFocusedItem}
      onPressedItem={onPressedItem}
    />
  );

  return (
    <ScreenWrapper>
      <TVFocusGuideView autoFocus style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: 20 }}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        >
          {mediaSections?.map((section) => renderItem({ item: section }))}
          <IconButton
            mode="outlined"
            icon="refresh"
            onPress={() => setRefresh((r) => r + 1)}
          />
        </ScrollView>
      </TVFocusGuideView>
    </ScreenWrapper>
  );
}
