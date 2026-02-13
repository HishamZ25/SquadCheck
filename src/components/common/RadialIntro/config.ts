import { Easing } from 'react-native-reanimated';

export const ANIMATION_DELAYS = {
  IMAGE_LIFT: 100,
  ORBIT_PLACEMENT: 400,
  CONTINUOUS_SPIN: 1200,
};

export const TIMING_CONFIG = {
  duration: 600,
  easing: Easing.bezier(0.33, 1, 0.68, 1),
};

export const TIMING_CONFIG_SLOW = {
  duration: 800,
  easing: Easing.bezier(0.33, 1, 0.68, 1),
};
