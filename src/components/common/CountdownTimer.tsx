import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const AnimatedText = Animated.createAnimatedComponent(Text);

export interface CountdownTimerProps {
  targetDate: Date;
  label?: string;
  numberColor?: string;
  labelColor?: string;
  size?: 'small' | 'medium' | 'large';
  showLabels?: boolean;
  onFinish?: () => void;
  finishText?: string;
}

function formatSegment(n: number): string {
  return n.toString().padStart(2, '0');
}

export function CountdownTimer({
  targetDate,
  label = 'Pending',
  numberColor = '#FFFFFF',
  labelColor = 'rgba(255,255,255,0.9)',
  size = 'medium',
  showLabels = true,
  onFinish,
  finishText = "Time's up!",
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const opacity = useSharedValue(1);

  const numberSize = size === 'small' ? 20 : size === 'large' ? 28 : 24;
  const labelSize = size === 'small' ? 10 : size === 'large' ? 12 : 11;

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const target = targetDate.getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setIsFinished(true);
        onFinish?.();
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ days, hours, minutes, seconds });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetDate, onFinish]);

  useEffect(() => {
    if (isFinished) {
      opacity.value = withRepeat(
        withSequence(withTiming(0.6, { duration: 500 }), withTiming(1, { duration: 500 })),
        -1,
        true
      );
    }
  }, [isFinished]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (timeLeft === null) return null;

  if (isFinished) {
    return (
      <View style={styles.wrapper}>
        {label ? <Text style={[styles.label, { color: labelColor, fontSize: labelSize }]}>{label}</Text> : null}
        <Animated.Text style={[styles.finishText, { color: numberColor, fontSize: numberSize }, animatedStyle]}>
          {finishText}
        </Animated.Text>
      </View>
    );
  }

  const showDays = timeLeft.days > 0;
  const showHours = showDays || timeLeft.hours > 0;

  // Render a colon separator that aligns with the number baseline
  const Separator = () => (
    <Text style={[styles.sep, { color: numberColor, fontSize: numberSize, lineHeight: numberSize }]}>:</Text>
  );

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={[styles.label, { color: labelColor, fontSize: labelSize }]}>{label}</Text> : null}
      <View style={styles.row}>
        {showDays && (
          <>
            <View style={styles.unit}>
              <Text style={[styles.number, { color: numberColor, fontSize: numberSize, lineHeight: numberSize }]}>
                {formatSegment(timeLeft.days)}
              </Text>
              {showLabels && <Text style={[styles.unitLabel, { color: labelColor, fontSize: labelSize }]}>DAYS</Text>}
            </View>
            <View style={styles.sepWrap}>
              <Separator />
            </View>
          </>
        )}
        {showHours && (
          <>
            <View style={styles.unit}>
              <Text style={[styles.number, { color: numberColor, fontSize: numberSize, lineHeight: numberSize }]}>
                {formatSegment(timeLeft.hours)}
              </Text>
              {showLabels && <Text style={[styles.unitLabel, { color: labelColor, fontSize: labelSize }]}>HRS</Text>}
            </View>
            <View style={styles.sepWrap}>
              <Separator />
            </View>
          </>
        )}
        <View style={styles.unit}>
          <Text style={[styles.number, { color: numberColor, fontSize: numberSize, lineHeight: numberSize }]}>
            {formatSegment(timeLeft.minutes)}
          </Text>
          {showLabels && <Text style={[styles.unitLabel, { color: labelColor, fontSize: labelSize }]}>MINS</Text>}
        </View>
        <View style={styles.sepWrap}>
          <Separator />
        </View>
        <View style={styles.unit}>
          <Text style={[styles.number, { color: numberColor, fontSize: numberSize, lineHeight: numberSize }]}>
            {formatSegment(timeLeft.seconds)}
          </Text>
          {showLabels && <Text style={[styles.unitLabel, { color: labelColor, fontSize: labelSize }]}>SECS</Text>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  unit: {
    alignItems: 'center',
  },
  number: {
    fontWeight: '700',
    letterSpacing: 1,
  },
  unitLabel: {
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  sepWrap: {
    marginHorizontal: 2,
  },
  sep: {
    fontWeight: '700',
  },
  finishText: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
