import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { CircleLoader } from './CircleLoader';
import { useColorMode } from '../../theme/ColorModeContext';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color = '#FF6B35',
  text,
}) => {
  const { colors } = useColorMode();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CircleLoader size={size} dotColor={color} />
      {text && <Text style={[styles.text, { color: colors.textSecondary }]}>{text}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
});
