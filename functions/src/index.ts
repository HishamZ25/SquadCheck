/**
 * SquadCheck Cloud Functions — Challenge Evaluation Scheduler
 *
 * Runs every 5 minutes. For each active challenge:
 *   1. Checks if the previous period's due moment has passed
 *   2. Evaluates missed check-ins
 *   3. For elimination: increments strikes, eliminates if > strikesAllowed, detects winner
 *   4. For deadline: ends the challenge if deadline has passed
 *   5. Sends group messages for eliminations, winners, and deadline endings
 *
 * All operations are idempotent — running multiple times produces no duplicates.
 */

import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions';
import {
  resolveAdminTimeZone,
  getPreviousPeriodDayKey,
  getPreviousPeriodWeekKey,
  computeDueMomentUtcForDay,
  computeWeeklyDueMomentUtc,
  wallClockToUtc,
} from './dateKeys';
import { sendPushToUsers, getUserNotificationInfo } from './notifications';

admin.initializeApp();

const db = admin.firestore();
const NOTIFIED_COLLECTION = 'missedCheckInNotified';
const EVAL_COLLECTION = 'challengeEvalLog'; // idempotency tracking
const SYSTEM_USER_ID = 'system-missed';
const SYSTEM_USER_NAME = 'SquadCheck';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface ChallengeDoc {
  id: string;
  groupId?: string;
  type?: string;
  title?: string;
  name?: string;
  state?: string; // 'active' | 'ended'
  adminTimeZone?: string;
  adminUserId?: string;
  createdBy?: string;
  winnerId?: string;
  cadence?: { unit: 'daily' | 'weekly'; weekStartsOn?: number; requiredCount?: number };
  due?: { dueTimeLocal?: string; timezoneOffset?: number; timezone?: string; deadlineDate?: string };
  rules?: {
    elimination?: { strikesAllowed: number; eliminateOn: string };
    deadline?: { targetValue?: number; comparison?: string; progressMode?: string };
  };
  settings?: { allowLateCheckIn?: boolean; lateGraceMinutes?: number };
  createdAt?: admin.firestore.Timestamp | { toDate: () => Date } | number;
  nextDueAtUtc?: number;
}

interface MemberDoc {
  id: string;
  challengeId: string;
  userId: string;
  groupId?: string;
  state: 'active' | 'eliminated';
  strikes: number;
  lastEvaluatedPeriodKey?: string;
  eliminatedAt?: admin.firestore.Timestamp;
  // Gamification
  currentStreak?: number;
  longestStreak?: number;
  streakShields?: number;
  streakShieldUsed?: boolean;
  lastCheckInPeriodKey?: string;
}

// ---------------------------------------------------------------------------
// Helper: get display names for a set of user IDs
// ---------------------------------------------------------------------------

async function getDisplayNames(userIds: string[]): Promise<Record<string, string>> {
  const names: Record<string, string> = {};
  if (userIds.length === 0) return names;

  const BATCH = 100;
  for (let i = 0; i < userIds.length; i += BATCH) {
    const batch = userIds.slice(i, i + BATCH);
    const refs = batch.map(uid => db.collection('users').doc(uid));
    const snaps = await db.getAll(...refs);
    snaps.forEach((snap, idx) => {
      names[batch[idx]] = snap.exists
        ? ((snap.data()?.displayName as string) || 'Someone')
        : 'Someone';
    });
  }
  return names;
}

// ---------------------------------------------------------------------------
// Helper: resolve previous period key for a challenge
// ---------------------------------------------------------------------------

function getPreviousPeriodKey(challenge: ChallengeDoc, now: Date): string | null {
  const cadence = challenge.cadence || { unit: 'daily', weekStartsOn: 0 };
  const dueTimeLocal = challenge.due?.dueTimeLocal ?? '23:59';
  const adminTz = resolveAdminTimeZone(challenge);
  const weekStartsOn = cadence.weekStartsOn ?? 0;

  if (cadence.unit === 'weekly') {
    return getPreviousPeriodWeekKey(adminTz, weekStartsOn, now);
  }
  return getPreviousPeriodDayKey(adminTz, dueTimeLocal, now);
}

// ---------------------------------------------------------------------------
// Helper: check if previous period's due has passed (accounting for grace)
// ---------------------------------------------------------------------------

function hasPreviousPeriodDuePassed(challenge: ChallengeDoc, previousKey: string, now: Date): boolean {
  const cadence = challenge.cadence || { unit: 'daily' };
  const dueTimeLocal = challenge.due?.dueTimeLocal ?? '23:59';
  const adminTz = resolveAdminTimeZone(challenge);

  let dueMoment: Date;
  if (cadence.unit === 'weekly') {
    dueMoment = computeWeeklyDueMomentUtc(adminTz, previousKey, dueTimeLocal);
  } else {
    dueMoment = computeDueMomentUtcForDay(adminTz, previousKey, dueTimeLocal);
  }

  // Add grace period if configured
  const graceMs = (challenge.settings?.lateGraceMinutes || 0) * 60 * 1000;
  const effectiveDue = new Date(dueMoment.getTime() + graceMs);

  return now.getTime() >= effectiveDue.getTime();
}

// ---------------------------------------------------------------------------
// Main scheduler: evaluateChallenges (every 5 minutes)
// ---------------------------------------------------------------------------

export const evaluateChallenges = onSchedule(
  { schedule: 'every 5 minutes', timeZone: 'UTC' },
  async () => {
    const now = new Date();
    logger.info('evaluateChallenges: starting', { now: now.toISOString() });

    try {
      // Query all challenges and filter client-side to include legacy docs without a state field.
      // Firestore doesn't support `null` in `in` queries, so we fetch all and filter.
      const challengesSnap = await db.collection('challenges').get();

      const challenges: ChallengeDoc[] = [];
      challengesSnap.docs.forEach(d => {
        const data = d.data();
        if (data.state === 'ended' || data.isArchived === true) return;
        challenges.push({ id: d.id, ...data } as ChallengeDoc);
      });

      logger.info(`Found ${challenges.length} active challenges to evaluate`);

      for (const challenge of challenges) {
        try {
          await evaluateChallenge(challenge, now);
        } catch (err) {
          logger.error('Error evaluating challenge', { challengeId: challenge.id, err });
        }
      }

      logger.info('evaluateChallenges: finished');
    } catch (err) {
      logger.error('evaluateChallenges failed', err);
      throw err;
    }
  }
);

// ---------------------------------------------------------------------------
// Per-challenge evaluation
// ---------------------------------------------------------------------------

async function evaluateChallenge(challenge: ChallengeDoc, now: Date): Promise<void> {
  const challengeType = String(challenge.type || 'standard').toLowerCase();

  // 1. Handle deadline challenges — check if deadline has passed
  if (challengeType === 'deadline') {
    await evaluateDeadline(challenge, now);
  }

  // 2. Evaluate missed check-ins for the previous period
  await evaluateMissedCheckIns(challenge, now);
}

// ---------------------------------------------------------------------------
// Deadline evaluation
// ---------------------------------------------------------------------------

async function evaluateDeadline(challenge: ChallengeDoc, now: Date): Promise<void> {
  const deadlineDate = challenge.due?.deadlineDate;
  if (!deadlineDate) return;

  const adminTz = resolveAdminTimeZone(challenge);
  const dueTimeLocal = challenge.due?.dueTimeLocal || '23:59';
  const deadlineMoment = wallClockToUtc(deadlineDate, dueTimeLocal, adminTz);

  if (now.getTime() < deadlineMoment.getTime()) return; // Not yet

  // Idempotency: check if already ended
  if (challenge.state === 'ended') return;

  const evalDocId = `deadline_${challenge.id}`;
  const evalRef = db.collection(EVAL_COLLECTION).doc(evalDocId);
  const evalSnap = await evalRef.get();
  if (evalSnap.exists) return; // Already processed

  // End the challenge
  const batch = db.batch();
  const challengeRef = db.collection('challenges').doc(challenge.id);
  batch.update(challengeRef, {
    state: 'ended',
    endedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Track that we processed this
  batch.set(evalRef, {
    challengeId: challenge.id,
    type: 'deadline_ended',
    processedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Send group message if it's a group challenge
  if (challenge.groupId) {
    const challengeName = challenge.title || challenge.name || 'Challenge';
    const msgRef = db.collection('messages').doc();
    batch.set(msgRef, {
      groupId: challenge.groupId,
      userId: SYSTEM_USER_ID,
      userName: SYSTEM_USER_NAME,
      text: `The deadline for "${challengeName}" has passed. The challenge has ended!`,
      type: 'text',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
  logger.info('Deadline challenge ended', { challengeId: challenge.id });

  // Push notification for deadline ending
  if (challenge.groupId) {
    const membersSnap = await db.collection('challengeMembers')
      .where('challengeId', '==', challenge.id)
      .get();
    const memberIds = membersSnap.docs.map(d => d.data().userId as string);
    const challengeName = challenge.title || challenge.name || 'Challenge';
    sendPushToUsers(
      memberIds,
      'elimination',
      challengeName,
      `The deadline for "${challengeName}" has passed. The challenge has ended!`,
      { challengeId: challenge.id, groupId: challenge.groupId },
    ).catch(err => logger.error('Push failed for deadline', err));
  }
}

// ---------------------------------------------------------------------------
// Missed check-in evaluation (with elimination + strikes + winner)
// ---------------------------------------------------------------------------

async function evaluateMissedCheckIns(challenge: ChallengeDoc, now: Date): Promise<void> {
  // Skip ended challenges
  if (challenge.state === 'ended') return;

  const cadence = challenge.cadence || { unit: 'daily', weekStartsOn: 0 };
  const dueTimeLocal = challenge.due?.dueTimeLocal ?? '23:59';
  const adminTz = resolveAdminTimeZone(challenge);

  // Get the previous period key
  const previousKey = getPreviousPeriodKey(challenge, now);
  if (!previousKey) return;

  // Check if the previous period's due moment has actually passed (with grace)
  if (!hasPreviousPeriodDuePassed(challenge, previousKey, now)) return;

  // Idempotency: check evaluation log
  const evalDocId = `eval_${challenge.id}_${previousKey}`;
  const evalRef = db.collection(EVAL_COLLECTION).doc(evalDocId);
  const evalSnap = await evalRef.get();
  if (evalSnap.exists) return; // Already evaluated this period

  const periodField = cadence.unit === 'weekly' ? 'weekKey' : 'dayKey';
  const challengeType = String(challenge.type || 'standard').toLowerCase();
  const isElimination = challengeType === 'elimination';
  const requiredCount = cadence.requiredCount || 1;

  // Get all challenge members (active ones)
  const membersSnap = await db.collection('challengeMembers')
    .where('challengeId', '==', challenge.id)
    .get();

  const allMembers: MemberDoc[] = membersSnap.docs.map(d => ({
    id: d.id,
    ...d.data(),
  } as MemberDoc));

  const activeMembers = allMembers.filter(m => m.state === 'active');
  if (activeMembers.length === 0) {
    // No active members — mark as evaluated and move on
    await evalRef.set({
      challengeId: challenge.id,
      periodKey: previousKey,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      result: 'no_active_members',
    });
    return;
  }

  // Get check-ins for this challenge and period
  const checkInsSnap = await db.collection('checkIns')
    .where('challengeId', '==', challenge.id)
    .get();

  // Build a map: userId -> count of completed check-ins for this period
  const completedCountByUser: Record<string, number> = {};
  for (const ciDoc of checkInsSnap.docs) {
    const data = ciDoc.data();
    if (data.status !== 'completed') continue;
    const period = data.period || {};
    if (period[periodField] === previousKey) {
      const uid = data.userId as string;
      completedCountByUser[uid] = (completedCountByUser[uid] || 0) + 1;
    }
  }

  // Determine who missed
  const missedMembers = activeMembers.filter(m => {
    const count = completedCountByUser[m.userId] || 0;
    return count < requiredCount;
  });

  // Get display names for messaging
  const allUserIds = activeMembers.map(m => m.userId);
  const displayNames = await getDisplayNames(allUserIds);
  const challengeName = challenge.title || challenge.name || 'Challenge';
  const groupId = challenge.groupId;

  // Process missed members
  const batch = db.batch();
  let batchOps = 0;
  const MAX_BATCH = 450; // Leave room in batch for eval doc + winner msg

  const newlyEliminated: string[] = [];

  for (const member of missedMembers) {
    if (batchOps >= MAX_BATCH) {
      await batch.commit();
      batchOps = 0;
    }

    const memberRef = db.collection('challengeMembers').doc(member.id);
    const memberShields = member.streakShields || 0;
    const displayName = displayNames[member.userId] ?? 'Someone';

    // --- Streak Shield Check ---
    // If the member has streak shields, use one instead of applying miss/strike
    if (memberShields > 0) {
      const remainingShields = memberShields - 1;
      batch.update(memberRef, {
        streakShields: remainingShields,
        streakShieldUsed: true,
        lastEvaluatedPeriodKey: previousKey,
      });
      batchOps++;

      // Send shield message
      if (groupId) {
        const msgRef = db.collection('messages').doc();
        batch.set(msgRef, {
          groupId,
          userId: SYSTEM_USER_ID,
          userName: SYSTEM_USER_NAME,
          text: `${displayName}'s streak shield absorbed a miss! (${remainingShields} shield${remainingShields !== 1 ? 's' : ''} remaining)`,
          type: 'text',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        batchOps++;
      }
      // Shield used — skip strike/elimination/reset for this member
      continue;
    }

    // --- No shield: reset streak to 0 ---
    const streakResetFields: Record<string, any> = {
      currentStreak: 0,
      streakShieldUsed: false,
      lastEvaluatedPeriodKey: previousKey,
    };

    if (isElimination) {
      const strikesAllowed = challenge.rules?.elimination?.strikesAllowed ?? 0;
      const newStrikes = member.strikes + 1;

      if (newStrikes > strikesAllowed) {
        // Eliminate
        batch.update(memberRef, {
          ...streakResetFields,
          state: 'eliminated',
          strikes: newStrikes,
          eliminatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        batchOps++;
        newlyEliminated.push(member.userId);

        // Send elimination message
        if (groupId) {
          const notifDocId = `${groupId}_${challenge.id}_${member.userId}_${previousKey}`;
          const notifRef = db.collection(NOTIFIED_COLLECTION).doc(notifDocId);
          const msgRef = db.collection('messages').doc();
          batch.set(msgRef, {
            groupId,
            userId: SYSTEM_USER_ID,
            userName: SYSTEM_USER_NAME,
            text: `${displayName} has missed the check in for challenge: ${challengeName}. They've been eliminated.`,
            type: 'elimination',
            challengeName,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });
          batch.set(notifRef, {
            groupId,
            challengeId: challenge.id,
            userId: member.userId,
            periodKey: previousKey,
            notifiedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          batchOps += 2;

          // Push notification for elimination
          const groupMemberIds = allUserIds.filter(uid => uid !== member.userId);
          sendPushToUsers(
            groupMemberIds,
            'elimination',
            challengeName,
            `${displayName} has been eliminated!`,
            { challengeId: challenge.id, groupId },
          ).catch(err => logger.error('Push failed for elimination', err));
        }
      } else {
        // Increment strikes but don't eliminate yet
        batch.update(memberRef, {
          ...streakResetFields,
          strikes: newStrikes,
        });
        batchOps++;

        // Send strike warning message
        if (groupId) {
          const notifDocId = `${groupId}_${challenge.id}_${member.userId}_${previousKey}`;
          const notifRef = db.collection(NOTIFIED_COLLECTION).doc(notifDocId);
          const notifSnap = await notifRef.get();
          if (!notifSnap.exists) {
            const remainingStrikes = strikesAllowed - newStrikes;
            const msgRef = db.collection('messages').doc();
            batch.set(msgRef, {
              groupId,
              userId: SYSTEM_USER_ID,
              userName: SYSTEM_USER_NAME,
              text: `${displayName} missed the check in for ${challengeName}. Strike ${newStrikes}/${strikesAllowed + 1}. ${remainingStrikes === 0 ? 'Next miss = elimination!' : `${remainingStrikes} strike${remainingStrikes > 1 ? 's' : ''} remaining.`}`,
              type: 'text',
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
            });
            batch.set(notifRef, {
              groupId,
              challengeId: challenge.id,
              userId: member.userId,
              periodKey: previousKey,
              notifiedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            batchOps += 2;
          }
        }
      }
    } else {
      // Non-elimination: just send missed check-in notification + reset streak
      batch.update(memberRef, streakResetFields);
      batchOps++;

      if (groupId) {
        const notifDocId = `${groupId}_${challenge.id}_${member.userId}_${previousKey}`;
        const notifRef = db.collection(NOTIFIED_COLLECTION).doc(notifDocId);
        const notifSnap = await notifRef.get();
        if (!notifSnap.exists) {
          const msgRef = db.collection('messages').doc();
          batch.set(msgRef, {
            groupId,
            userId: SYSTEM_USER_ID,
            userName: SYSTEM_USER_NAME,
            text: `${displayName} has missed the check in.`,
            type: 'text',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });
          batch.set(notifRef, {
            groupId,
            challengeId: challenge.id,
            userId: member.userId,
            periodKey: previousKey,
            notifiedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          batchOps += 2;
        }
      }
    }
  }

  // Check for winner in elimination challenges
  if (isElimination && newlyEliminated.length > 0) {
    // Count remaining active members (excluding newly eliminated)
    const remainingActive = activeMembers.filter(
      m => !newlyEliminated.includes(m.userId)
    );

    if (remainingActive.length === 1) {
      const winnerId = remainingActive[0].userId;
      const winnerName = displayNames[winnerId] ?? 'Someone';

      // Mark challenge as ended with winner
      const challengeRef = db.collection('challenges').doc(challenge.id);
      batch.update(challengeRef, {
        state: 'ended',
        winnerId,
        endedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      batchOps++;

      // Send winner message
      if (groupId) {
        const msgRef = db.collection('messages').doc();
        batch.set(msgRef, {
          groupId,
          userId: SYSTEM_USER_ID,
          userName: SYSTEM_USER_NAME,
          text: `${winnerName} was the last remaining member of ${challengeName}. They win!`,
          type: 'winner',
          challengeName,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        batchOps++;
      }

      // Push notification for winner
      sendPushToUsers(
        allUserIds,
        'elimination',
        challengeName,
        `${winnerName} wins ${challengeName}!`,
        { challengeId: challenge.id, groupId: groupId || '' },
      ).catch(err => logger.error('Push failed for winner', err));

      logger.info('Winner determined', { challengeId: challenge.id, winnerId });
    } else if (remainingActive.length === 0) {
      // Everyone eliminated — end challenge with no winner
      const challengeRef = db.collection('challenges').doc(challenge.id);
      batch.update(challengeRef, {
        state: 'ended',
        endedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      batchOps++;

      if (groupId) {
        const msgRef = db.collection('messages').doc();
        batch.set(msgRef, {
          groupId,
          userId: SYSTEM_USER_ID,
          userName: SYSTEM_USER_NAME,
          text: `All members have been eliminated from ${challengeName}. The challenge has ended.`,
          type: 'text',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        batchOps++;
      }
    }
  }

  // Mark this period as evaluated (idempotency)
  batch.set(evalRef, {
    challengeId: challenge.id,
    periodKey: previousKey,
    missedUserIds: missedMembers.map(m => m.userId),
    eliminatedUserIds: newlyEliminated,
    processedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();

  if (missedMembers.length > 0) {
    logger.info('Evaluated missed check-ins', {
      challengeId: challenge.id,
      periodKey: previousKey,
      missed: missedMembers.length,
      eliminated: newlyEliminated.length,
    });
  }
}

// ---------------------------------------------------------------------------
// Keep the old function name as an alias for backward compat during deploy
// ---------------------------------------------------------------------------

export const processMissedCheckIns = evaluateChallenges;

// ===========================================================================
// Firestore Triggers — Push Notifications
// ===========================================================================

// ---------------------------------------------------------------------------
// 7a: chat_all — new chat message → push to group members (exclude sender)
// ---------------------------------------------------------------------------

export const onNewMessage = onDocumentCreated('messages/{messageId}', async (event) => {
  const data = event.data?.data();
  if (!data) return;

  // Skip system messages
  if (data.type === 'system' || data.userId === SYSTEM_USER_ID) return;

  const groupId = data.groupId as string | undefined;
  if (!groupId) return;

  const senderId = data.userId as string;
  const messageText = (data.text as string || '').slice(0, 100);

  try {
    const groupSnap = await db.collection('groups').doc(groupId).get();
    if (!groupSnap.exists) return;
    const groupData = groupSnap.data()!;
    const memberIds: string[] = (groupData.memberIds || []).filter(
      (id: string) => id !== senderId,
    );
    if (memberIds.length === 0) return;

    const senderInfo = await getUserNotificationInfo(senderId);
    const groupName = (groupData.name as string) || 'Group';

    await sendPushToUsers(
      memberIds,
      'chat_all',
      groupName,
      `${senderInfo.displayName}: ${messageText}`,
      { groupId },
    );
  } catch (err) {
    logger.error('onNewMessage push failed', err);
  }
});

// ---------------------------------------------------------------------------
// 7b: group_checkins — new check-in → push to group members (exclude submitter)
// ---------------------------------------------------------------------------

export const onNewCheckIn = onDocumentCreated('checkIns/{checkInId}', async (event) => {
  const data = event.data?.data();
  if (!data) return;

  const challengeId = data.challengeId as string;
  const userId = data.userId as string;
  if (!challengeId || !userId) return;

  try {
    const challengeSnap = await db.collection('challenges').doc(challengeId).get();
    if (!challengeSnap.exists) return;
    const challenge = challengeSnap.data()!;
    const groupId = challenge.groupId as string | undefined;
    if (!groupId) return; // Solo challenge, no one to notify

    const groupSnap = await db.collection('groups').doc(groupId).get();
    if (!groupSnap.exists) return;
    const memberIds: string[] = (groupSnap.data()!.memberIds || []).filter(
      (id: string) => id !== userId,
    );
    if (memberIds.length === 0) return;

    const userInfo = await getUserNotificationInfo(userId);
    const challengeName = (challenge.title as string) || (challenge.name as string) || 'Challenge';

    await sendPushToUsers(
      memberIds,
      'group_checkins',
      challengeName,
      `${userInfo.displayName} checked in!`,
      { challengeId, groupId },
    );
  } catch (err) {
    logger.error('onNewCheckIn push failed', err);
  }
});

// ---------------------------------------------------------------------------
// 7d: invites — group invitation → push to invitee
// ---------------------------------------------------------------------------

export const onGroupInvite = onDocumentCreated('groupInvitations/{invitationId}', async (event) => {
  const data = event.data?.data();
  if (!data) return;

  const inviteeId = data.inviteeId as string;
  const inviterId = data.inviterId as string;
  const groupId = data.groupId as string;
  if (!inviteeId || !inviterId) return;

  try {
    const inviterInfo = await getUserNotificationInfo(inviterId);

    let groupName = 'a group';
    if (groupId) {
      const groupSnap = await db.collection('groups').doc(groupId).get();
      if (groupSnap.exists) {
        groupName = (groupSnap.data()!.name as string) || 'a group';
      }
    }

    await sendPushToUsers(
      [inviteeId],
      'invites',
      'Group Invite',
      `${inviterInfo.displayName} invited you to ${groupName}`,
      { groupId: groupId || '' },
    );
  } catch (err) {
    logger.error('onGroupInvite push failed', err);
  }
});

// ---------------------------------------------------------------------------
// 7d: invites — friend request → push to recipient
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Nudge — push notification when someone nudges another user
// ---------------------------------------------------------------------------

export const onNudge = onDocumentCreated('nudges/{nudgeId}', async (event) => {
  const data = event.data?.data();
  if (!data) return;

  const targetUserId = data.targetUserId as string;
  const senderUserId = data.senderUserId as string;
  if (!targetUserId || !senderUserId) return;

  try {
    const senderInfo = await getUserNotificationInfo(senderUserId);
    await sendPushToUsers(
      [targetUserId],
      'invites',
      'Nudge!',
      `${senderInfo.displayName} nudged you! Time to check in!`,
      { type: 'nudge' },
    );
  } catch (err) {
    logger.error('onNudge push failed', err);
  }
});

// ---------------------------------------------------------------------------
// 7d: invites — friend request → push to recipient
// ---------------------------------------------------------------------------

export const onFriendRequest = onDocumentCreated('friendships/{friendshipId}', async (event) => {
  const data = event.data?.data();
  if (!data) return;

  // Only notify on new pending requests
  if (data.status !== 'pending') return;

  const requestedBy = data.requestedBy as string;
  // The other user is the recipient
  const recipientId = data.userId1 === requestedBy
    ? (data.userId2 as string)
    : (data.userId1 as string);

  if (!recipientId || !requestedBy) return;

  try {
    const requesterInfo = await getUserNotificationInfo(requestedBy);

    await sendPushToUsers(
      [recipientId],
      'invites',
      'Friend Request',
      `${requesterInfo.displayName} wants to be friends!`,
      {},
    );
  } catch (err) {
    logger.error('onFriendRequest push failed', err);
  }
});
