import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db } from './firebase';
import { Reminder } from '../types';
import { NotificationService } from './notificationService';

export class ReminderService {
  // Create a new reminder
  static async createReminder(
    userId: string,
    title: string,
    description: string,
    frequency: 'daily' | 'weekly' | 'monthly',
    schedule: number[] | { day: number; hour: number }[]
  ): Promise<string> {
    try {
      const reminderData: Omit<Reminder, 'id'> = {
        userId,
        title,
        description,
        frequency,
        schedule,
        isActive: true,
        createdAt: new Date(),
      };

      const docRef = await addDoc(collection(db, 'reminders'), reminderData);
      // Schedule local notifications for this reminder
      await NotificationService.scheduleReminderNotifications({ id: docRef.id, ...reminderData });
      return docRef.id;
    } catch (error) {
      if (__DEV__) console.error('Error creating reminder:', error);
      throw error;
    }
  }

  // Get all reminders for a user
  static async getUserReminders(userId: string): Promise<Reminder[]> {
    try {
      const remindersQuery = query(
        collection(db, 'reminders'),
        where('userId', '==', userId),
      );

      const querySnapshot = await getDocs(remindersQuery);
      const reminders = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        lastTriggered: doc.data().lastTriggered?.toDate(),
      })) as Reminder[];
      // Sort client-side to avoid needing a composite index
      reminders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return reminders;
    } catch (error) {
      if (__DEV__) console.error('Error getting user reminders:', error);
      throw error;
    }
  }

  // Update a reminder
  static async updateReminder(
    reminderId: string,
    updates: Partial<Reminder>
  ): Promise<void> {
    try {
      await updateDoc(doc(db, 'reminders', reminderId), {
        ...updates,
      });
    } catch (error) {
      if (__DEV__) console.error('Error updating reminder:', error);
      throw error;
    }
  }

  // Delete a reminder
  static async deleteReminder(reminderId: string): Promise<void> {
    try {
      await NotificationService.cancelReminderNotifications(reminderId);
      await deleteDoc(doc(db, 'reminders', reminderId));
    } catch (error) {
      if (__DEV__) console.error('Error deleting reminder:', error);
      throw error;
    }
  }

  // Toggle reminder active status
  static async toggleReminder(reminderId: string, isActive: boolean): Promise<void> {
    try {
      await updateDoc(doc(db, 'reminders', reminderId), {
        isActive,
      });
      if (!isActive) {
        await NotificationService.cancelReminderNotifications(reminderId);
      } else {
        // Re-fetch reminder to schedule notifications
        const snap = await getDoc(doc(db, 'reminders', reminderId));
        if (snap.exists()) {
          const data = snap.data();
          const reminder: Reminder = {
            id: snap.id,
            userId: data.userId,
            title: data.title,
            description: data.description,
            frequency: data.frequency,
            schedule: data.schedule,
            isActive: true,
            createdAt: data.createdAt?.toDate() || new Date(),
            lastTriggered: data.lastTriggered?.toDate(),
          };
          await NotificationService.scheduleReminderNotifications(reminder);
        }
      }
    } catch (error) {
      if (__DEV__) console.error('Error toggling reminder:', error);
      throw error;
    }
  }
}

