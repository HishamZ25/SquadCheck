import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  updateDoc,
  deleteDoc,
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { db } from './firebase';
import { Reminder } from '../types';

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
      return docRef.id;
    } catch (error) {
      console.error('Error creating reminder:', error);
      throw error;
    }
  }

  // Get all reminders for a user
  static async getUserReminders(userId: string): Promise<Reminder[]> {
    try {
      const remindersQuery = query(
        collection(db, 'reminders'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(remindersQuery);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        lastTriggered: doc.data().lastTriggered?.toDate(),
      })) as Reminder[];
    } catch (error) {
      console.error('Error getting user reminders:', error);
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
      console.error('Error updating reminder:', error);
      throw error;
    }
  }

  // Delete a reminder
  static async deleteReminder(reminderId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'reminders', reminderId));
    } catch (error) {
      console.error('Error deleting reminder:', error);
      throw error;
    }
  }

  // Toggle reminder active status
  static async toggleReminder(reminderId: string, isActive: boolean): Promise<void> {
    try {
      await updateDoc(doc(db, 'reminders', reminderId), {
        isActive,
      });
    } catch (error) {
      console.error('Error toggling reminder:', error);
      throw error;
    }
  }
}

