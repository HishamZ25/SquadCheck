import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../constants/theme';

interface WeekRangeHeaderProps {
  weekRange: string;
  onPrevious: () => void;
  onNext: () => void;
}

export const WeekRangeHeader: React.FC<WeekRangeHeaderProps> = ({
  weekRange,
  onPrevious,
  onNext,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onPrevious} style={styles.arrow}>
        <Ionicons name="chevron-back" size={24} color={Theme.colors.text} />
      </TouchableOpacity>
      
      <Text style={styles.text}>{weekRange}</Text>
      
      <TouchableOpacity onPress={onNext} style={styles.arrow}>
        <Ionicons name="chevron-forward" size={24} color={Theme.colors.text} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.md,
    paddingTop: 2,
    paddingBottom: 2,
  },
  arrow: {
    padding: Theme.spacing.xs,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...Theme.typography.body,
    color: Theme.colors.text,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
  },
});

