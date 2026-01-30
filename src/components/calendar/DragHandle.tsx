import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Theme } from '../../constants/theme';

interface DragHandleProps {
  onPress: () => void;
}

export const DragHandle: React.FC<DragHandleProps> = ({ onPress }) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={styles.button}
        hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}
      >
        <View style={styles.bar} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: Theme.spacing.md, // Push down from days above
    paddingBottom: 4, // Minimal space underneath
    marginBottom: 0,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 0,
    paddingBottom: 0,
  },
  bar: {
    width: 40,
    height: 4,
    backgroundColor: Theme.colors.textTertiary,
    borderRadius: 2,
    marginVertical: 2,
  },
});

