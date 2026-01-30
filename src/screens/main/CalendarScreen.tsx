import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../constants/theme';
import {
  getMonthName,
  getDateString,
  generateMonthData,
} from '../../components/calendar/CalendarUtils';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DAY_CIRCLE_SIZE = (SCREEN_WIDTH - 32 - 48) / 7;
const DAY_CIRCLE_MARGIN = 2;

interface Task {
  id: string;
  title: string;
  time: string;
  date: Date;
}

export const CalendarScreen: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const scrollViewRef = useRef<ScrollView>(null);
  const dateHeaderRefs = useRef<{ [key: string]: number }>({});
  const [topSectionBottom, setTopSectionBottom] = useState(200);
  const [headerBottom, setHeaderBottom] = useState(60);
  
  // Pull-up sheet animation - 0 = collapsed (beneath calendar), 1 = expanded (beneath header)
  const pullUpValue = useRef(new Animated.Value(0)).current;
  const currentValueRef = useRef(0);
  const isDragging = useRef(false);
  
  useEffect(() => {
    const listener = pullUpValue.addListener(({ value }) => {
      currentValueRef.current = value;
    });
    return () => {
      pullUpValue.removeListener(listener);
    };
  }, [pullUpValue]);
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderGrant: () => {
        isDragging.current = true;
        pullUpValue.setOffset(currentValueRef.current);
        pullUpValue.setValue(0);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (!isDragging.current) return;
        // Negative dy = dragging up (increase value)
        const newValue = currentValueRef.current - gestureState.dy / 400; // Scale down movement
        const clampedValue = Math.max(0, Math.min(1, newValue));
        pullUpValue.setValue(clampedValue);
      },
      onPanResponderRelease: (evt, gestureState) => {
        isDragging.current = false;
        pullUpValue.flattenOffset();
        const currentValue = currentValueRef.current;
        const velocity = gestureState.vy;
        
        let targetValue;
        if (Math.abs(velocity) > 0.5) {
          targetValue = velocity < 0 ? 1 : 0; // Up = expand, Down = collapse
        } else {
          targetValue = currentValue > 0.5 ? 1 : 0;
        }
        
        Animated.spring(pullUpValue, {
          toValue: targetValue,
          useNativeDriver: false,
          tension: 50,
          friction: 8,
        }).start();
      },
    })
  ).current;

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Generate month grid
  const monthGrid = useMemo(() => {
    return generateMonthData(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  // Tasks data - empty for now (will be populated from your data source)
  const tasksByDate = useMemo(() => {
    return {};
  }, []);

  // Get all dates in the current month view (for display in bottom section)
  const allDatesInView = useMemo(() => {
    const dates: Date[] = [];
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    
    // Start from Sunday of the week containing the first day
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    // End on Saturday of the week containing the last day
    const endDate = new Date(lastDay);
    const daysToAdd = 6 - endDate.getDay();
    endDate.setDate(endDate.getDate() + daysToAdd);
    
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  }, [currentYear, currentMonth]);

  // Pre-calculate scroll positions for all dates
  const dateScrollPositions = useMemo(() => {
    const positions: { [key: string]: number } = {};
    let accumulatedHeight = 0;
    
    // Sort dates to ensure chronological order
    const sortedDates = [...allDatesInView].sort((a, b) => a.getTime() - b.getTime());
    
    sortedDates.forEach((date) => {
      const dateKey = getDateString(date);
      const tasks = tasksByDate[dateKey] || [];
      const headerHeight = 80;
      const taskHeight = tasks.length > 0 ? tasks.length * 60 : 40;
      const sectionHeight = headerHeight + taskHeight;
      
      // Ensure position is always positive and increasing
      positions[dateKey] = Math.max(0, accumulatedHeight);
      accumulatedHeight += sectionHeight;
    });
    
    return positions;
  }, [allDatesInView, tasksByDate]);

  const goToPreviousMonth = useCallback(() => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      const dayToPreserve = selectedDate.getDate();
      newDate.setMonth(prev.getMonth() - 1);
      
      const lastDayOfNewMonth = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate();
      const dayToSet = Math.min(dayToPreserve, lastDayOfNewMonth);
      newDate.setDate(dayToSet);
      
      setSelectedDate(new Date(newDate));
      return newDate;
    });
  }, [selectedDate]);

  const goToNextMonth = useCallback(() => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      const dayToPreserve = selectedDate.getDate();
      newDate.setMonth(prev.getMonth() + 1);
      
      const lastDayOfNewMonth = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate();
      const dayToSet = Math.min(dayToPreserve, lastDayOfNewMonth);
      newDate.setDate(dayToSet);
      
      setSelectedDate(new Date(newDate));
      return newDate;
    });
  }, [selectedDate]);

  // Track pending scroll to date
  const pendingScrollDate = useRef<string | null>(null);
  const lastScrollPosition = useRef<number>(0);
  const isScrollingRef = useRef<boolean>(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to date when positions are ready
  useEffect(() => {
    if (pendingScrollDate.current && scrollViewRef.current && !isScrollingRef.current) {
      const scrollPosition = dateScrollPositions[pendingScrollDate.current];
      if (scrollPosition !== undefined && scrollPosition >= 0) {
        isScrollingRef.current = true;
        
        // Only scroll forward (or allow small backward for precision)
        const minScrollPosition = Math.max(0, lastScrollPosition.current - 50);
        const targetPosition = Math.max(minScrollPosition, scrollPosition);
        
        scrollViewRef.current.scrollTo({
          y: targetPosition,
          animated: false,
        });
        dateHeaderRefs.current[pendingScrollDate.current] = targetPosition;
        lastScrollPosition.current = targetPosition;
        pendingScrollDate.current = null;
        
        // Reset scrolling flag after a short delay
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        scrollTimeoutRef.current = setTimeout(() => {
          isScrollingRef.current = false;
        }, 100);
      }
    }
  }, [dateScrollPositions]);

  const handleDaySelect = useCallback((date: Date) => {
    // Prevent rapid clicks from causing race conditions
    if (isScrollingRef.current) {
      return;
    }
    
    const dateKey = getDateString(date);
    const clickedMonth = date.getMonth();
    const clickedYear = date.getFullYear();
    
    // Cancel any pending scrolls
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
    pendingScrollDate.current = null;
    
    // Always update selected date first
    setSelectedDate(new Date(date));
    
    // If the clicked date is in a different month, update the current month first
    const needsMonthChange = clickedMonth !== currentMonth || clickedYear !== currentYear;
    
    if (needsMonthChange) {
      setCurrentDate(new Date(clickedYear, clickedMonth, date.getDate()));
      // Mark this date as pending scroll - will scroll after month updates
      pendingScrollDate.current = dateKey;
      // Reset last scroll position when changing months to allow forward scroll
      lastScrollPosition.current = 0;
    } else {
      // Same month - scroll immediately using current positions
      isScrollingRef.current = true;
      
      const scrollPosition = dateScrollPositions[dateKey];
      if (scrollPosition !== undefined && scrollPosition >= 0 && scrollViewRef.current) {
        // Get current scroll position from the scroll view if possible
        const currentScrollY = lastScrollPosition.current;
        
        // Only scroll forward (or allow small backward for precision)
        // Ensure we're scrolling forward by at least checking the date is later
        const clickedDate = date.getTime();
        const currentSelectedDateTime = selectedDate.getTime();
        const isForwardDate = clickedDate >= currentSelectedDateTime;
        
        if (isForwardDate || Math.abs(clickedDate - currentSelectedDateTime) < 86400000) {
          // Allow scroll if date is forward or same day
          const minScrollPosition = Math.max(0, currentScrollY - 50);
          const targetPosition = Math.max(minScrollPosition, scrollPosition);
          
          scrollViewRef.current.scrollTo({
            y: targetPosition,
            animated: false,
          });
          dateHeaderRefs.current[dateKey] = targetPosition;
          lastScrollPosition.current = targetPosition;
        }
      } else {
        // If position not found, find the index and calculate
        const dateIndex = allDatesInView.findIndex(d => getDateString(d) === dateKey);
        if (dateIndex !== -1 && dateIndex >= 0) {
          // Calculate position based on index - ensure chronological order
          const sortedDates = [...allDatesInView].sort((a, b) => a.getTime() - b.getTime());
          const sortedIndex = sortedDates.findIndex(d => getDateString(d) === dateKey);
          
          if (sortedIndex >= 0) {
            let calculatedPosition = 0;
            for (let i = 0; i < sortedIndex; i++) {
              const dKey = getDateString(sortedDates[i]);
              const dTasks = tasksByDate[dKey] || [];
              calculatedPosition += 80 + (dTasks.length > 0 ? dTasks.length * 60 : 40);
            }
            if (scrollViewRef.current) {
              const currentScrollY = lastScrollPosition.current;
              const clickedDate = date.getTime();
              const currentSelectedDateTime = selectedDate.getTime();
              const isForwardDate = clickedDate >= currentSelectedDateTime;
              
              if (isForwardDate || Math.abs(clickedDate - currentSelectedDateTime) < 86400000) {
                const minScrollPosition = Math.max(0, currentScrollY - 50);
                const targetPosition = Math.max(minScrollPosition, calculatedPosition);
                
                scrollViewRef.current.scrollTo({
                  y: targetPosition,
                  animated: false,
                });
                dateHeaderRefs.current[dateKey] = targetPosition;
                lastScrollPosition.current = targetPosition;
              }
            }
          }
        }
      }
      
      // Reset scrolling flag after a short delay
      scrollTimeoutRef.current = setTimeout(() => {
        isScrollingRef.current = false;
      }, 150);
    }
  }, [dateScrollPositions, currentMonth, currentYear, allDatesInView, tasksByDate, selectedDate]);

  // Handle scroll to update selected date
  const handleScroll = useCallback((event: any) => {
    const offsetY = Math.max(0, event.nativeEvent.contentOffset.y); // Ensure non-negative
    lastScrollPosition.current = offsetY; // Track scroll position
    
    let currentDate: Date | null = null;
    let maxPosition = -1;
    
    // Find the date header that's currently at the top of the visible area
    Object.entries(dateHeaderRefs.current).forEach(([dateKey, position]) => {
      // Check if this date header is visible at the top (within 100px of scroll position)
      if (position >= 0 && position <= offsetY + 100 && position > maxPosition) {
        maxPosition = position;
        const parts = dateKey.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10);
          const day = parseInt(parts[2], 10);
          if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            currentDate = new Date(year, month, day);
          }
        }
      }
    });
    
    if (currentDate) {
      const newDateKey = getDateString(currentDate);
      const currentDateKey = getDateString(selectedDate);
      
      if (newDateKey !== currentDateKey) {
        const currentDateTime = currentDate.getTime();
        const selectedDateTime = selectedDate.getTime();
        
        // Only update if scrolling forward or if it's a significant change (to handle month changes)
        if (currentDateTime >= selectedDateTime || Math.abs(currentDateTime - selectedDateTime) > 86400000 * 2) {
          setSelectedDate(new Date(currentDate));
          
          if (
            currentDate.getMonth() !== currentMonth ||
            currentDate.getFullYear() !== currentYear
          ) {
            setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()));
          }
        }
      }
    }
  }, [selectedDate, currentMonth, currentYear]);

  // Toggle pull-up sheet
  const togglePullUpSheet = useCallback(() => {
    if (isDragging.current) return; // Don't toggle if currently dragging
    
    const targetValue = currentValueRef.current > 0.5 ? 0 : 1;
    Animated.spring(pullUpValue, {
      toValue: targetValue,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start();
  }, [pullUpValue]);

  const isToday = useCallback((date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }, []);

  const isSelected = useCallback((date: Date) => {
    return getDateString(date) === getDateString(selectedDate);
  }, [selectedDate]);

  const isCurrentMonth = useCallback((date: Date) => {
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  }, [currentMonth, currentYear]);

  const renderDayCircle = (date: Date, index: number) => {
    const dayNumber = date.getDate();
    const selected = isSelected(date);
    const today = isToday(date);
    const currentMonthDay = isCurrentMonth(date);

    return (
      <TouchableOpacity
        key={`day-${getDateString(date)}-${index}`}
        style={[
          styles.dayCircle,
          selected && styles.dayCircleSelected,
          today && !selected && styles.dayCircleToday,
          !currentMonthDay && styles.dayCircleOtherMonth,
        ]}
        onPress={() => handleDaySelect(date)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.dayCircleText,
            selected && styles.dayCircleTextSelected,
            today && !selected && styles.dayCircleTextToday,
            !currentMonthDay && styles.dayCircleTextOtherMonth,
          ]}
        >
          {dayNumber}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderTaskItem = (task: Task) => (
    <View key={task.id} style={styles.taskItem}>
      <View style={styles.taskContent}>
        <Text style={styles.taskTitle}>{task.title}</Text>
        <Text style={styles.taskTime}>{task.time}</Text>
      </View>
    </View>
  );

  const renderDateSection = (date: Date, index: number) => {
    const dateKey = getDateString(date);
    const tasks = tasksByDate[dateKey] || [];

    const dateStr = date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    // Store position from pre-calculated positions
    const scrollPosition = dateScrollPositions[dateKey];
    if (scrollPosition !== undefined) {
      dateHeaderRefs.current[dateKey] = scrollPosition;
    }

    return (
      <View key={`section-${dateKey}`}>
        <View style={styles.dateHeader}>
          <Text style={styles.dateHeaderText}>{dateStr}</Text>
        </View>
        <View style={styles.divider} />
        {tasks.length > 0 ? (
          tasks.map((task) => renderTaskItem(task))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No Tasks For This Day</Text>
          </View>
        )}
      </View>
    );
  };

  // Calculate pull-up sheet top position
  const pullUpTop = pullUpValue.interpolate({
    inputRange: [0, 1],
    outputRange: [topSectionBottom, headerBottom],
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Section: Month Header and Day Circles Grid */}
      <View 
        style={styles.topSection}
        onLayout={(event) => {
          const { y, height } = event.nativeEvent.layout;
          setTopSectionBottom(y + height);
        }}
      >
        {/* Month Header with Navigation */}
        <View 
          style={styles.monthHeader}
          onLayout={(event) => {
            const { y, height } = event.nativeEvent.layout;
            setHeaderBottom(y + height);
          }}
        >
          <TouchableOpacity
            style={styles.navButton}
            onPress={goToPreviousMonth}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#000000" />
          </TouchableOpacity>
          
          <Text style={styles.monthText}>
            {getMonthName(currentMonth)} {currentYear}
          </Text>
          
          <TouchableOpacity
            style={styles.navButton}
            onPress={goToNextMonth}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={24} color="#000000" />
          </TouchableOpacity>
        </View>

        {/* Day Circles Grid - 7 columns */}
        <View style={styles.dayCirclesGrid}>
          {/* Day names row */}
          <View style={styles.dayNamesRow}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <View key={`day-name-${index}`} style={styles.dayNameContainer}>
                <Text style={styles.dayNameText}>{day}</Text>
              </View>
            ))}
          </View>
          
          {/* Calendar grid */}
          {monthGrid.map((week, weekIndex) => (
            <View key={`week-${weekIndex}`} style={styles.weekRow}>
              {week.map((date, dayIndex) => renderDayCircle(date, weekIndex * 7 + dayIndex))}
            </View>
          ))}
        </View>
      </View>

      {/* Pull-up Sheet */}
      <Animated.View
        style={[
          styles.pullUpSheet,
          {
            top: pullUpTop,
          },
        ]}
      >
        {/* Drag Handle */}
        <View
          style={styles.dragHandle}
          {...panResponder.panHandlers}
        >
          <TouchableOpacity
            onPress={togglePullUpSheet}
            activeOpacity={0.7}
            style={styles.dragHandleTouchable}
          >
            <View style={styles.dragHandleBar} />
          </TouchableOpacity>
        </View>

        {/* Scrollable Tasks Section */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollableSection}
          contentContainerStyle={styles.scrollableContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          scrollEnabled={true}
        >
          {allDatesInView.map((date, index) => renderDateSection(date, index))}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F0ED',
  },
  topSection: {
    backgroundColor: '#F1F0ED',
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    height: 60,
  },
  navButton: {
    padding: Theme.spacing.xs,
    minWidth: 40,
    alignItems: 'center',
  },
  monthText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF6B35',
  },
  dayCirclesGrid: {
    paddingHorizontal: Theme.spacing.md,
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: Theme.spacing.xs,
  },
  dayNameContainer: {
    width: DAY_CIRCLE_SIZE,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: DAY_CIRCLE_MARGIN,
  },
  dayNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: Theme.spacing.xs,
  },
  dayCircle: {
    width: DAY_CIRCLE_SIZE,
    height: DAY_CIRCLE_SIZE,
    borderRadius: DAY_CIRCLE_SIZE / 2,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: DAY_CIRCLE_MARGIN,
  },
  dayCircleSelected: {
    backgroundColor: '#FF6B35',
  },
  dayCircleToday: {
    backgroundColor: '#FFE5DC',
  },
  dayCircleOtherMonth: {
    backgroundColor: '#FAFAFA',
  },
  dayCircleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  dayCircleTextSelected: {
    color: '#FFFFFF',
  },
  dayCircleTextToday: {
    color: '#FF6B35',
  },
  dayCircleTextOtherMonth: {
    color: '#CCCCCC',
  },
  pullUpSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F1F0ED',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  dragHandle: {
    paddingVertical: Theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandleTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.xs,
  },
  dragHandleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#CCCCCC',
    borderRadius: 2,
  },
  scrollableSection: {
    flex: 1,
  },
  scrollableContent: {
    paddingBottom: Theme.spacing.xl * 2,
  },
  dateHeader: {
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.lg,
    paddingBottom: Theme.spacing.sm,
    backgroundColor: '#F1F0ED',
  },
  dateHeaderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
  },
  taskItem: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    backgroundColor: '#F1F0ED',
  },
  taskContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    flex: 1,
  },
  taskTime: {
    fontSize: 14,
    fontWeight: '400',
    color: '#666666',
    marginLeft: Theme.spacing.md,
  },
  emptyState: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.xl,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999999',
  },
});
