import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { MessageService } from './messageService';
import { CheckInService } from './checkInService';
import { dateKeys } from '../utils/dateKeys';
import {
  resolveAdminTimeZone,
  getCurrentPeriodDayKey as getIanaPeriodDayKey,
  getCurrentPeriodWeekKey as getIanaPeriodWeekKey,
} from '../utils/dueTime';
import { Challenge, User } from '../types';

const NOTIFIED_COLLECTION = 'missedCheckInNotified';
const PROGRESSION_INTERVAL_COLLECTION = 'progressionIntervalNotified';
const SYSTEM_USER_ID = 'system-missed';
const SYSTEM_USER_NAME = 'SquadCheck';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Elimination: mark member as eliminated, increment strikes. */
async function setMemberEliminated(
  challengeId: string,
  userId: string,
  groupId: string
): Promise<void> {
  const memberId = `${challengeId}_${userId}`;
  const memberRef = doc(db, 'challengeMembers', memberId);
  const snap = await getDoc(memberRef);
  const now = new Date();
  if (snap.exists()) {
    const data = snap.data() as { strikes?: number };
    await updateDoc(memberRef, {
      state: 'eliminated',
      strikes: (data.strikes ?? 0) + 1,
      eliminatedAt: now,
    });
  } else {
    await setDoc(memberRef, {
      challengeId,
      userId,
      groupId,
      state: 'eliminated',
      strikes: 1,
      eliminatedAt: now,
      joinedAt: now,
    });
  }
}

function getPreviousPeriodKey(challenge: Challenge): string | null {
  const cadence = challenge.cadence || { unit: 'daily', weekStartsOn: 0 };
  const due = challenge.due || {};
  const dueTimeLocal = due.dueTimeLocal ?? '23:59';
  const weekStartsOn = cadence.weekStartsOn ?? 0;
  const adminTz = resolveAdminTimeZone(challenge);

  if (cadence.unit === 'daily') {
    const currentDayKey = getIanaPeriodDayKey(adminTz, dueTimeLocal);
    const currentDate = dateKeys.parseKey(currentDayKey);
    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);
    return dateKeys.getDayKey(prevDate);
  }

  if (cadence.unit === 'weekly') {
    const currentWeekKey = getIanaPeriodWeekKey(adminTz, weekStartsOn);
    const weekStart = dateKeys.parseKey(currentWeekKey);
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    return dateKeys.getWeekKey(prevWeekStart, weekStartsOn);
  }

  return null;
}

function periodKeyField(challenge: Challenge): 'dayKey' | 'weekKey' {
  const unit = challenge.cadence?.unit ?? 'daily';
  return unit === 'weekly' ? 'weekKey' : 'dayKey';
}

export async function processMissedCheckIns(
  groupId: string,
  challenges: Challenge[],
  members: User[]
): Promise<void> {
  if (!groupId || !Array.isArray(challenges) || challenges.length === 0) return;
  if (!Array.isArray(members)) return;

  const memberNames: Record<string, string> = {};
  members.forEach((m) => {
    memberNames[m.id] = m.displayName || 'Someone';
  });

  const challengeIds = challenges.map((c) => c.id);
  const allCheckIns = await CheckInService.getChallengeCheckIns(challengeIds);

  for (const challenge of challenges) {
    try {
      const previousKey = getPreviousPeriodKey(challenge);
      if (!previousKey) continue;

      const field = periodKeyField(challenge);

      // For group challenges use all group members; otherwise use challengeMembers (solo/legacy)
      const isGroupChallenge = !!(challenge as any).groupId && (challenge as any).groupId === groupId;
      let activeMemberIds: string[];
      if (isGroupChallenge) {
        activeMemberIds = members.map((m) => m.id);
      } else {
        const membersQuery = query(
          collection(db, 'challengeMembers'),
          where('challengeId', '==', challenge.id),
          where('state', '==', 'active')
        );
        const membersSnap = await getDocs(membersQuery);
        activeMemberIds = membersSnap.docs.map((d) => (d.data() as { userId: string }).userId);
      }

      const completedForPeriod = new Set<string>(
        allCheckIns
          .filter(
            (ci) =>
              ci.challengeId === challenge.id &&
              ci.status === 'completed' &&
              (ci.period as any)?.[field] === previousKey
          )
          .map((ci) => ci.userId)
      );

      const missedUserIds = activeMemberIds.filter((id) => !completedForPeriod.has(id));
      if (missedUserIds.length === 0) continue;

      const isElimination = String((challenge as any).type || '').toLowerCase() === 'elimination';
      const strikesAllowed = (challenge as any).rules?.elimination?.strikesAllowed ?? 0;
      const challengeName = (challenge as any).title || (challenge as any).name || 'Challenge';

      if (isElimination) {
        // For each missed user: increment strikes, eliminate if > strikesAllowed
        for (const userId of missedUserIds) {
          const memberId = `${challenge.id}_${userId}`;
          const memberRef = doc(db, 'challengeMembers', memberId);
          const memberSnap = await getDoc(memberRef);
          const memberData = memberSnap.data() as { strikes?: number; state?: string } | undefined;
          const currentStrikes = memberData?.strikes ?? 0;
          const newStrikes = currentStrikes + 1;

          if (newStrikes > strikesAllowed) {
            await setMemberEliminated(challenge.id, userId, groupId);
          } else {
            // Increment strikes without eliminating
            if (memberSnap.exists()) {
              await updateDoc(memberRef, { strikes: newStrikes, lastEvaluatedPeriodKey: previousKey });
            }
          }
        }

        // Check if only one active member remains → winner
        const activeQuery = query(
          collection(db, 'challengeMembers'),
          where('challengeId', '==', challenge.id),
          where('state', '==', 'active')
        );
        const activeSnap = await getDocs(activeQuery);
        const activeIds = activeSnap.docs.map((d) => (d.data() as { userId: string }).userId);
        if (activeIds.length === 1) {
          const winnerName = memberNames[activeIds[0]] ?? 'Someone';
          await MessageService.sendWinnerMessage(groupId, winnerName, challengeName);
          // Mark challenge as ended with winner
          const challengeRef = doc(db, 'challenges', challenge.id);
          await updateDoc(challengeRef, {
            state: 'ended',
            winnerId: activeIds[0],
            endedAt: new Date(),
          });
        } else if (activeIds.length === 0) {
          // Everyone eliminated
          const challengeRef = doc(db, 'challenges', challenge.id);
          await updateDoc(challengeRef, {
            state: 'ended',
            endedAt: new Date(),
          });
        }
      }

      const notifChecks = await Promise.all(
        missedUserIds.map((userId) => {
          const docId = `${groupId}_${challenge.id}_${userId}_${previousKey}`;
          return getDoc(doc(db, NOTIFIED_COLLECTION, docId)).then((snap) => ({
            userId,
            docId,
            alreadyNotified: snap.exists(),
          }));
        })
      );

      const toNotify = notifChecks.filter((c) => !c.alreadyNotified);
      await Promise.all(
        toNotify.map(async (c) => {
          const displayName = memberNames[c.userId] ?? 'Someone';
          const notifRef = doc(db, NOTIFIED_COLLECTION, c.docId);
          if (isElimination) {
            // Check if user was actually eliminated or just got a strike
            const memberId = `${challenge.id}_${c.userId}`;
            const memberSnap = await getDoc(doc(db, 'challengeMembers', memberId));
            const memberData = memberSnap.data() as { state?: string; strikes?: number } | undefined;
            if (memberData?.state === 'eliminated') {
              await MessageService.sendEliminationMessage(groupId, displayName, challengeName);
            } else {
              const strikes = memberData?.strikes ?? 0;
              const remaining = strikesAllowed - strikes;
              await MessageService.sendTextMessage(
                groupId,
                SYSTEM_USER_ID,
                SYSTEM_USER_NAME,
                `${displayName} missed the check in for ${challengeName}. Strike ${strikes}/${strikesAllowed + 1}. ${remaining === 0 ? 'Next miss = elimination!' : `${remaining} strike${remaining > 1 ? 's' : ''} remaining.`}`
              );
            }
          } else {
            await MessageService.sendTextMessage(
              groupId,
              SYSTEM_USER_ID,
              SYSTEM_USER_NAME,
              `${displayName} has missed the check in.`
            );
          }
          await setDoc(notifRef, {
            groupId,
            challengeId: challenge.id,
            userId: c.userId,
            periodKey: previousKey,
            notifiedAt: new Date(),
          });
        })
      );
    } catch (err) {
      if (__DEV__) console.error(
        '[missedCheckInService] Error processing challenge',
        challenge.id,
        err
      );
    }
  }
}

/**
 * Progression: when an interval completes (e.g. every N days), post "(Interval type) has increased."
 * Runs for challenges with type === 'progress' and progressionDuration / progressionIntervalType.
 */
export async function processProgressionIntervals(
  groupId: string,
  challenges: Challenge[]
): Promise<void> {
  if (!groupId || !Array.isArray(challenges) || challenges.length === 0) return;
  const now = Date.now();
  for (const challenge of challenges) {
    try {
      const type = (challenge as any).type;
      const progressionDuration = (challenge as any).progressionDuration as number | undefined;
      const intervalType = (challenge as any).progressionIntervalType as string | undefined;
      if (type !== 'progress' || !progressionDuration || !intervalType?.trim()) continue;

      const createdAt = challenge.createdAt;
      const createdMs =
        typeof createdAt === 'number'
          ? createdAt
          : createdAt && typeof (createdAt as Date).getTime === 'function'
            ? (createdAt as Date).getTime()
            : NaN;
      if (!Number.isFinite(createdMs)) continue;
      const daysSinceStart = (now - createdMs) / MS_PER_DAY;
      const currentIntervalIndex = Math.floor(daysSinceStart / progressionDuration);
      if (currentIntervalIndex < 1) continue;

      const docId = `${groupId}_${challenge.id}_${currentIntervalIndex}`;
      const notifRef = doc(db, PROGRESSION_INTERVAL_COLLECTION, docId);
      const snap = await getDoc(notifRef);
      if (snap.exists()) continue;

      const label = intervalType.trim();
      const capitalized = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
      const text = `${capitalized} has increased.`;

      await MessageService.sendTextMessage(
        groupId,
        SYSTEM_USER_ID,
        SYSTEM_USER_NAME,
        text
      );
      await setDoc(notifRef, {
        groupId,
        challengeId: challenge.id,
        intervalIndex: currentIntervalIndex,
        notifiedAt: new Date(),
      });
    } catch (err) {
      if (__DEV__) console.error(
        '[missedCheckInService] Error processing progression',
        challenge.id,
        err
      );
    }
  }
}
