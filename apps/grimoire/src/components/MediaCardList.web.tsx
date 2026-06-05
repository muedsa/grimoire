import MediaCard from "./MediaCard";
import { Text } from "react-native-paper";
import { View } from "react-native";
import { MediaCardListProps } from "./MediaCardList";
import { useScreenDimensions } from "@/hooks/use-screen-dimensions";

export function MediaCardList({
  section,
  onFocusedItem,
  onPressedItem,
}: MediaCardListProps) {
  const {
    width: screenWidth,
    height: screenHeight,
    landscape,
    spacing,
  } = useScreenDimensions();

  const gap = spacing.three;

  const width = getWebCardWidth(
    screenWidth,
    screenHeight,
    section.aspectRatio,
    landscape,
    gap,
    gap,
    210,
    420,
  );

  return (
    <View style={{ paddingBottom: spacing.five }}>
      <Text variant="titleLarge" style={{ paddingBottom: gap }}>
        {section.title}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: gap }}>
        {section.items.map((item, index) => (
          <MediaCard
            key={`${section.title}-${item.id}`}
            item={item}
            index={index}
            aspectRatio={section.aspectRatio}
            style={{ width: width }}
            onFocusedItem={onFocusedItem}
            onPressedItem={onPressedItem}
          />
        ))}
      </View>
    </View>
  );
}

function getWebCardWidth(
  windowWidth: number,
  windowHeight: number,
  aspectRatio: number,
  isLandscape: boolean,
  containerPadding: number,
  cardGap: number,
  minCardWidth: number,
  maxCardWidth: number,
): number {
  const availableWidth = windowWidth - 2 * containerPadding;
  if (availableWidth <= 0) return 1;

  const maxHeightRatio = isLandscape ? 0.55 : 0.7;
  const maxCardHeight = windowHeight * maxHeightRatio;

  const maxCols = Math.floor(
    (availableWidth + cardGap) / (minCardWidth + cardGap),
  );
  const minCols = Math.ceil(
    (availableWidth + cardGap) / (maxCardWidth + cardGap),
  );
  const startCols = Math.max(1, maxCols);
  const endCols = Math.max(1, minCols);

  for (let cols = startCols; cols >= endCols; cols--) {
    const cardWidth = (availableWidth - (cols - 1) * cardGap) / cols;
    const cardHeight = cardWidth / aspectRatio;
    if (cardHeight <= maxCardHeight) {
      return cardWidth;
    }
  }
  return (availableWidth - (startCols - 1) * cardGap) / startCols;
}
