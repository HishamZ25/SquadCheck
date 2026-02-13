import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

interface AnimatedBellProps {
  size?: number;
  color?: string;
  shouldAnimate?: boolean;
}

export const AnimatedBell: React.FC<AnimatedBellProps> = ({
  size = 80,
  color = '#FF6B35',
  shouldAnimate = true,
}) => {
  const scale = useSharedValue(0);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (shouldAnimate) {
      // Appear animation
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSpring(1, {
        damping: 10,
        stiffness: 100,
      });

      // Ring animation (starts after appearance)
      const ringDelay = 500;
      rotation.value = withDelay(
        ringDelay,
        withRepeat(
          withSequence(
            withTiming(15, { duration: 100, easing: Easing.ease }),
            withTiming(-15, { duration: 100, easing: Easing.ease }),
            withTiming(12, { duration: 100, easing: Easing.ease }),
            withTiming(-12, { duration: 100, easing: Easing.ease }),
            withTiming(8, { duration: 100, easing: Easing.ease }),
            withTiming(-8, { duration: 100, easing: Easing.ease }),
            withTiming(0, { duration: 100, easing: Easing.ease }),
            withTiming(0, { duration: 1200 }) // Pause between rings
          ),
          -1,
          false
        )
      );
    } else {
      scale.value = 0;
      rotation.value = 0;
      opacity.value = 0;
    }
  }, [shouldAnimate, scale, rotation, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Ionicons name="notifications" size={size} color={color} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
