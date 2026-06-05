import { LoadingScreen } from "@/components/Loading";
import ScreenWrapper from "@/components/ScreenWapper";
import { useScreenBackgroundImage } from "@/contexts/ScreenBackgroundImageContext";
import { useSnackbar } from "@/contexts/SnackbarContext";
import { useMediaProvider } from "@/hooks/use-media-provider";
import { MediaDetail } from "@grimoire/conduit";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { Button, Text, useTheme } from "react-native-paper";
import { ScrollView, StyleSheet, View } from "react-native";
import { useScreenDimensions } from "@/hooks/use-screen-dimensions";
import { TVFocusGuideView } from "@/components/TVFocusGuideView";

export default function Detail() {
  const { mediaId } = useLocalSearchParams<{
    mediaId: string;
  }>();
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const { provider, executeFeature } = useMediaProvider();
  const { changeScreenBackgroundImage } = useScreenBackgroundImage();
  const styles = useDetailScreenStyles();
  const [mediaDetail, setMediaDetail] = useState<MediaDetail | null>(null);

  const [playSource, setPlaySource] = useState<string>("TODO");

  useEffect(() => {
    if (provider !== null && mediaId) {
      setMediaDetail(null);
      executeFeature("media-detail", { mediaId: mediaId })
        .then((mediaDetail) => {
          setMediaDetail(mediaDetail);
          if (mediaDetail.cover) {
            changeScreenBackgroundImage(mediaDetail.cover, "scrim");
          }
        })
        .catch((e: unknown) => {
          const msg = e instanceof Error ? e.message : "加载失败";
          showSnackbar(msg);
          setMediaDetail(null);
        });
    }
  }, [provider, mediaId, executeFeature]);

  if (!mediaDetail) {
    return <LoadingScreen />;
  }

  return (
    <ScreenWrapper>
      <ScrollView
        style={styles.container}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      >
        {mediaDetail.subtitle ? (
          <Text
            style={styles.subtitle}
            variant="displaySmall"
            numberOfLines={1}
          >
            {mediaDetail.subtitle}
          </Text>
        ) : null}
        <Text style={styles.title} variant="displayLarge" numberOfLines={2}>
          {mediaDetail.title}
        </Text>
        {mediaDetail.description ? (
          <Text
            style={styles.description}
            variant="bodyLarge"
            numberOfLines={6}
          >
            {mediaDetail.description}
          </Text>
        ) : null}
        <TVFocusGuideView autoFocus>
          <View style={styles.controlGroup}>
            <Text variant="headlineMedium">播放源:</Text>
            <Button
              mode="text"
              dark={true}
              compact={true}
              onPress={() => {}}
              labelStyle={styles.controlGroupBtnLabel}
            >
              {playSource}
            </Button>
          </View>
          <View>
            <Button
              mode="contained"
              dark={true}
              compact={true}
              onPress={() => {
                router.navigate({
                  pathname: `/[mediaProvider]/playback`,
                  params: {
                    mediaProvider: provider?.namespace ?? "unknown",
                    videoSource:
                      "https://media.w3.org/2010/05/sintel/trailer.mp4",
                  },
                });
              }}
              labelStyle={styles.controlGroupBtnLabel}
            >
              {"第一集"}
            </Button>
          </View>
        </TVFocusGuideView>
      </ScrollView>
    </ScreenWrapper>
  );
}

const useDetailScreenStyles = () => {
  const { spacing } = useScreenDimensions();
  const theme = useTheme();
  return StyleSheet.create({
    container: {
      padding: spacing.six,
    },
    subtitle: {
      maxWidth: "70%",
    },
    title: {
      maxWidth: "80%",
    },
    description: {
      maxWidth: "70%",
    },
    controlGroup: {
      paddingVertical: spacing.three,
      flexDirection: "row",
      justifyContent: "flex-start",
      alignItems: "center",
      gap: spacing.one,
    },
    controlGroupBtnLabel: {
      fontSize: theme.fonts.headlineMedium.fontSize,
      lineHeight: theme.fonts.headlineMedium.lineHeight,
    },
  });
};
