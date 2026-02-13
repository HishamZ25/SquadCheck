import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  Easing,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';

interface AnimatedProgressGraphProps {
  size?: number;
  shouldAnimate?: boolean;
}

export const AnimatedProgressGraph: React.FC<AnimatedProgressGraphProps> = ({
  size = 200,
  shouldAnimate = true,
}) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  
  // Individual bar heights
  const bar1Height = useSharedValue(0);
  const bar2Height = useSharedValue(0);
  const bar3Height = useSharedValue(0);
  const bar4Height = useSharedValue(0);
  const bar5Height = useSharedValue(0);
  
  // Pulse animation for bars
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (shouldAnimate) {
      // Container appear animation
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSpring(1, {
        damping: 12,
        stiffness: 100,
      });

      // Staggered bar growth animation
      bar1Height.value = withDelay(
        200,
        withSpring(0.4, { damping: 10, stiffness: 80 })
      );
      bar2Height.value = withDelay(
        300,
        withSpring(0.6, { damping: 10, stiffness: 80 })
      );
      bar3Height.value = withDelay(
        400,
        withSpring(0.75, { damping: 10, stiffness: 80 })
      );
      bar4Height.value = withDelay(
        500,
        withSpring(0.85, { damping: 10, stiffness: 80 })
      );
      bar5Height.value = withDelay(
        600,
        withSpring(0.95, { damping: 10, stiffness: 80 })
      );

      // Continuous pulse effect
      pulse.value = withDelay(
        1000,
        withRepeat(
          withSequence(
            withTiming(1.05, { duration: 800, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          false
        )
      );
    } else {
      scale.value = 0;
      opacity.value = 0;
      bar1Height.value = 0;
      bar2Height.value = 0;
      bar3Height.value = 0;
      bar4Height.value = 0;
      bar5Height.value = 0;
      pulse.value = 1;
    }
  }, [shouldAnimate, scale, opacity, bar1Height, bar2Height, bar3Height, bar4Height, bar5Height, pulse]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const bar1Style = useAnimatedStyle(() => ({
    height: `${bar1Height.value * 100}%`,
    transform: [{ scale: pulse.value }],
  }));

  const bar2Style = useAnimatedStyle(() => ({
    height: `${bar2Height.value * 100}%`,
    transform: [{ scale: pulse.value }],
  }));

  const bar3Style = useAnimatedStyle(() => ({
    height: `${bar3Height.value * 100}%`,
    transform: [{ scale: pulse.value }],
  }));

  const bar4Style = useAnimatedStyle(() => ({
    height: `${bar4Height.value * 100}%`,
    transform: [{ scale: pulse.value }],
  }));

  const bar5Style = useAnimatedStyle(() => ({
    height: `${bar5Height.value * 100}%`,
    transform: [{ scale: pulse.value }],
  }));

  const barWidth = size / 8;
  const barSpacing = size / 12;

  return (
    <Animated.View style={[styles.container, { width: size, height: size }, containerStyle]}>
      {/* Background grid lines */}
      <View style={styles.gridLines}>
        <View style={[styles.gridLine, { top: '20%' }]} />
        <View style={[styles.gridLine, { top: '40%' }]} />
        <View style={[styles.gridLine, { top: '60%' }]} />
        <View style={[styles.gridLine, { top: '80%' }]} />
      </View>

      {/* Bars */}
      <View style={styles.barsContainer}>
        <Animated.View style={[styles.bar, { width: barWidth, backgroundColor: '#FFB399' }, bar1Style]} />
        <View style={{ width: barSpacing }} />
        <Animated.View style={[styles.bar, { width: barWidth, backgroundColor: '#FF9B7A' }, bar2Style]} />
        <View style={{ width: barSpacing }} />
        <Animated.View style={[styles.bar, { width: barWidth, backgroundColor: '#FF8A65' }, bar3Style]} />
        <View style={{ width: barSpacing }} />
        <Animated.View style={[styles.bar, { width: barWidth, backgroundColor: '#FF7A52' }, bar4Style]} />
        <View style={{ width: barSpacing }} />
        <Animated.View style={[styles.bar, { width: barWidth, backgroundColor: '#FF6B35' }, bar5Style]} />
      </View>

      {/* Baseline */}
      <View style={styles.baseline} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
    paddingBottom: 20,
  },
  gridLines: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: '100%',
    paddingBottom: 20,
  },
  bar: {
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  baseline: {
    position: 'absolute',
    bottom: 18,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255, 107, 53, 0.3)',
  },
});
