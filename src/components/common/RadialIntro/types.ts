import type { ViewStyle } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

export interface OrbitItem {
  id: number;
  src: string;
}

export interface OrbitArmProps {
  item: OrbitItem;
  index: number;
  totalItems: number;
  stageSize: number;
  imageSize: number;
  spinDuration: number;
  orbitRadius: number;
  expanded: boolean;
  isCenter: boolean;
  revealOnFanOut: boolean;
  onCenterPress?: () => void;
}

export interface RadialIntroProps {
  orbitItems: OrbitItem[];
  stageSize?: number;
  imageSize?: number;
  spinDuration?: number;
  expanded?: boolean;
  onCenterPress?: () => void;
  revealOnFanOut?: boolean;
  style?: ViewStyle;
}
