import React, { memo } from 'react';
import { Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Theme } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Account for padding and margins to ensure all 7 days fit perfectly
const CONTAINER_PADDING = 8; // Theme.spacing.xs typically 4px * 2
const ITEM_MARGIN = 2;
// Calculate day width: (screen width - container padding - all item margins) / 7 days
const DAY_WIDTH = (SCREEN_WIDTH - (CONTAINER_PADDING * 2) - (ITEM_MARGIN * 2 * 7)) / 7;

interface MonthDateItemProps {
  date: Date;
  month: number;
  isToday: boolean;
  isSelected: boolean;
  isCurrentMonth: boolean;
  onPress: () => void;
}

export const MonthDateItem = memo<MonthDateItemProps>(({
  date,
  month,
  isToday,
  isSelected,
  isCurrentMonth,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        isToday && styles.todayContainer,
        isSelected && !isToday && styles.selectedContainer,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      delayPressIn={0}
    >
      <Text style={[
        styles.text,
        isToday && styles.todayText,
        isSelected && !isToday && styles.selectedText,
        !isCurrentMonth && styles.otherMonthText,
      ]}>
        {date.getDate()}
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    width: DAY_WIDTH,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Theme.borderRadius.sm,
    marginHorizontal: ITEM_MARGIN,
  },
  todayContainer: {
    backgroundColor: Theme.colors.secondary,
  },
  selectedContainer: {
    backgroundColor: Theme.colors.primary,
    borderWidth: 2,
    borderColor: Theme.colors.secondary,
  },
  text: {
    ...Theme.typography.bodySmall,
    color: Theme.colors.text,
    fontSize: 13,
  },
  todayText: {
    color: Theme.colors.white,
    fontWeight: '700',
  },
  selectedText: {
    color: Theme.colors.white,
    fontWeight: '700',
  },
  otherMonthText: {
    color: Theme.colors.textTertiary,
  },
});

