import { MediaItem } from "@grimoire/conduit";
import { ViewStyle } from "react-native";
import { Card, useTheme } from "react-native-paper";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Image } from "expo-image";
import React, { useCallback, useState } from "react";

export type MediaCardProps = {
  item: MediaItem;
  index: number;
  aspectRatio: number;
  transformOrigin?: Array<string | number> | string;
  hideTitle?: boolean;
  style?: ViewStyle;
  onFocusedItem?: (item: MediaItem, index: number) => void;
  onPressedItem?: (item: MediaItem, index: number) => void;
};

const MediaCard = React.memo(
  ({
    item,
    index,
    aspectRatio,
    transformOrigin,
    hideTitle,
    style,
    onFocusedItem,
    onPressedItem,
  }: MediaCardProps) => {
    const scaleAnimation = useSharedValue(1);

    const [focused, setFocused] = useState(false);

    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: scaleAnimation.value }],
        transformOrigin: transformOrigin ?? "center",
      };
    });

    const theme = useTheme();

    const handleFocus = useCallback(() => {
      scaleAnimation.value = withTiming(1.1, { duration: 200 });
      setFocused(true);
      onFocusedItem?.(item, index);
    }, [onFocusedItem]);

    const handlePress = useCallback(() => {
      onPressedItem?.(item, index);
    }, []);

    const handleBlur = useCallback(() => {
      scaleAnimation.value = withTiming(1, { duration: 50 });
      setFocused(false);
    }, [onFocusedItem]);

    return (
      <Animated.View style={[animatedStyle, style]}>
        <Card
          mode={focused ? "contained" : "elevated"}
          elevation={3 as any}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onPress={handlePress}
        >
          {Boolean(item) && (
            <Image
              source={{ uri: item.cover }}
              style={{
                aspectRatio: aspectRatio,
                borderRadius: theme.roundness * 3,
              }}
              contentFit="cover"
              transition={1000}
            />
          )}
          {!Boolean(hideTitle) && (
            <Card.Title title={item.title} subtitle={item.subtitle} />
          )}
        </Card>
      </Animated.View>
    );
  },
);

export default MediaCard;
