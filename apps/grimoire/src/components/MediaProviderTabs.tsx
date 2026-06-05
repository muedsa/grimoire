import {
  TabList,
  TabListProps,
  Tabs,
  TabSlot,
  TabTrigger,
  TabTriggerSlotProps,
} from "expo-router/ui";
import { SymbolView } from "expo-symbols";
import { Platform, Pressable, StyleSheet, View } from "react-native";

import { ExternalLink } from "./ExternalLink";
import { useScreenDimensions } from "@/hooks/use-screen-dimensions";
import { useMediaProvider } from "@/hooks/use-media-provider";
import { Surface, Text, useTheme } from "react-native-paper";
import { useScreenBackgroundImage } from "@/contexts/ScreenBackgroundImageContext";

export default function MediaProviderTabs() {
  const { provider } = useMediaProvider();

  return (
    <Tabs
      options={{
        backBehavior: "none",
      }}
    >
      <TabList asChild>
        <CustomTabList>
          <TabTrigger
            name="explore"
            href={{
              pathname: `/[mediaProvider]/explore`,
              params: { mediaProvider: provider?.namespace || "unknown" },
            }}
            asChild
          >
            <TabButton>首页</TabButton>
          </TabTrigger>
          <TabTrigger
            name="favlist"
            href={{
              pathname: `/[mediaProvider]/favlist`,
              params: { mediaProvider: provider?.namespace || "unknown" },
            }}
            asChild
          >
            <TabButton>收藏</TabButton>
          </TabTrigger>
          <TabTrigger
            name="search"
            href={{
              pathname: `/[mediaProvider]/search`,
              params: { mediaProvider: provider?.namespace || "unknown" },
            }}
            asChild
          >
            <TabButton>搜索</TabButton>
          </TabTrigger>
          <TabTrigger
            name="catalog"
            href={{
              pathname: `/[mediaProvider]/catalog`,
              params: { mediaProvider: provider?.name || "unknown" },
            }}
            asChild
          >
            <TabButton>目录</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
      <TabSlot style={{ flex: 1 }} />
    </Tabs>
  );
}

export function TabButton({
  children,
  isFocused,
  ...props
}: TabTriggerSlotProps) {
  const styles = useTabStyles();
  const { colors } = useTheme();

  return (
    <Pressable
      {...props}
      style={({ pressed, focused, hovered }) =>
        pressed || focused || hovered
          ? styles.pressedTabButtonView
          : styles.tabButtonView
      }
    >
      <Text
        variant="titleMedium"
        style={{ color: isFocused ? colors.primary : colors.onSurface }}
      >
        {children}
      </Text>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const styles = useTabStyles();
  const { colors } = useTheme();
  const { provider } = useMediaProvider();

  return (
    <View {...props} style={styles.tabListContainer}>
      <Surface style={styles.innerContainer}>
        {Platform.isTV || Platform.OS === "web" ? (
          <Text variant="titleLarge" style={styles.brandText}>
            {provider?.name || "Unknown"}
          </Text>
        ) : null}

        {props.children}

        {Platform.OS === "web" && provider?.url ? (
          <ExternalLink href={provider.url} asChild>
            <Pressable style={styles.externalPressable}>
              <Text variant="labelSmall">更多</Text>
              <SymbolView
                tintColor={colors.tertiary}
                name={{ ios: "arrow.up.right.square", web: "link" }}
                size={12}
              />
            </Pressable>
          </ExternalLink>
        ) : null}
      </Surface>
    </View>
  );
}

const useTabStyles = () => {
  const { colors } = useTheme();
  const { spacing } = useScreenDimensions();
  const { image } = useScreenBackgroundImage();
  return StyleSheet.create({
    tabListContainer: {
      width: "100%",
      padding: spacing.three,
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "row",
    },
    innerContainer: {
      paddingVertical: spacing.two,
      paddingHorizontal: spacing.five,
      borderRadius: spacing.five,
      flexDirection: "row",
      alignItems: "center",
      flexGrow: 1,
      gap: spacing.two,
      backgroundColor: image ? "transparent" : colors.surface,
    },
    brandText: {
      color: colors.primary,
      marginRight: "auto",
    },
    tabButtonView: {
      paddingVertical: spacing.half,
      paddingHorizontal: spacing.one,
    },
    pressedTabButtonView: {
      paddingVertical: spacing.half,
      paddingHorizontal: spacing.one,
      borderRadius: spacing.one,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    externalPressable: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: spacing.one,
      marginLeft: spacing.three,
    },
  });
};
