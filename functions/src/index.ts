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
import { logger } from 'firebase-functions';
import {
  resolveAdminTimeZone,
  getPreviousPeriodDayKey,
  getPreviousPeriodWeekKey,
  computeDueMomentUtcForDay,
  computeWeeklyDueMomentUtc,
  hasPeriodDuePassed,
  wallClockToUtc,
  getAdminZoneWeekKey,
  getCurrentPeriodDayKey,
  getDayKey,
  parseKey,
  // Legacy helpers for backward compat
  getPreviousDayKey,
  getPreviousWeekKey,
} from './dateKeys';

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
  const cadence = challenge.cadence || { unit: 'daily', weekStartsOn: 1 };
  const dueTimeLocal = challenge.due?.dueTimeLocal ?? '23:59';
  const adminTz = resolveAdminTimeZone(challenge);
  const weekStartsOn = cadence.weekStartsOn ?? 1;

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
      // Query all active, non-archived challenges
      // We query by state != 'ended' to include challenges without a state field (legacy)
      const challengesSnap = await db.collection('challenges')
        .where('state', 'in', ['active', null])
        .get()
        .catch(async () => {
          // Fallback: if the composite index doesn't exist, get all and filter
          return db.collection('challenges').get();
        });

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
}

// ---------------------------------------------------------------------------
// Missed check-in evaluation (with elimination + strikes + winner)
// ---------------------------------------------------------------------------

async function evaluateMissedCheckIns(challenge: ChallengeDoc, now: Date): Promise<void> {
  // Skip ended challenges
  if (challenge.state === 'ended') return;

  const cadence = challenge.cadence || { unit: 'daily', weekStartsOn: 1 };
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

    if (isElimination) {
      const strikesAllowed = challenge.rules?.elimination?.strikesAllowed ?? 0;
      const newStrikes = member.strikes + 1;

      if (newStrikes > strikesAllowed) {
        // Eliminate
        const memberRef = db.collection('challengeMembers').doc(member.id);
        batch.update(memberRef, {
          state: 'eliminated',
          strikes: newStrikes,
          eliminatedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastEvaluatedPeriodKey: previousKey,
        });
        batchOps++;
        newlyEliminated.push(member.userId);

        // Send elimination message
        if (groupId) {
          const notifDocId = `${groupId}_${challenge.id}_${member.userId}_${previousKey}`;
          const notifRef = db.collection(NOTIFIED_COLLECTION).doc(notifDocId);
          const displayName = displayNames[member.userId] ?? 'Someone';
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
        }
      } else {
        // Increment strikes but don't eliminate yet
        const memberRef = db.collection('challengeMembers').doc(member.id);
        batch.update(memberRef, {
          strikes: newStrikes,
          lastEvaluatedPeriodKey: previousKey,
        });
        batchOps++;

        // Send strike warning message
        if (groupId) {
          const notifDocId = `${groupId}_${challenge.id}_${member.userId}_${previousKey}`;
          const notifRef = db.collection(NOTIFIED_COLLECTION).doc(notifDocId);
          const notifSnap = await notifRef.get();
          if (!notifSnap.exists) {
            const displayName = displayNames[member.userId] ?? 'Someone';
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
      // Non-elimination: just send missed check-in notification
      if (groupId) {
        const notifDocId = `${groupId}_${challenge.id}_${member.userId}_${previousKey}`;
        const notifRef = db.collection(NOTIFIED_COLLECTION).doc(notifDocId);
        const notifSnap = await notifRef.get();
        if (!notifSnap.exists) {
          const displayName = displayNames[member.userId] ?? 'Someone';
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

      // Update lastEvaluatedPeriodKey
      const memberRef = db.collection('challengeMembers').doc(member.id);
      batch.update(memberRef, {
        lastEvaluatedPeriodKey: previousKey,
      });
      batchOps++;
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
