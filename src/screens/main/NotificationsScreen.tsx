import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorMode } from '../../theme/ColorModeContext';
import { useCurrentUser } from '../../contexts/UserContext';
import { NotificationService } from '../../services/notificationService';
import { NotificationPreferences } from '../../types';

interface NotificationOption {
  id: keyof NotificationPreferences;
  label: string;
  description?: string;
}

const NOTIFICATION_OPTIONS: NotificationOption[] = [
  { id: 'hour_before', label: 'Notify an hour before submissions', description: 'Reminder 1 hour before check-in is due' },
  { id: 'chat_all', label: 'Notify for all chat messages', description: 'When anyone sends a message in your groups' },
  { id: 'group_checkins', label: 'Notify when users in your groups check in', description: 'When friends complete their check-ins' },
  { id: 'elimination', label: 'Notify on eliminations', description: 'When someone is eliminated from a challenge' },
  { id: 'invites', label: 'Notify for group and challenge invites', description: 'When you\'re invited to a group or challenge' },
  { id: 'reminders', label: 'Daily reminder digest', description: 'Summary of upcoming check-ins each morning' },
];

interface NotificationsScreenProps {
  navigation: any;
  route: any;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ navigation }) => {
  const { colors } = useColorMode();
  const { user } = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [toggles, setToggles] = useState<NotificationPreferences>({
    hour_before: true,
    chat_all: true,
    group_checkins: true,
    elimination: true,
    invites: true,
    reminders: false,
  });

  useEffect(() => {
    if (!user?.id) return;
    NotificationService.loadPreferences(user.id).then((prefs) => {
      setToggles(prefs);
      setLoading(false);
    });
  }, [user?.id]);

  const handleBack = () => navigation.goBack();

  const setToggle = useCallback(
    async (id: keyof NotificationPreferences, value: boolean) => {
      if (!user?.id) return;

      const updated = { ...toggles, [id]: value };
      setToggles(updated);
      await NotificationService.savePreferences(user.id, updated);

      // Handle local notification scheduling
      if (id === 'reminders') {
        if (value) {
          await NotificationService.scheduleDailyDigest();
        } else {
          await NotificationService.cancelDailyDigest();
        }
      }
    },
    [toggles, user?.id],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Choose what you want to be notified about.
          </Text>

          {NOTIFICATION_OPTIONS.map((opt) => (
            <View
              key={opt.id}
              style={[styles.optionCard, { backgroundColor: colors.card, borderColor: colors.dividerLineTodo + '40' }]}
            >
              <View style={styles.optionTextWrap}>
                <Text style={[styles.optionLabel, { color: colors.text }]}>{opt.label}</Text>
                {opt.description ? (
                  <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>{opt.description}</Text>
                ) : null}
              </View>
              <View style={styles.switchWrap}>
                <Switch
                  value={toggles[opt.id] ?? false}
                  onValueChange={(v) => setToggle(opt.id, v)}
                  trackColor={{
                    false: colors.dividerLineTodo + '60',
                    true: colors.accent + 'CC',
                  }}
                  thumbColor="#FFF"
                  ios_backgroundColor={colors.dividerLineTodo + '60'}
                />
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  sectionTitle: {
    fontSize: 13,
    marginBottom: 14,
    lineHeight: 18,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  optionTextWrap: { flex: 1, marginRight: 12 },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  switchWrap: {
    ...(Platform.OS === 'ios' ? { transform: [{ scale: 0.88 }] } : {}),
  },
});
