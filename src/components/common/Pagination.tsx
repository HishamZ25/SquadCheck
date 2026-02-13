import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolateColor,
  interpolate,
  Extrapolation,
  useDerivedValue,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';

const { width } = Dimensions.get('window');
const DOT_SIZE = 10;
const DOT_CONTAINER = 24;

export interface PaginationProps {
  activeIndex: number;
  totalItems: number;
  inactiveColor?: string;
  activeColor?: string;
  currentColor?: string;
  containerStyle?: ViewStyle;
  dotSize?: number;
  borderRadius?: number;
  dotContainer?: number;
  onIndexChange?: (index: number) => void;
}

export function Pagination({
  activeIndex,
  totalItems,
  inactiveColor = '#363636',
  activeColor = '#c4c4c4',
  currentColor = '#FF6B35',
  containerStyle,
  dotSize = DOT_SIZE,
  borderRadius = 100,
  dotContainer = DOT_CONTAINER,
  onIndexChange,
}: PaginationProps) {
  const clampedActiveIndex = Math.min(Math.max(activeIndex, 0), totalItems - 1);
  const scale = useSharedValue(1);
  const index_ = useSharedValue(clampedActiveIndex);

  useEffect(() => {
    const shapedIndex = Math.min(Math.max(activeIndex, 0), totalItems - 1);
    index_.value = shapedIndex;
  }, [activeIndex, totalItems]);

  const triggerHaptic = () => {
    impactAsync(ImpactFeedbackStyle.Medium);
  };

  const notifyIndexChange = (index: number) => {
    if (onIndexChange) {
      onIndexChange(index);
    }
  };

  const longPressGesture = Gesture.Pan()
    .onStart(() => {
      scale.value = withTiming(1.2, { duration: 150 });
    })
    .onUpdate((e) => {
      const index = Math.floor(e.absoluteX / (width / totalItems));
      if (index >= 0 && index < totalItems) {
        if (index_.value !== index) {
          runOnJS(triggerHaptic)();
        }
        index_.value = index;
        runOnJS(notifyIndexChange)(index);
      }
    })
    .onEnd(() => {
      scale.value = withTiming(1, { duration: 150 });
    })
    .onFinalize(() => {
      scale.value = withTiming(1, { duration: 150 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animation = useDerivedValue(() =>
    withTiming(index_.value, { easing: Easing.linear, duration: 300 })
  );

  return (
    <GestureDetector gesture={longPressGesture}>
      <Animated.View style={animatedStyle}>
        <View style={{ flexDirection: 'row' }}>
          <Indicator
            animation={animation}
            dotContainer={dotContainer}
            containerStyle={containerStyle}
            radius={borderRadius}
          />
          {[...Array(totalItems).keys()].map((index) => (
            <Dot
              key={`index-${index}`}
              index={index}
              animation={animation}
              activeColor={activeColor}
              inactiveColor={inactiveColor}
              currentColor={currentColor}
              dotSize={dotSize}
              borderRadius={borderRadius}
              dotContainer={dotContainer}
            />
          ))}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

function Indicator({
  animation,
  dotContainer,
  radius,
  containerStyle,
}: {
  animation: Animated.SharedValue<number>;
  dotContainer?: number;
  radius?: number;
  containerStyle?: ViewStyle;
}) {
  const indicatorAnimatedStyle = useAnimatedStyle(() => {
    const width = DOT_CONTAINER + DOT_CONTAINER * animation.value;
    const opacity = interpolate(animation.value, [0, 0.01], [0, 1], Extrapolation.CLAMP);
    return {
      width,
      opacity: withTiming(opacity, { duration: 200, easing: Easing.linear }),
    };
  });
  return (
    <Animated.View
      style={[
        {
          height: dotContainer,
          position: 'absolute',
          left: 0,
          top: 0,
          borderRadius: radius,
        },
        containerStyle,
        indicatorAnimatedStyle,
      ]}
    />
  );
}

function Dot({
  index,
  animation,
  inactiveColor = '#363636',
  activeColor = '#c4c4c4',
  currentColor = '#FF6B35',
  dotSize = DOT_SIZE,
  borderRadius = 100,
  dotContainer = DOT_CONTAINER,
}: {
  index: number;
  animation: Animated.SharedValue<number>;
  inactiveColor?: string;
  activeColor?: string;
  currentColor?: string;
  dotSize?: number;
  borderRadius?: number;
  dotContainer?: number;
}) {
  const animatedDotContainerStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      animation.value,
      [index - 1, index, index + 1],
      [inactiveColor, activeColor, currentColor]
    ),
  }));
  return (
    <View style={[styles.dotContainer, { width: dotContainer, height: dotContainer }]}>
      <Animated.View
        style={[
          styles.dot,
          { width: dotSize, height: dotSize, borderRadius },
          animatedDotContainerStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dotContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    backgroundColor: '#000',
  },
});
