import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  increment,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { CheckIn } from '../types';
import {
  resolveAdminTimeZone,
  getAdminZoneDayKey,
  getCurrentPeriodDayKey,
  getCurrentPeriodWeekKey,
  computeDueMomentUtcForDay,
  canUserCheckIn,
} from '../utils/dueTime';
import { GamificationService, XPResult, StreakResult } from './gamificationService';
import { AchievementService } from './achievementService';

export interface CheckInResult {
  checkInId: string;
  xpResult: XPResult;
  streakResult: StreakResult;
  dailyBonusAwarded: boolean;
  dailyBonusXP: number;
}

export class CheckInService {
  // Get check-ins for specific challenges
  static async getChallengeCheckIns(challengeIds: string[]): Promise<CheckIn[]> {
    try {
      if (!challengeIds || challengeIds.length === 0) {
        return [];
      }
      
      // Firestore 'in' queries are limited to 10 items, so we need to batch
      const batchSize = 10;
      const batches: Promise<CheckIn[]>[] = [];
      
      for (let i = 0; i < challengeIds.length; i += batchSize) {
        const batch = challengeIds.slice(i, i + batchSize);
        const checkInsQuery = query(
          collection(db, 'checkIns'),
          where('challengeId', 'in', batch)
        );
        
        const batchPromise = getDocs(checkInsQuery).then(querySnapshot => {
          return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              ...data,
              id: doc.id,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            } as CheckIn;
          });
        });
        
        batches.push(batchPromise);
      }
      
      const results = await Promise.all(batches);
      const checkIns = results.flat();
      
      // Sort by createdAt descending
      checkIns.sort((a, b) => {
        const aTime = a.createdAt?.getTime ? a.createdAt.getTime() : 0;
        const bTime = b.createdAt?.getTime ? b.createdAt.getTime() : 0;
        return bTime - aTime;
      });
      
      return checkIns;
    } catch (error) {
      if (__DEV__) console.error('Error getting challenge check-ins:', error);
      return [];
    }
  }

  // Submit challenge check-in
  static async submitChallengeCheckIn(
    challengeId: string,
    userId: string,
    groupId: string | null,
    cadenceUnit: 'daily' | 'weekly',
    payload: {
      booleanValue?: boolean;
      numberValue?: number;
      textValue?: string;
      timerSeconds?: number;
    },
    attachments?: Array<{ type: 'photo' | 'screenshot'; uri: string }>,
    challengeDueTime?: string,
    challengeTimezoneOffset?: number
  ): Promise<CheckInResult> {
    try {
      // Fetch challenge + member data in parallel for validation
      const memberId = `${challengeId}_${userId}`;
      const [challengeSnap, memberSnap] = await Promise.all([
        getDoc(doc(db, 'challenges', challengeId)),
        getDoc(doc(db, 'challengeMembers', memberId)),
      ]);

      if (!challengeSnap.exists()) {
        throw new Error('Challenge not found.');
      }
      const challengeData = challengeSnap.data() as Record<string, any>;

      // Normalize deadlineDate from Firestore Timestamp to string if needed
      if (challengeData.due?.deadlineDate && typeof challengeData.due.deadlineDate !== 'string') {
        const dd = challengeData.due.deadlineDate;
        if (dd.toDate) {
          const d = dd.toDate() as Date;
          challengeData.due.deadlineDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        } else if (dd instanceof Date) {
          challengeData.due.deadlineDate = `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, '0')}-${String(dd.getDate()).padStart(2, '0')}`;
        }
      }

      // Check if challenge has ended
      if (challengeData.state === 'ended') {
        throw new Error('This challenge has ended. Check-ins are no longer accepted.');
      }

      // Check elimination status
      const memberData = memberSnap.data() as { state?: string } | undefined;
      if (challengeData.type === 'elimination' && memberData?.state === 'eliminated') {
        throw new Error('You have been eliminated from this challenge and can no longer submit.');
      }

      // Check deadline
      if (challengeData.type === 'deadline' && challengeData.due?.deadlineDate) {
        const checkResult = canUserCheckIn(
          challengeData as any,
          (memberData?.state as any) || 'active'
        );
        if (!checkResult.allowed) {
          throw new Error(checkResult.reason || 'Cannot check in.');
        }
      }

      // Compute period keys using IANA timezone
      const adminTz = resolveAdminTimeZone(challengeData as any);
      const dueTimeLocal = challengeData.due?.dueTimeLocal || challengeDueTime || '23:59';
      const weekStartsOn = challengeData.cadence?.weekStartsOn ?? 0;
      const now = new Date();

      const period: any = { unit: cadenceUnit };
      let periodKey: string;

      if (cadenceUnit === 'daily') {
        if (challengeData.type === 'deadline') {
          periodKey = getAdminZoneDayKey(adminTz, now);
        } else {
          periodKey = getCurrentPeriodDayKey(adminTz, dueTimeLocal, now);
        }
        period.dayKey = periodKey;
      } else {
        periodKey = getCurrentPeriodWeekKey(adminTz, weekStartsOn, now);
        period.weekKey = periodKey;
      }

      // Duplicate check-in prevention
      const periodField = cadenceUnit === 'daily' ? 'period.dayKey' : 'period.weekKey';
      const existingCheckIns = await getDocs(query(
        collection(db, 'checkIns'),
        where('challengeId', '==', challengeId),
        where('userId', '==', userId),
        where(periodField, '==', periodKey)
      ));
      const completedCount = existingCheckIns.docs.filter(d => d.data().status === 'completed').length;
      const requiredCount = cadenceUnit === 'daily' ? 1 : (challengeData.cadence?.requiredCount || 1);
      if (completedCount >= requiredCount) {
        throw new Error('You have already completed all check-ins for this period.');
      }

      const checkInData: any = {
        challengeId,
        userId,
        groupId,
        period,
        payload,
        attachments: attachments || [],
        status: 'completed',
        createdAt: Date.now(),
      };

      // Compute on-time synchronously (pure math, no I/O)
      let isOnTime = false;
      if (cadenceUnit === 'daily') {
        const dueMomentUtc = computeDueMomentUtcForDay(adminTz, periodKey, dueTimeLocal);
        const msRemaining = dueMomentUtc.getTime() - now.getTime();
        isOnTime = msRemaining > 60 * 60 * 1000; // >1hr remaining
      }

      // Write check-in doc and update streak in parallel (they don't depend on each other)
      let streakResult: StreakResult;
      let xpResult: XPResult;
      let docRef: any;

      try {
        const [writeResult, streak] = await Promise.all([
          addDoc(collection(db, 'checkIns'), checkInData),
          GamificationService.updateStreak(challengeId, userId, periodKey, cadenceUnit).catch((e) => {
            if (__DEV__) console.error('Streak error (non-blocking):', e);
            return { currentStreak: 0, longestStreak: 0, isNewMilestone: false, milestoneValue: 0, shieldEarned: false } as StreakResult;
          }),
        ]);
        docRef = writeResult;
        streakResult = streak;

        // Award XP (depends on streak count)
        xpResult = await GamificationService.awardCheckInXP(userId, challengeId, isOnTime, streakResult.currentStreak, streakResult.longestStreak);
      } catch (e) {
        if (__DEV__) console.error('Gamification error (non-blocking):', e);
        if (!docRef) {
          // addDoc itself failed — re-throw
          throw e;
        }
        streakResult = { currentStreak: 0, longestStreak: 0, isNewMilestone: false, milestoneValue: 0, shieldEarned: false };
        xpResult = { xpEarned: 0, newLevel: 1, newTitle: 'Rookie', leveledUp: false };
      }

      // Daily complete bonus: fire in background — don't block the check-in response
      let dailyBonusAwarded = false;
      let dailyBonusXP = 0;
      if (cadenceUnit === 'daily' && xpResult.xpEarned > 0) {
        // Fire-and-forget: resolves after the check-in is returned to UI
        GamificationService.checkAndAwardDailyCompleteBonus(userId, xpResult.xpEarned).then(bonus => {
          dailyBonusAwarded = bonus.awarded;
          dailyBonusXP = bonus.bonusXP;
        }).catch(e => {
          if (__DEV__) console.error('Daily bonus error (non-blocking):', e);
        });
      }

      // Increment on-time / late-night counters on user doc (fire-and-forget)
      const counterUpdates: Record<string, any> = {};
      if (isOnTime) {
        counterUpdates.onTimeCheckIns = increment(1);
      }
      if (now.getHours() >= 22) {
        counterUpdates.lateNightCheckIns = increment(1);
      }
      if (Object.keys(counterUpdates).length > 0) {
        updateDoc(doc(db, 'users', userId), counterUpdates).catch((e) => {
          if (__DEV__) console.error('Counter increment error (non-blocking):', e);
        });
      }

      // Achievement check (fire-and-forget)
      AchievementService.checkAndAwardAchievements(userId).catch((e) => {
        if (__DEV__) console.error('Achievement check error (non-blocking):', e);
      });

      return { checkInId: docRef.id, xpResult, streakResult, dailyBonusAwarded, dailyBonusXP };
    } catch (error) {
      if (__DEV__) console.error('Error submitting challenge check-in:', error);
      if (error instanceof Error) throw error;
      throw new Error('Failed to submit check-in');
    }
  }
} 