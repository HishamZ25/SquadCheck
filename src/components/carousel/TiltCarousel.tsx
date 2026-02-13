import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

// Default to no tilt so cards feel stable and \"sticky\"
const ROTATION_ANGLE = 0;
const TRANSLATE_Y = 0;

interface TiltCarouselProps<T> {
  data: T[];
  renderItem: (props: { item: T; index: number }) => React.ReactNode;
  keyExtractor?: (item: T, index: number) => string;
  /** Horizontal padding that matches the section/divider above so the card aligns */
  contentPadding?: number;
  itemHeight?: number;
  /** Space between cards */
  marginHorizontal?: number;
  rotationAngle?: number;
  translateYValue?: number;
}

function TiltCarouselItem<T>({
  item,
  index,
  scrollX,
  renderItem,
  itemWidth,
  pageWidth,
  rotationAngle,
  translateYValue,
}: {
  item: T;
  index: number;
  scrollX: Animated.SharedValue<number>;
  renderItem: (props: { item: T; index: number }) => React.ReactNode;
  itemWidth: number;
  pageWidth: number;
  rotationAngle: number;
  translateYValue: number;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const rotateZ = interpolate(
      scrollX.value,
      [(index - 1) * pageWidth, index * pageWidth, (index + 1) * pageWidth],
      [rotationAngle, 0, -rotationAngle],
      Extrapolation.CLAMP
    );
    const translateY = interpolate(
      scrollX.value,
      [(index - 1) * pageWidth, index * pageWidth, (index + 1) * pageWidth],
      [translateYValue, 0, translateYValue],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ rotateZ: `${rotateZ}deg` }, { translateY }],
    };
  });

  return (
    <Animated.View style={[styles.itemContainer, { width: itemWidth }, animatedStyle]}>
      {renderItem({ item, index })}
    </Animated.View>
  );
}

export function TiltCarousel<T>({
  data,
  renderItem,
  keyExtractor,
  contentPadding = 16,
  itemHeight = 170,
  marginHorizontal = 12,
  rotationAngle = ROTATION_ANGLE,
  translateYValue = TRANSLATE_Y,
}: TiltCarouselProps<T>) {
  const { width } = useWindowDimensions();
  const scrollX = useSharedValue(0);
  // Card width matches section/divider width.
  const itemWidth = width - contentPadding * 2;
  // Horizontal space between cards.
  const itemSpacing = marginHorizontal;
  // Each snap step is the card + the gap after it.
  const pageWidth = itemWidth + itemSpacing;

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
  });

  return (
    <Animated.FlatList
      data={data}
      horizontal
      onScroll={onScroll}
      scrollEventThrottle={16}
      snapToInterval={pageWidth}
      snapToAlignment="start"
      disableIntervalMomentum
      decelerationRate="fast"
      showsHorizontalScrollIndicator={false}
      keyExtractor={keyExtractor ? (item, index) => keyExtractor(item as T, index) : (_, i) => String(i)}
      ItemSeparatorComponent={() => <View style={{ width: itemSpacing }} />}
      contentContainerStyle={[
        styles.content,
        { paddingVertical: 8 },
      ]}
      style={styles.list}
      renderItem={({ item, index }) => (
        <View style={[styles.itemWrap, { width: itemWidth }]}>
          <TiltCarouselItem
            item={item as T}
            index={index}
            scrollX={scrollX}
            renderItem={renderItem}
            itemWidth={itemWidth}
            pageWidth={pageWidth}
            rotationAngle={rotationAngle}
            translateYValue={translateYValue}
          />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
  },
  list: {
    flexGrow: 0,
  },
  itemWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
});
