import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Theme } from '../../constants/theme';
import { useNavigation } from '@react-navigation/native';
import { ReminderService } from '../../services/reminderService';
import { auth } from '../../services/firebase';

type Frequency = 'daily' | 'weekly' | 'monthly';

interface DailySchedule {
  hours: number[]; // Array of hours (0-23), max 3
}

interface WeeklySchedule {
  days: { day: number; hour: number }[]; // day: 0-6 (Sunday-Saturday), max 3
}

interface MonthlySchedule {
  days: { day: number; hour: number }[]; // day: 1-31, max 3
}

export const CreateReminderScreen: React.FC = () => {
  const navigation = useNavigation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<Frequency | null>(null);
  
  // Schedule states
  const [dailySchedule, setDailySchedule] = useState<DailySchedule>({ hours: [] });
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>({ days: [] });
  const [monthlySchedule, setMonthlySchedule] = useState<MonthlySchedule>({ days: [] });
  
  // Time picker states
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerIndex, setTimePickerIndex] = useState<number | null>(null);
  const [timePickerType, setTimePickerType] = useState<'daily' | 'weekly' | 'monthly' | null>(null);
  const [timePickerDay, setTimePickerDay] = useState<number | null>(null);

  const handleFrequencySelect = (freq: Frequency) => {
    setFrequency(freq);
    // Reset schedules when changing frequency
    setDailySchedule({ hours: [] });
    setWeeklySchedule({ days: [] });
    setMonthlySchedule({ days: [] });
  };

  const handleAddDailyTime = () => {
    if (dailySchedule.hours.length >= 3) {
      Alert.alert('Limit Reached', 'You can only add up to 3 times per day');
      return;
    }
    setTimePickerType('daily');
    setTimePickerIndex(dailySchedule.hours.length);
    setShowTimePicker(true);
  };

  const handleAddWeeklyDay = () => {
    if (weeklySchedule.days.length >= 3) {
      Alert.alert('Limit Reached', 'You can only add up to 3 days per week');
      return;
    }
    // For weekly, we'll add the day first, then pick time
    const newDay = weeklySchedule.days.length;
    setWeeklySchedule({
      days: [...weeklySchedule.days, { day: 0, hour: 12 }]
    });
    setTimePickerType('weekly');
    setTimePickerIndex(newDay);
    setShowTimePicker(true);
  };

  const handleAddMonthlyDay = () => {
    if (monthlySchedule.days.length >= 3) {
      Alert.alert('Limit Reached', 'You can only add up to 3 days per month');
      return;
    }
    const newDay = monthlySchedule.days.length;
    setMonthlySchedule({
      days: [...monthlySchedule.days, { day: 1, hour: 12 }]
    });
    setTimePickerType('monthly');
    setTimePickerIndex(newDay);
    setShowTimePicker(true);
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime && timePickerIndex !== null && timePickerType) {
      const hour = selectedTime.getHours();
      
      if (timePickerType === 'daily') {
        const newHours = [...dailySchedule.hours];
        newHours[timePickerIndex] = hour;
        setDailySchedule({ hours: newHours });
      } else if (timePickerType === 'weekly') {
        const newDays = [...weeklySchedule.days];
        newDays[timePickerIndex].hour = hour;
        setWeeklySchedule({ days: newDays });
      } else if (timePickerType === 'monthly') {
        const newDays = [...monthlySchedule.days];
        newDays[timePickerIndex].hour = hour;
        setMonthlySchedule({ days: newDays });
      }
    }
    setTimePickerIndex(null);
    setTimePickerType(null);
  };

  const handleDayChange = (index: number, day: number, type: 'weekly' | 'monthly') => {
    if (type === 'weekly') {
      const newDays = [...weeklySchedule.days];
      newDays[index].day = day;
      setWeeklySchedule({ days: newDays });
    } else {
      const newDays = [...monthlySchedule.days];
      newDays[index].day = day;
      setMonthlySchedule({ days: newDays });
    }
  };

  const removeScheduleItem = (index: number, type: Frequency) => {
    if (type === 'daily') {
      setDailySchedule({ hours: dailySchedule.hours.filter((_, i) => i !== index) });
    } else if (type === 'weekly') {
      setWeeklySchedule({ days: weeklySchedule.days.filter((_, i) => i !== index) });
    } else {
      setMonthlySchedule({ days: monthlySchedule.days.filter((_, i) => i !== index) });
    }
  };

  const handleCreateReminder = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    if (!frequency) {
      Alert.alert('Error', 'Please select a frequency');
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to create a reminder');
      return;
    }

    let schedule: number[] | { day: number; hour: number }[] = [];

    if (frequency === 'daily') {
      if (dailySchedule.hours.length === 0) {
        Alert.alert('Error', 'Please add at least one time for daily reminders');
        return;
      }
      schedule = dailySchedule.hours;
    } else if (frequency === 'weekly') {
      if (weeklySchedule.days.length === 0) {
        Alert.alert('Error', 'Please add at least one day for weekly reminders');
        return;
      }
      schedule = weeklySchedule.days;
    } else if (frequency === 'monthly') {
      if (monthlySchedule.days.length === 0) {
        Alert.alert('Error', 'Please add at least one day for monthly reminders');
        return;
      }
      schedule = monthlySchedule.days;
    }

    try {
      await ReminderService.createReminder(
        currentUser.uid,
        title.trim(),
        description.trim(),
        frequency,
        schedule
      );

      Alert.alert('Success', 'Reminder created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error creating reminder:', error);
      Alert.alert('Error', 'Failed to create reminder. Please try again.');
    }
  };

  const renderFrequencyOptions = () => (
    <View style={styles.frequencyContainer}>
      <Text style={styles.sectionTitle}>Frequency</Text>
      <TouchableOpacity
        style={[
          styles.frequencyOption,
          frequency === 'daily' && styles.selectedFrequencyOption
        ]}
        onPress={() => handleFrequencySelect('daily')}
      >
        <View style={styles.frequencyHeader}>
          <Ionicons 
            name="calendar" 
            size={24} 
            color={frequency === 'daily' ? '#FF6B35' : '#9CA3AF'} 
          />
          <Text style={[
            styles.frequencyTitle,
            frequency === 'daily' && styles.selectedFrequencyTitle
          ]}>
            Daily
          </Text>
        </View>
        <Text style={styles.frequencySubtitle}>
          Up to 3 times per day
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.frequencyOption,
          frequency === 'weekly' && styles.selectedFrequencyOption
        ]}
        onPress={() => handleFrequencySelect('weekly')}
      >
        <View style={styles.frequencyHeader}>
          <Ionicons 
            name="calendar-outline" 
            size={24} 
            color={frequency === 'weekly' ? '#FF6B35' : '#9CA3AF'} 
          />
          <Text style={[
            styles.frequencyTitle,
            frequency === 'weekly' && styles.selectedFrequencyTitle
          ]}>
            Weekly
          </Text>
        </View>
        <Text style={styles.frequencySubtitle}>
          Up to 3 days per week
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.frequencyOption,
          frequency === 'monthly' && styles.selectedFrequencyOption
        ]}
        onPress={() => handleFrequencySelect('monthly')}
      >
        <View style={styles.frequencyHeader}>
          <Ionicons 
            name="calendar-number" 
            size={24} 
            color={frequency === 'monthly' ? '#FF6B35' : '#9CA3AF'} 
          />
          <Text style={[
            styles.frequencyTitle,
            frequency === 'monthly' && styles.selectedFrequencyTitle
          ]}>
            Monthly
          </Text>
        </View>
        <Text style={styles.frequencySubtitle}>
          Up to 3 days per month
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderDailySchedule = () => (
    <View style={styles.scheduleContainer}>
      <Text style={styles.scheduleTitle}>Times (up to 3)</Text>
      {dailySchedule.hours.map((hour, index) => (
        <View key={index} style={styles.scheduleItem}>
          <TouchableOpacity
            style={styles.timeButton}
            onPress={() => {
              setTimePickerType('daily');
              setTimePickerIndex(index);
              setShowTimePicker(true);
            }}
          >
            <Ionicons name="time-outline" size={18} color={Theme.colors.secondary} />
            <Text style={styles.timeButtonText}>
              {hour.toString().padStart(2, '0')}:00
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => removeScheduleItem(index, 'daily')}
            style={styles.removeButton}
          >
            <Ionicons name="close-circle" size={20} color={Theme.colors.error} />
          </TouchableOpacity>
        </View>
      ))}
      {dailySchedule.hours.length < 3 && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddDailyTime}
        >
          <Ionicons name="add-circle-outline" size={20} color={Theme.colors.secondary} />
          <Text style={styles.addButtonText}>Add Time</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderWeeklySchedule = () => (
    <View style={styles.scheduleContainer}>
      <Text style={styles.scheduleTitle}>Days & Times (up to 3)</Text>
      {weeklySchedule.days.map((item, index) => (
        <View key={index} style={styles.scheduleItem}>
          <View style={styles.dayTimeRow}>
            <View style={styles.daySelector}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScrollView}>
                <View style={styles.dayButtons}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName, dayIndex) => (
                    <TouchableOpacity
                      key={dayIndex}
                      style={[
                        styles.dayButton,
                        item.day === dayIndex && styles.selectedDayButton
                      ]}
                      onPress={() => handleDayChange(index, dayIndex, 'weekly')}
                    >
                      <Text style={[
                        styles.dayButtonText,
                        item.day === dayIndex && styles.selectedDayButtonText
                      ]}>
                        {dayName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => {
                setTimePickerType('weekly');
                setTimePickerIndex(index);
                setShowTimePicker(true);
              }}
            >
              <Ionicons name="time-outline" size={18} color={Theme.colors.secondary} />
              <Text style={styles.timeButtonText}>
                {item.hour.toString().padStart(2, '0')}:00
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => removeScheduleItem(index, 'weekly')}
              style={styles.removeButton}
            >
              <Ionicons name="close-circle" size={20} color={Theme.colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      ))}
      {weeklySchedule.days.length < 3 && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddWeeklyDay}
        >
          <Ionicons name="add-circle-outline" size={20} color={Theme.colors.secondary} />
          <Text style={styles.addButtonText}>Add Day</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderMonthlySchedule = () => (
    <View style={styles.scheduleContainer}>
      <Text style={styles.scheduleTitle}>Days & Times (up to 3)</Text>
      {monthlySchedule.days.map((item, index) => (
        <View key={index} style={styles.scheduleItem}>
          <View style={styles.dayTimeRow}>
            <View style={styles.numberSelector}>
              <TouchableOpacity
                style={styles.numberButton}
                onPress={() => {
                  const newDay = Math.max(1, item.day - 1);
                  handleDayChange(index, newDay, 'monthly');
                }}
              >
                <Ionicons name="remove" size={16} color={Theme.colors.white} />
              </TouchableOpacity>
              <Text style={styles.numberValue}>{item.day}</Text>
              <TouchableOpacity
                style={styles.numberButton}
                onPress={() => {
                  const newDay = Math.min(31, item.day + 1);
                  handleDayChange(index, newDay, 'monthly');
                }}
              >
                <Ionicons name="add" size={16} color={Theme.colors.white} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => {
                setTimePickerType('monthly');
                setTimePickerIndex(index);
                setShowTimePicker(true);
              }}
            >
              <Ionicons name="time-outline" size={18} color={Theme.colors.secondary} />
              <Text style={styles.timeButtonText}>
                {item.hour.toString().padStart(2, '0')}:00
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => removeScheduleItem(index, 'monthly')}
              style={styles.removeButton}
            >
              <Ionicons name="close-circle" size={20} color={Theme.colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      ))}
      {monthlySchedule.days.length < 3 && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddMonthlyDay}
        >
          <Ionicons name="add-circle-outline" size={20} color={Theme.colors.secondary} />
          <Text style={styles.addButtonText}>Add Day</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Back Button */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color="#000000" />
        </TouchableOpacity>

        <Text style={styles.mainTitle}>Create Reminder</Text>
        <Text style={styles.mainSubtitle}>
          Set up a reminder to help you stay on track
        </Text>

        {/* Title Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Title</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter reminder title..."
            placeholderTextColor={Theme.colors.textTertiary}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Description Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <TextInput
            style={[styles.textInput, styles.descriptionInput]}
            placeholder="Enter reminder description..."
            placeholderTextColor={Theme.colors.textTertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Frequency Selection */}
        {renderFrequencyOptions()}

        {/* Schedule Configuration */}
        {frequency === 'daily' && renderDailySchedule()}
        {frequency === 'weekly' && renderWeeklySchedule()}
        {frequency === 'monthly' && renderMonthlySchedule()}
      </ScrollView>

      {/* Create Button */}
      {frequency && (
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateReminder}
          >
            <Text style={styles.createButtonText}>Create Reminder</Text>
            <Ionicons name="checkmark-circle" size={20} color={Theme.colors.white} />
          </TouchableOpacity>
        </View>
      )}

      {/* Time Picker Modal for iOS */}
      {Platform.OS === 'ios' && showTimePicker && (
        <Modal
          visible={showTimePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowTimePicker(false)}
        >
          <View style={styles.pickerModalContainer}>
            <View style={styles.pickerModalContent}>
              <View style={styles.pickerModalHeader}>
                <TouchableOpacity
                  onPress={() => setShowTimePicker(false)}
                  style={styles.pickerModalButton}
                >
                  <Text style={styles.pickerModalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.pickerModalTitle}>Select Time</Text>
                <TouchableOpacity
                  onPress={() => setShowTimePicker(false)}
                  style={styles.pickerModalButton}
                >
                  <Text style={styles.pickerModalDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={new Date()}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
                textColor={Theme.colors.white}
                accentColor={Theme.colors.secondary}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Time Picker for Android */}
      {Platform.OS === 'android' && showTimePicker && (
        <DateTimePicker
          value={new Date()}
          mode="time"
          display="default"
          onChange={handleTimeChange}
          textColor={Theme.colors.white}
          accentColor={Theme.colors.secondary}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F0ED',
  },
  
  backButton: {
    padding: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
    alignSelf: 'flex-start',
  },
  
  content: {
    flex: 1,
    padding: Theme.spacing.md,
  },
  
  mainTitle: {
    ...Theme.typography.h2,
    color: '#FF6B35',
    textAlign: 'center',
    marginBottom: Theme.spacing.xs,
    fontWeight: '700',
  },
  
  mainSubtitle: {
    ...Theme.typography.body,
    color: '#666666',
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
  },
  
  section: {
    marginBottom: Theme.spacing.md,
  },
  
  sectionTitle: {
    ...Theme.typography.h4,
    color: '#000000',
    marginBottom: Theme.spacing.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FF6B35',
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    color: '#000000',
    fontSize: 16,
    height: Theme.layout.inputHeight,
  },
  
  descriptionInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: Theme.spacing.sm,
  },
  
  frequencyContainer: {
    marginBottom: Theme.spacing.lg,
  },
  
  frequencyOption: {
    backgroundColor: '#F5F5F5',
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  
  selectedFrequencyOption: {
    borderColor: '#FF6B35',
  },
  
  frequencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.xs,
  },
  
  frequencyTitle: {
    ...Theme.typography.h4,
    color: '#9CA3AF',
    fontWeight: '600',
    marginLeft: Theme.spacing.sm,
  },
  
  selectedFrequencyTitle: {
    color: '#FF6B35',
  },
  
  frequencySubtitle: {
    ...Theme.typography.bodySmall,
    color: '#666666',
    marginLeft: Theme.spacing.xl + Theme.spacing.sm,
  },
  
  scheduleContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
  },
  
  scheduleTitle: {
    ...Theme.typography.h4,
    color: '#000000',
    fontWeight: '600',
    marginBottom: Theme.spacing.md,
    textAlign: 'center',
  },
  
  scheduleItem: {
    marginBottom: Theme.spacing.sm,
    paddingBottom: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#4B5563',
  },
  
  dayTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  
  daySelector: {
    flex: 1,
  },
  
  dayScrollView: {
    marginVertical: Theme.spacing.xs,
  },
  
  dayButtons: {
    flexDirection: 'row',
    gap: Theme.spacing.xs,
    paddingRight: Theme.spacing.sm,
  },
  
  dayButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: Theme.borderRadius.sm,
    paddingVertical: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.sm,
    minWidth: 45,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  
  selectedDayButton: {
    backgroundColor: Theme.colors.secondary,
    borderColor: Theme.colors.secondary,
  },
  
  dayButtonText: {
    ...Theme.typography.bodySmall,
    color: '#000000',
    fontSize: 12,
  },
  
  selectedDayButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  
  numberSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    minWidth: 100,
  },
  
  numberButton: {
    backgroundColor: Theme.colors.secondary,
    borderRadius: Theme.borderRadius.sm,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  numberValue: {
    ...Theme.typography.body,
    color: '#000000',
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'center',
    fontSize: 14,
  },
  
  timeButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    minWidth: 90,
  },
  
  timeButtonText: {
    ...Theme.typography.body,
    color: '#FFFFFF',
    fontSize: 14,
  },
  
  removeButton: {
    padding: Theme.spacing.xs,
  },
  
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.sm,
    marginTop: Theme.spacing.xs,
  },
  
  addButtonText: {
    ...Theme.typography.bodySmall,
    color: Theme.colors.secondary,
    marginLeft: Theme.spacing.xs,
    fontWeight: '600',
  },
  
  bottomContainer: {
    padding: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    backgroundColor: '#F1F0ED',
  },
  
  createButton: {
    backgroundColor: '#FF6B35',
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadows.sm,
  },
  
  createButtonText: {
    ...Theme.typography.button,
    color: '#FFFFFF',
    fontWeight: '600',
    marginRight: Theme.spacing.sm,
  },
  
  pickerModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  
  pickerModalContent: {
    backgroundColor: '#F1F0ED',
    borderTopLeftRadius: Theme.borderRadius.xl,
    borderTopRightRadius: Theme.borderRadius.xl,
    paddingBottom: Theme.spacing.xl,
  },
  
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  
  pickerModalButton: {
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
  },
  
  pickerModalCancelText: {
    ...Theme.typography.body,
    color: '#666666',
  },
  
  pickerModalDoneText: {
    ...Theme.typography.body,
    color: Theme.colors.secondary,
    fontWeight: '600',
  },
  
  pickerModalTitle: {
    ...Theme.typography.h4,
    color: '#000000',
    fontWeight: '600',
  },
});

