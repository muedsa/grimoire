import { MediaItem } from "@grimoire/conduit";
import MediaCard from "./MediaCard";
import { Text } from "react-native-paper";
import { FlatList, View } from "react-native";
import {
  TV_HORIZONTAL_CARD_WIDTH,
  TV_VERTICAL_CARD_WIDTH,
} from "@/constants/theme";
import { MediaCardListProps } from "./MediaCardList";
import { useCallback, useRef } from "react";
import { TVFocusGuideView } from "./TVFocusGuideView";
import { useScreenDimensions } from "@/hooks/use-screen-dimensions";

const keyExtractor = (item: MediaItem) => item.id;

export function MediaCardList({
  section,
  onFocusedItem,
  onPressedItem,
}: MediaCardListProps) {
  const listRef = useRef<FlatList>(null);

  const { spacing } = useScreenDimensions();

  const itemWidth =
    section.aspectRatio > 1 ? TV_HORIZONTAL_CARD_WIDTH : TV_VERTICAL_CARD_WIDTH;

  const gap = spacing.three;

  const handleItemFocused = useCallback(
    (item: MediaItem, index: number) => {
      listRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.05,
      });
      onFocusedItem?.(item, index);
    },
    [onFocusedItem],
  );

  const renderItem = ({ item, index }: { item: MediaItem; index: number }) => (
    <MediaCard
      item={item}
      index={index}
      aspectRatio={section.aspectRatio}
      transformOrigin={
        index === 0
          ? "left"
          : index === section.items.length
            ? "right"
            : "center"
      }
      style={{ width: itemWidth, marginRight: gap }}
      onFocusedItem={handleItemFocused}
      onPressedItem={onPressedItem}
    />
  );

  return (
    <View style={{ marginBottom: spacing.five }}>
      <Text variant="titleLarge">{section.title}</Text>
      <TVFocusGuideView autoFocus trapFocusLeft={true} trapFocusRight={true}>
        <FlatList
          ref={listRef}
          contentContainerStyle={{ paddingVertical: gap }}
          data={section.items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListFooterComponent={<View style={{ width: itemWidth / 2 }}></View>}
          horizontal={true}
          initialScrollIndex={0}
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        />
      </TVFocusGuideView>
    </View>
  );
}
