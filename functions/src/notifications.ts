/**
 * Push notification helpers for SquadCheck Cloud Functions.
 *
 * Uses the Expo Push API (https://exp.host/--/api/v2/push/send).
 * Also writes in-app notification docs to the `notifications` collection.
 */

import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';

const db = admin.firestore();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NotificationType =
  | 'hour_before'
  | 'chat_all'
  | 'group_checkins'
  | 'elimination'
  | 'invites'
  | 'reminders';

interface NotificationPreferences {
  hour_before: boolean;
  chat_all: boolean;
  group_checkins: boolean;
  elimination: boolean;
  invites: boolean;
  reminders: boolean;
}

interface UserNotificationInfo {
  token: string | null;
  prefs: NotificationPreferences;
  displayName: string;
}

const DEFAULT_PREFS: NotificationPreferences = {
  hour_before: true,
  chat_all: true,
  group_checkins: true,
  elimination: true,
  invites: true,
  reminders: false,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export async function getUserNotificationInfo(
  userId: string,
): Promise<UserNotificationInfo> {
  const snap = await db.collection('users').doc(userId).get();
  if (!snap.exists) {
    return { token: null, prefs: { ...DEFAULT_PREFS }, displayName: 'Someone' };
  }
  const data = snap.data()!;
  return {
    token: (data.pushToken as string) || null,
    prefs: { ...DEFAULT_PREFS, ...(data.notificationPreferences || {}) },
    displayName: (data.displayName as string) || 'Someone',
  };
}

/**
 * Send push notifications to a list of users, respecting their preferences.
 * Also writes an in-app notification doc for each user.
 */
export async function sendPushToUsers(
  userIds: string[],
  notificationType: NotificationType,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  if (userIds.length === 0) return;

  // Batch-fetch user docs
  const BATCH = 100;
  const pushMessages: Array<{
    to: string;
    title: string;
    body: string;
    data?: Record<string, string>;
  }> = [];

  for (let i = 0; i < userIds.length; i += BATCH) {
    const batch = userIds.slice(i, i + BATCH);
    const refs = batch.map((uid) => db.collection('users').doc(uid));
    const snaps = await db.getAll(...refs);

    const writeBatch = db.batch();

    for (let j = 0; j < snaps.length; j++) {
      const snap = snaps[j];
      const userId = batch[j];

      if (!snap.exists) continue;
      const userData = snap.data()!;

      const prefs: NotificationPreferences = {
        ...DEFAULT_PREFS,
        ...(userData.notificationPreferences || {}),
      };

      // Check if user has this notification type enabled
      if (!prefs[notificationType]) continue;

      // Collect push token
      const token = userData.pushToken as string | undefined;
      if (token) {
        pushMessages.push({
          to: token,
          title,
          body,
          data: { ...data, type: notificationType },
        });
      }

      // Write in-app notification
      const notifRef = db.collection('notifications').doc();
      writeBatch.set(notifRef, {
        userId,
        type: notificationType,
        title,
        body,
        data: data || {},
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await writeBatch.commit();
  }

  // Send push notifications via Expo Push API
  if (pushMessages.length > 0) {
    await sendExpoPush(pushMessages);
  }
}

/**
 * Write a single in-app notification (no push).
 */
export async function writeInAppNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  await db.collection('notifications').add({
    userId,
    type,
    title,
    body,
    data: data || {},
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// Expo Push API
// ---------------------------------------------------------------------------

async function sendExpoPush(
  messages: Array<{
    to: string;
    title: string;
    body: string;
    data?: Record<string, string>;
  }>,
): Promise<void> {
  // Expo Push API accepts up to ~100 messages per request
  const CHUNK = 100;
  for (let i = 0; i < messages.length; i += CHUNK) {
    const chunk = messages.slice(i, i + CHUNK);
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });

      if (!response.ok) {
        const text = await response.text();
        logger.error('Expo Push API error', { status: response.status, body: text });
      }
    } catch (err) {
      logger.error('Failed to send Expo push notifications', err);
    }
  }
}
