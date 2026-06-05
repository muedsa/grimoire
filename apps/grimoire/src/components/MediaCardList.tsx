import { MediaItem, MediaSection } from "@grimoire/conduit";
import Animated from "react-native-reanimated";
import MediaCard from "@/components/MediaCard";
import { Surface, Text } from "react-native-paper";
import { View } from "react-native";
import { useScreenDimensions } from "@/hooks/use-screen-dimensions";

export type MediaCardListProps = {
  section: MediaSection;
  onFocusedItem?: (item: MediaItem, index: number) => void;
  onPressedItem?: (item: MediaItem, index: number) => void;
};

export function MediaCardList({
  section,
  onFocusedItem,
  onPressedItem,
}: MediaCardListProps) {
  const { spacing } = useScreenDimensions();
  return (
    <View style={{ flex: 1 }}>
      <Text variant="titleLarge">{section.title}</Text>
      <Animated.FlatList
        data={section.items}
        numColumns={2}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <MediaCard
            index={index}
            item={item}
            aspectRatio={section.aspectRatio}
            style={{ flex: 1, margin: spacing.one }}
            onFocusedItem={onFocusedItem}
            onPressedItem={onPressedItem}
          />
        )}
      />
    </View>
  );
}
