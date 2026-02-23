import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Theme } from '../../constants/theme';
import { Input } from '../../components/common/Input';
import { useNavigation } from '@react-navigation/native';
import { useColorMode } from '../../theme/ColorModeContext';
import { ReminderService } from '../../services/reminderService';
import { auth } from '../../services/firebase';

type Frequency = 'daily' | 'weekly' | 'monthly';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatHour = (hour: number): string => {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  return `${h}:00 ${suffix}`;
};

const getOrdinal = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export const CreateReminderScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useColorMode();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<Frequency | null>(null);
  const [creating, setCreating] = useState(false);

  // Schedule states
  const [dailyHours, setDailyHours] = useState<number[]>([]);
  const [weeklyDays, setWeeklyDays] = useState<{ day: number; hour: number }[]>([]);
  const [monthlyDays, setMonthlyDays] = useState<{ day: number; hour: number }[]>([]);

  // Time picker
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{
    type: Frequency;
    index: number;
  } | null>(null);
  const pickerDate = useRef(new Date());

  // -----------------------------------------------------------------------
  // Frequency
  // -----------------------------------------------------------------------

  const handleFrequencySelect = (freq: Frequency) => {
    setFrequency(freq);
    setDailyHours([]);
    setWeeklyDays([]);
    setMonthlyDays([]);
  };

  // -----------------------------------------------------------------------
  // Add / remove schedule items
  // -----------------------------------------------------------------------

  const openTimePicker = (type: Frequency, index: number, currentHour?: number) => {
    const d = new Date();
    d.setHours(currentHour ?? 12, 0, 0, 0);
    pickerDate.current = d;
    setPickerTarget({ type, index });
    setShowTimePicker(true);
  };

  const handleAddDaily = () => {
    if (dailyHours.length >= 3) return;
    const idx = dailyHours.length;
    setDailyHours([...dailyHours, 12]);
    openTimePicker('daily', idx, 12);
  };

  const handleAddWeekly = () => {
    if (weeklyDays.length >= 3) return;
    const idx = weeklyDays.length;
    setWeeklyDays([...weeklyDays, { day: 1, hour: 12 }]);
    openTimePicker('weekly', idx, 12);
  };

  const handleAddMonthly = () => {
    if (monthlyDays.length >= 3) return;
    const idx = monthlyDays.length;
    setMonthlyDays([...monthlyDays, { day: 1, hour: 12 }]);
    openTimePicker('monthly', idx, 12);
  };

  const removeItem = (type: Frequency, index: number) => {
    if (type === 'daily') setDailyHours(dailyHours.filter((_, i) => i !== index));
    else if (type === 'weekly') setWeeklyDays(weeklyDays.filter((_, i) => i !== index));
    else setMonthlyDays(monthlyDays.filter((_, i) => i !== index));
  };

  // -----------------------------------------------------------------------
  // Time picker callbacks
  // -----------------------------------------------------------------------

  const applyPickerTime = (date: Date) => {
    if (!pickerTarget) return;
    const hour = date.getHours();
    const { type, index } = pickerTarget;

    if (type === 'daily') {
      const next = [...dailyHours];
      next[index] = hour;
      setDailyHours(next);
    } else if (type === 'weekly') {
      const next = [...weeklyDays];
      next[index] = { ...next[index], hour };
      setWeeklyDays(next);
    } else {
      const next = [...monthlyDays];
      next[index] = { ...next[index], hour };
      setMonthlyDays(next);
    }
  };

  const handleAndroidTimeChange = (_: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) applyPickerTime(selectedTime);
    setPickerTarget(null);
  };

  const handleIOSDone = () => {
    applyPickerTime(pickerDate.current);
    setShowTimePicker(false);
    setPickerTarget(null);
  };

  const handleIOSCancel = () => {
    setShowTimePicker(false);
    setPickerTarget(null);
  };

  // -----------------------------------------------------------------------
  // Day changes (weekly / monthly)
  // -----------------------------------------------------------------------

  const setWeeklyDay = (index: number, day: number) => {
    const next = [...weeklyDays];
    next[index] = { ...next[index], day };
    setWeeklyDays(next);
  };

  const setMonthlyDay = (index: number, day: number) => {
    const next = [...monthlyDays];
    next[index] = { ...next[index], day: Math.max(1, Math.min(31, day)) };
    setMonthlyDays(next);
  };

  // -----------------------------------------------------------------------
  // Create
  // -----------------------------------------------------------------------

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for your reminder.');
      return;
    }
    if (!frequency) {
      Alert.alert('Missing Frequency', 'Please select how often you want to be reminded.');
      return;
    }

    let schedule: number[] | { day: number; hour: number }[] = [];
    if (frequency === 'daily') {
      if (dailyHours.length === 0) {
        Alert.alert('No Time Set', 'Add at least one time for your daily reminder.');
        return;
      }
      schedule = dailyHours;
    } else if (frequency === 'weekly') {
      if (weeklyDays.length === 0) {
        Alert.alert('No Day Set', 'Add at least one day for your weekly reminder.');
        return;
      }
      schedule = weeklyDays;
    } else {
      if (monthlyDays.length === 0) {
        Alert.alert('No Day Set', 'Add at least one day for your monthly reminder.');
        return;
      }
      schedule = monthlyDays;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in.');
      return;
    }

    setCreating(true);
    try {
      await ReminderService.createReminder(
        currentUser.uid,
        title.trim(),
        description.trim(),
        frequency,
        schedule,
      );
      Alert.alert('Success', 'Reminder created!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to create reminder. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  const scheduleCount =
    frequency === 'daily'
      ? dailyHours.length
      : frequency === 'weekly'
        ? weeklyDays.length
        : monthlyDays.length;

  const FrequencyCard = ({
    freq,
    icon,
    label,
    sub,
  }: {
    freq: Frequency;
    icon: string;
    label: string;
    sub: string;
  }) => {
    const selected = frequency === freq;
    return (
      <TouchableOpacity
        style={[
          styles.freqCard,
          { backgroundColor: colors.card, borderColor: colors.dividerLineTodo + '40' },
          selected && { borderColor: colors.accent },
        ]}
        onPress={() => handleFrequencySelect(freq)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={icon as any}
          size={22}
          color={selected ? colors.accent : colors.textSecondary}
        />
        <View style={styles.freqTextWrap}>
          <Text style={[styles.freqLabel, { color: selected ? colors.accent : colors.text }]}>
            {label}
          </Text>
          <Text style={[styles.freqSub, { color: colors.textSecondary }]}>{sub}</Text>
        </View>
        {selected && <Ionicons name="checkmark-circle" size={22} color={colors.accent} />}
      </TouchableOpacity>
    );
  };

  const TimeChip = ({
    hour,
    onPress,
    onRemove,
  }: {
    hour: number;
    onPress: () => void;
    onRemove: () => void;
  }) => (
    <View style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.dividerLineTodo + '40' }]}>
      <TouchableOpacity onPress={onPress} style={styles.chipTap}>
        <Ionicons name="time-outline" size={16} color={colors.accent} />
        <Text style={[styles.chipText, { color: colors.text }]}>{formatHour(hour)}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );

  // -----------------------------------------------------------------------
  // Schedule sections
  // -----------------------------------------------------------------------

  const renderDailySchedule = () => (
    <View style={[styles.scheduleCard, { backgroundColor: colors.card, borderColor: colors.dividerLineTodo + '40' }]}>
      <Text style={[styles.scheduleLabel, { color: colors.text }]}>Reminder Times</Text>
      {dailyHours.map((hour, i) => (
        <TimeChip
          key={i}
          hour={hour}
          onPress={() => openTimePicker('daily', i, hour)}
          onRemove={() => removeItem('daily', i)}
        />
      ))}
      {dailyHours.length < 3 && (
        <TouchableOpacity style={styles.addRow} onPress={handleAddDaily}>
          <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
          <Text style={[styles.addText, { color: colors.accent }]}>Add Time</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderWeeklySchedule = () => (
    <View style={[styles.scheduleCard, { backgroundColor: colors.card, borderColor: colors.dividerLineTodo + '40' }]}>
      <Text style={[styles.scheduleLabel, { color: colors.text }]}>Days & Times</Text>
      {weeklyDays.map((item, i) => (
        <View key={i} style={[styles.scheduleRow, { borderBottomColor: colors.dividerLineTodo + '25' }]}>
          <View style={styles.dayPills}>
            {DAY_NAMES.map((name, dayIdx) => (
              <TouchableOpacity
                key={dayIdx}
                style={[
                  styles.dayPill,
                  { backgroundColor: colors.background, borderColor: colors.dividerLineTodo + '50' },
                  item.day === dayIdx && { backgroundColor: colors.accent, borderColor: colors.accent },
                ]}
                onPress={() => setWeeklyDay(i, dayIdx)}
              >
                <Text
                  style={[
                    styles.dayPillText,
                    { color: colors.textSecondary },
                    item.day === dayIdx && { color: '#FFF', fontWeight: '700' },
                  ]}
                >
                  {name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.chipRow}>
            <TimeChip
              hour={item.hour}
              onPress={() => openTimePicker('weekly', i, item.hour)}
              onRemove={() => removeItem('weekly', i)}
            />
          </View>
        </View>
      ))}
      {weeklyDays.length < 3 && (
        <TouchableOpacity style={styles.addRow} onPress={handleAddWeekly}>
          <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
          <Text style={[styles.addText, { color: colors.accent }]}>Add Day</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderMonthlySchedule = () => (
    <View style={[styles.scheduleCard, { backgroundColor: colors.card, borderColor: colors.dividerLineTodo + '40' }]}>
      <Text style={[styles.scheduleLabel, { color: colors.text }]}>Days & Times</Text>
      {monthlyDays.map((item, i) => (
        <View key={i} style={[styles.scheduleRow, { borderBottomColor: colors.dividerLineTodo + '25' }]}>
          <View style={styles.monthDayRow}>
            <Text style={[styles.monthDayLabel, { color: colors.textSecondary }]}>Day of month</Text>
            <View style={[styles.stepper, { backgroundColor: colors.background, borderColor: colors.dividerLineTodo + '50' }]}>
              <TouchableOpacity
                style={[styles.stepBtn, { backgroundColor: colors.accent }]}
                onPress={() => setMonthlyDay(i, item.day - 1)}
              >
                <Ionicons name="remove" size={16} color="#FFF" />
              </TouchableOpacity>
              <Text style={[styles.stepValue, { color: colors.text }]}>{getOrdinal(item.day)}</Text>
              <TouchableOpacity
                style={[styles.stepBtn, { backgroundColor: colors.accent }]}
                onPress={() => setMonthlyDay(i, item.day + 1)}
              >
                <Ionicons name="add" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.chipRow}>
            <TimeChip
              hour={item.hour}
              onPress={() => openTimePicker('monthly', i, item.hour)}
              onRemove={() => removeItem('monthly', i)}
            />
          </View>
        </View>
      ))}
      {monthlyDays.length < 3 && (
        <TouchableOpacity style={styles.addRow} onPress={handleAddMonthly}>
          <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
          <Text style={[styles.addText, { color: colors.accent }]}>Add Day</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Create Reminder</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Set up a reminder to help you stay on track.
        </Text>

        {/* Title */}
        <View style={styles.section}>
          <Input
            label="Title"
            placeholder="e.g. Drink water, Read 10 pages..."
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Input
            label="Description (optional)"
            placeholder="Add a note for yourself..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Frequency */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>Frequency</Text>
        <FrequencyCard freq="daily" icon="today-outline" label="Daily" sub="Up to 3 times per day" />
        <FrequencyCard freq="weekly" icon="calendar-outline" label="Weekly" sub="Up to 3 days per week" />
        <FrequencyCard freq="monthly" icon="calendar-number-outline" label="Monthly" sub="Up to 3 days per month" />

        {/* Schedule */}
        {frequency === 'daily' && renderDailySchedule()}
        {frequency === 'weekly' && renderWeeklySchedule()}
        {frequency === 'monthly' && renderMonthlySchedule()}

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* Create button */}
      {frequency && (
        <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: colors.dividerLineTodo + '30' }]}>
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: colors.accent, opacity: creating ? 0.6 : 1 }]}
            onPress={handleCreate}
            disabled={creating}
            activeOpacity={0.8}
          >
            <Text style={styles.createBtnText}>
              {creating ? 'Creating...' : 'Create Reminder'}
            </Text>
            {!creating && <Ionicons name="checkmark-circle" size={20} color="#FFF" />}
          </TouchableOpacity>
        </View>
      )}

      {/* iOS time picker modal */}
      {Platform.OS === 'ios' && showTimePicker && (
        <Modal visible transparent animationType="slide" onRequestClose={handleIOSCancel}>
          <View style={styles.pickerOverlay}>
            <View style={[styles.pickerSheet, { backgroundColor: colors.surface }]}>
              <View style={[styles.pickerHeader, { borderBottomColor: colors.dividerLineTodo + '40' }]}>
                <TouchableOpacity onPress={handleIOSCancel} style={styles.pickerBtn}>
                  <Text style={[styles.pickerCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.pickerTitle, { color: colors.text }]}>Select Time</Text>
                <TouchableOpacity onPress={handleIOSDone} style={styles.pickerBtn}>
                  <Text style={[styles.pickerDoneText, { color: colors.accent }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pickerDate.current}
                mode="time"
                display="spinner"
                onChange={(_, date) => {
                  if (date) pickerDate.current = date;
                }}
                textColor={colors.text}
                accentColor={colors.accent}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Android time picker */}
      {Platform.OS === 'android' && showTimePicker && (
        <DateTimePicker
          value={pickerDate.current}
          mode="time"
          display="default"
          onChange={handleAndroidTimeChange}
        />
      )}
    </SafeAreaView>
  );
};

// -----------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: 8,
  },
  headerTitle: { fontSize: 28, fontWeight: '700', flex: 1, textAlign: 'center' },
  headerSpacer: { width: 48 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 20 },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  section: { marginBottom: 14 },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  // Frequency cards
  freqCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  freqTextWrap: { flex: 1 },
  freqLabel: { fontSize: 16, fontWeight: '600' },
  freqSub: { fontSize: 12, marginTop: 2 },
  // Schedule card
  scheduleCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginTop: 16,
  },
  scheduleLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  scheduleRow: {
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
  },
  // Chips
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingRight: 8,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  chipTap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 8,
  },
  chipText: { fontSize: 14, fontWeight: '600' },
  chipRow: { marginTop: 8 },
  // Day pills (weekly)
  dayPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dayPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  dayPillText: { fontSize: 12, fontWeight: '500' },
  // Monthly stepper
  monthDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthDayLabel: { fontSize: 14 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 8,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    fontSize: 15,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'center',
  },
  // Add row
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 4,
  },
  addText: { fontSize: 14, fontWeight: '600' },
  // Bottom bar
  bottomBar: {
    padding: 16,
    borderTopWidth: 1,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  createBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  bottomPad: { height: 20 },
  // iOS picker modal
  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  pickerBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  pickerCancelText: { fontSize: 16 },
  pickerDoneText: { fontSize: 16, fontWeight: '600' },
  pickerTitle: { fontSize: 17, fontWeight: '600' },
});
