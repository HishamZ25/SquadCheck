import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import {
  doc,
  updateDoc,
  getDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { NotificationPreferences, AppNotification, Reminder } from '../types';

const DEFAULT_PREFERENCES: NotificationPreferences = {
  hour_before: true,
  chat_all: true,
  group_checkins: true,
  elimination: true,
  invites: true,
  reminders: false,
};

export class NotificationService {
  // -----------------------------------------------------------------------
  // Push token registration
  // -----------------------------------------------------------------------

  static async registerPushToken(userId: string): Promise<string | null> {
    if (!Device.isDevice) {
      if (__DEV__) console.log('Push notifications require a physical device');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      if (__DEV__) console.log('Push notification permission not granted');
      return null;
    }

    // Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: undefined, // Uses the project ID from app.json
    });
    const token = tokenData.data;

    // Save to Firestore user doc
    try {
      await updateDoc(doc(db, 'users', userId), { pushToken: token });
    } catch (err) {
      if (__DEV__) console.error('Failed to save push token:', err);
    }

    return token;
  }

  // -----------------------------------------------------------------------
  // Notification preferences
  // -----------------------------------------------------------------------

  static async loadPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const prefs = userDoc.data().notificationPreferences;
        if (prefs) {
          return { ...DEFAULT_PREFERENCES, ...prefs };
        }
      }
    } catch (err) {
      if (__DEV__) console.error('Failed to load notification prefs:', err);
    }
    return { ...DEFAULT_PREFERENCES };
  }

  static async savePreferences(
    userId: string,
    prefs: NotificationPreferences,
  ): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', userId), {
        notificationPreferences: prefs,
      });
    } catch (err) {
      if (__DEV__) console.error('Failed to save notification prefs:', err);
    }
  }

  // -----------------------------------------------------------------------
  // Local scheduled notifications (hour_before + reminders)
  // -----------------------------------------------------------------------

  static async scheduleHourBeforeReminder(
    challengeId: string,
    challengeTitle: string,
    dueDate: Date,
  ): Promise<string | null> {
    const triggerDate = new Date(dueDate.getTime() - 60 * 60 * 1000); // 1 hour before
    if (triggerDate.getTime() <= Date.now()) return null; // Already passed

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Check-in Reminder',
        body: `"${challengeTitle}" is due in 1 hour!`,
        data: { challengeId, type: 'hour_before' },
      },
      trigger: { date: triggerDate },
      identifier: `hour_before_${challengeId}`,
    });
    return id;
  }

  static async cancelHourBeforeReminder(challengeId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(
      `hour_before_${challengeId}`,
    );
  }

  static async scheduleDailyDigest(): Promise<string | null> {
    // Cancel existing first
    await Notifications.cancelScheduledNotificationAsync('daily_digest');

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Daily Digest',
        body: 'Check your upcoming challenges for today!',
        data: { type: 'reminders' },
      },
      trigger: {
        hour: 9,
        minute: 0,
        repeats: true,
      },
      identifier: 'daily_digest',
    });
    return id;
  }

  static async cancelDailyDigest(): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync('daily_digest');
  }

  // -----------------------------------------------------------------------
  // Reminder local notifications
  // -----------------------------------------------------------------------

  static async scheduleReminderNotifications(reminder: Reminder): Promise<void> {
    try {
      if (reminder.frequency === 'daily') {
        // schedule is number[] of hours
        const hours = reminder.schedule as number[];
        for (const hour of hours) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: reminder.title,
              body: reminder.description || 'Time for your reminder!',
              data: { type: 'reminders', reminderId: reminder.id },
            },
            trigger: { hour, minute: 0, repeats: true },
            identifier: `reminder_${reminder.id}_${hour}`,
          });
        }
      } else if (reminder.frequency === 'weekly') {
        // schedule is { day, hour }[] — day is 0=Sun in JS
        const entries = reminder.schedule as { day: number; hour: number }[];
        for (const entry of entries) {
          // Expo weekday: 1=Sunday, 2=Monday, ..., 7=Saturday
          const weekday = entry.day + 1;
          await Notifications.scheduleNotificationAsync({
            content: {
              title: reminder.title,
              body: reminder.description || 'Time for your reminder!',
              data: { type: 'reminders', reminderId: reminder.id },
            },
            trigger: { weekday, hour: entry.hour, minute: 0, repeats: true },
            identifier: `reminder_${reminder.id}_${entry.day}_${entry.hour}`,
          });
        }
      } else if (reminder.frequency === 'monthly') {
        // No native monthly repeat — schedule one-shot for next occurrence
        const entries = reminder.schedule as { day: number; hour: number }[];
        for (const entry of entries) {
          const nextDate = this.computeNextMonthlyDate(entry.day, entry.hour);
          if (nextDate.getTime() > Date.now()) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: reminder.title,
                body: reminder.description || 'Time for your reminder!',
                data: { type: 'reminders', reminderId: reminder.id },
              },
              trigger: { date: nextDate },
              identifier: `reminder_${reminder.id}_${entry.day}_${entry.hour}`,
            });
          }
        }
      }
    } catch (err) {
      if (__DEV__) console.error('Failed to schedule reminder notifications:', err);
    }
  }

  static async cancelReminderNotifications(reminderId: string): Promise<void> {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const prefix = `reminder_${reminderId}_`;
      for (const notif of scheduled) {
        if (notif.identifier.startsWith(prefix)) {
          await Notifications.cancelScheduledNotificationAsync(notif.identifier);
        }
      }
    } catch (err) {
      if (__DEV__) console.error('Failed to cancel reminder notifications:', err);
    }
  }

  static async rescheduleMonthlyReminders(reminders: Reminder[]): Promise<void> {
    for (const reminder of reminders) {
      if (reminder.frequency !== 'monthly' || !reminder.isActive) continue;
      // Cancel existing then reschedule
      await this.cancelReminderNotifications(reminder.id);
      await this.scheduleReminderNotifications(reminder);
    }
  }

  private static computeNextMonthlyDate(day: number, hour: number): Date {
    const now = new Date();
    const candidate = new Date(now.getFullYear(), now.getMonth(), day, hour, 0, 0, 0);
    // If this month's date has passed, use next month
    if (candidate.getTime() <= now.getTime()) {
      candidate.setMonth(candidate.getMonth() + 1);
    }
    // Handle months with fewer days (e.g. day=31 in a 30-day month)
    // Date auto-rolls, which is acceptable
    return candidate;
  }

  // -----------------------------------------------------------------------
  // In-app notifications (Firestore)
  // -----------------------------------------------------------------------

  static async getInAppNotifications(
    userId: string,
    maxCount = 50,
  ): Promise<AppNotification[]> {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(maxCount),
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: data.userId,
          type: data.type,
          title: data.title,
          body: data.body,
          data: data.data,
          read: data.read ?? false,
          createdAt: data.createdAt?.toDate?.() ?? new Date(),
        } as AppNotification;
      });
    } catch (err) {
      if (__DEV__) console.error('Failed to load notifications:', err);
      return [];
    }
  }

  static async markRead(notificationId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
      });
    } catch (err) {
      if (__DEV__) console.error('Failed to mark notification read:', err);
    }
  }

  static async markAllRead(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false),
      );
      const snap = await getDocs(q);
      if (snap.empty) return;

      const batch = writeBatch(db);
      snap.docs.forEach((d) => {
        batch.update(d.ref, { read: true });
      });
      await batch.commit();
    } catch (err) {
      if (__DEV__) console.error('Failed to mark all read:', err);
    }
  }

  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false),
      );
      const snap = await getDocs(q);
      return snap.size;
    } catch (err) {
      if (__DEV__) console.error('Failed to get unread count:', err);
      return 0;
    }
  }

  // -----------------------------------------------------------------------
  // Nudge — write a doc to 'nudges' collection, Cloud Function sends push
  // -----------------------------------------------------------------------

  static async sendNudge(
    targetUserId: string,
    senderUserId: string,
    groupId: string,
  ): Promise<void> {
    try {
      await addDoc(collection(db, 'nudges'), {
        targetUserId,
        senderUserId,
        groupId,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      if (__DEV__) console.error('Failed to send nudge:', err);
      throw err;
    }
  }
}
