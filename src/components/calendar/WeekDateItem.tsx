import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Theme } from '../../constants/theme';

interface WeekDateItemProps {
  date: Date;
  dayName: string;
  isToday: boolean;
  isSelected: boolean;
  onPress: () => void;
}

export const WeekDateItem = memo<WeekDateItemProps>(({
  date,
  dayName,
  isToday,
  isSelected,
  onPress,
}) => {
  const dayNumber = date.getDate();
  
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.dayName, isToday && styles.todayDayName]}>
        {dayName}
      </Text>
      <View style={[
        styles.dayNumberContainer,
        isToday && styles.todayContainer,
        isSelected && !isToday && styles.selectedContainer,
      ]}>
        <Text style={[
          styles.dayNumber,
          isToday && styles.todayDayNumber,
          isSelected && !isToday && styles.selectedDayNumber,
        ]}>
          {dayNumber}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    paddingHorizontal: Theme.spacing.xs,
    minWidth: 50,
    minHeight: 60,
  },
  dayName: {
    ...Theme.typography.bodySmall,
    color: Theme.colors.textSecondary,
    fontSize: 10,
    marginBottom: 2,
    fontWeight: '500',
  },
  todayDayName: {
    color: Theme.colors.textSecondary,
    fontWeight: '500',
  },
  dayNumberContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  todayContainer: {
    backgroundColor: Theme.colors.secondary,
  },
  selectedContainer: {
    backgroundColor: Theme.colors.primary,
    borderWidth: 2,
    borderColor: Theme.colors.secondary,
  },
  dayNumber: {
    ...Theme.typography.body,
    color: Theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  todayDayNumber: {
    color: Theme.colors.white,
    fontWeight: '700',
  },
  selectedDayNumber: {
    color: Theme.colors.white,
    fontWeight: '700',
  },
});

