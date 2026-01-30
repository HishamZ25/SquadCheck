import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Theme } from '../../constants/theme';
import { DAY_NAMES, getMonthName, getDateString } from './CalendarUtils';
import { MonthDateItem } from './MonthDateItem';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Account for padding and margins to ensure all 7 days fit perfectly
const CONTAINER_PADDING = 8; // Theme.spacing.xs typically 4px * 2
const ITEM_MARGIN = 2;
// Calculate day width: (screen width - container padding - all item margins) / 7 days
const DAY_WIDTH = (SCREEN_WIDTH - (CONTAINER_PADDING * 2) - (ITEM_MARGIN * 2 * 7)) / 7;

interface MonthViewProps {
  monthData: { month: number; year: number; dates: Date[][] };
  todayDateString: string;
  selectedDateString: string;
  onDateSelect: (date: Date) => void;
}

// Memoized day header to prevent re-renders
const DayHeader = memo(() => (
  <View style={styles.header}>
    {DAY_NAMES.map((day, index) => (
      <View key={index} style={styles.dayHeader}>
        <Text style={styles.dayText}>{day}</Text>
      </View>
    ))}
  </View>
));

export const MonthView = memo<MonthViewProps>(({
  monthData,
  todayDateString,
  selectedDateString,
  onDateSelect,
}) => {
  // Pre-compute all date strings and states to avoid recalculating in render
  const dateStates = useMemo(() => {
    return monthData.dates.map(week =>
      week.map(date => ({
        date,
        dateString: getDateString(date),
        isToday: getDateString(date) === todayDateString,
        isSelected: getDateString(date) === selectedDateString,
        isCurrentMonth: date.getMonth() === monthData.month,
      }))
    );
  }, [monthData.dates, monthData.month, todayDateString, selectedDateString]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{getMonthName(monthData.month)}</Text>
      <DayHeader />
      {dateStates.map((week, weekIndex) => (
        <View key={weekIndex} style={styles.week}>
          {week.map(({ date, isToday, isSelected, isCurrentMonth }, dayIndex) => (
            <MonthDateItem
              key={`${date.getTime()}-${dayIndex}`}
              date={date}
              month={monthData.month}
              isToday={isToday}
              isSelected={isSelected}
              isCurrentMonth={isCurrentMonth}
              onPress={() => onDateSelect(date)}
            />
          ))}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.xs, // Reduced padding to ensure all days fit
  },
  title: {
    ...Theme.typography.h4,
    color: Theme.colors.text,
    fontWeight: '600',
    marginBottom: Theme.spacing.md,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    marginBottom: Theme.spacing.xs,
    justifyContent: 'space-between',
    paddingHorizontal: ITEM_MARGIN,
  },
  dayHeader: {
    width: DAY_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    ...Theme.typography.bodySmall,
    color: Theme.colors.textSecondary,
    fontSize: 11,
  },
  week: {
    flexDirection: 'row',
    marginBottom: Theme.spacing.xs,
    justifyContent: 'space-between',
    paddingHorizontal: ITEM_MARGIN,
  },
});

