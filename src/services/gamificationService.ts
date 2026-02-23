import {
  doc,
  getDoc,
  updateDoc,
  increment,
  arrayUnion,
  collection,
  query,
  where,
  getDocs,
  DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import { LEVEL_THRESHOLDS, XP_VALUES, STREAK_MILESTONES, SHIELD_EARN_INTERVAL } from '../constants/gamification';
import { getAdminZoneDayKey, getCurrentPeriodDayKey, getCurrentPeriodWeekKey, resolveAdminTimeZone } from '../utils/dueTime';

export interface XPResult {
  xpEarned: number;
  newLevel: number;
  newTitle: string;
  leveledUp: boolean;
}

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  isNewMilestone: boolean;
  milestoneValue: number;
  shieldEarned: boolean;
}

export class GamificationService {
  /**
   * Pure helper: compute level and title from XP
   */
  static getLevelFromXP(xp: number): { level: number; title: string } {
    let result = LEVEL_THRESHOLDS[0];
    for (const threshold of LEVEL_THRESHOLDS) {
      if (xp >= threshold.xp) {
        result = threshold;
      } else {
        break;
      }
    }
    return { level: result.level, title: result.title };
  }

  /**
   * Returns XP needed for the next level
   */
  static getNextLevelXP(currentLevel: number): number {
    for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
      if (LEVEL_THRESHOLDS[i].level > currentLevel) {
        return LEVEL_THRESHOLDS[i].xp;
      }
    }
    return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1].xp;
  }

  /**
   * Update user XP and recalculate level/title in Firestore
   */
  static async updateUserXP(userId: string, xpAmount: number, longestStreak?: number): Promise<XPResult> {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data() || {};

    const currentXp = userData.xp || 0;
    const currentLevel = userData.level || 1;
    const oldTitle = userData.levelTitle || 'Rookie';
    const newXp = currentXp + xpAmount;
    const { level: newLevel, title: newTitle } = this.getLevelFromXP(newXp);
    const leveledUp = newLevel > currentLevel;

    const updates: Record<string, any> = {
      xp: newXp,
      level: newLevel,
      levelTitle: newTitle,
      totalCheckIns: increment(1),
    };
    // Update user's global longest streak if new streak is bigger
    if (longestStreak != null && longestStreak > (userData.longestStreak || 0)) {
      updates.longestStreak = longestStreak;
    }
    // Unlock the new title tier as a selectable profile title
    if (newTitle !== oldTitle && newTitle !== 'Rookie') {
      updates.unlockedTitles = arrayUnion({
        id: `level_${newTitle.toLowerCase()}`,
        text: newTitle,
        color: '#FF6B35',
      });
    }

    await updateDoc(userRef, updates);

    return { xpEarned: xpAmount, newLevel, newTitle, leveledUp };
  }

  /**
   * Award XP for a check-in, including bonuses
   */
  static async awardCheckInXP(
    userId: string,
    challengeId: string,
    isOnTime: boolean,
    currentStreak: number,
    longestStreak?: number,
  ): Promise<XPResult> {
    let xp = XP_VALUES.CHECK_IN;
    if (isOnTime) xp += XP_VALUES.ON_TIME_BONUS;
    xp += XP_VALUES.STREAK_BONUS_PER_DAY * currentStreak;

    return this.updateUserXP(userId, xp, longestStreak);
  }

  /**
   * Update streak for a member after a check-in
   */
  static async updateStreak(
    challengeId: string,
    userId: string,
    periodKey: string,
    cadenceUnit: 'daily' | 'weekly',
  ): Promise<StreakResult> {
    const memberId = `${challengeId}_${userId}`;
    const memberRef = doc(db, 'challengeMembers', memberId);
    const memberSnap = await getDoc(memberRef);

    if (!memberSnap.exists()) {
      // Member doc doesn't exist — return defaults without writing
      return {
        currentStreak: 1,
        longestStreak: 1,
        isNewMilestone: false,
        milestoneValue: 0,
        shieldEarned: false,
      };
    }

    const memberData = memberSnap.data() || {};

    const lastKey = memberData.lastCheckInPeriodKey || '';
    let currentStreak = memberData.currentStreak || 0;
    let longestStreak = memberData.longestStreak || 0;
    let streakShields = memberData.streakShields || 0;

    // Check if this is a consecutive period
    const isConsecutive = this.isConsecutivePeriod(lastKey, periodKey, cadenceUnit);

    if (isConsecutive) {
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }

    // Update longest streak
    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }

    // Check if shield earned
    const shieldEarned = currentStreak > 0 && currentStreak % SHIELD_EARN_INTERVAL === 0;
    if (shieldEarned) {
      streakShields += 1;
    }

    // Check milestone
    const isNewMilestone = STREAK_MILESTONES.includes(currentStreak);

    await updateDoc(memberRef, {
      currentStreak,
      longestStreak,
      streakShields,
      streakShieldUsed: false,
      lastCheckInPeriodKey: periodKey,
    });

    return {
      currentStreak,
      longestStreak,
      isNewMilestone,
      milestoneValue: isNewMilestone ? currentStreak : 0,
      shieldEarned,
    };
  }

  /**
   * Use a streak shield to absorb a miss (called by Cloud Function or client)
   */
  static async useStreakShield(challengeId: string, userId: string): Promise<boolean> {
    const memberId = `${challengeId}_${userId}`;
    const memberRef = doc(db, 'challengeMembers', memberId);
    const memberSnap = await getDoc(memberRef);
    const memberData = memberSnap.data();

    if (!memberData || (memberData.streakShields || 0) <= 0) return false;

    await updateDoc(memberRef, {
      streakShields: (memberData.streakShields || 0) - 1,
      streakShieldUsed: true,
    });

    return true;
  }

  /**
   * Update user XP without incrementing totalCheckIns.
   * Used for bonus XP (daily complete, upvote received).
   */
  static async updateUserXPOnly(userId: string, xpAmount: number): Promise<XPResult> {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data() || {};

    const currentXp = userData.xp || 0;
    const currentLevel = userData.level || 1;
    const newXp = currentXp + xpAmount;
    const { level: newLevel, title: newTitle } = this.getLevelFromXP(newXp);
    const leveledUp = newLevel > currentLevel;

    await updateDoc(userRef, {
      xp: newXp,
      level: newLevel,
      levelTitle: newTitle,
    });

    return { xpEarned: xpAmount, newLevel, newTitle, leveledUp };
  }

  /**
   * Check if user completed ALL active daily challenges for today.
   * If so, award bonus XP = baseXp * (MULTIPLIER - 1) so total is effectively 2x.
   * Returns { awarded: boolean, bonusXP: number }.
   */
  static async checkAndAwardDailyCompleteBonus(
    userId: string,
    baseXpJustAwarded: number,
  ): Promise<{ awarded: boolean; bonusXP: number }> {
    try {
      // Find all active daily challenges the user is a member of
      const membersQuery = query(
        collection(db, 'challengeMembers'),
        where('userId', '==', userId),
        where('state', '==', 'active'),
      );
      const membersSnap = await getDocs(membersQuery);
      const challengeIds = membersSnap.docs
        .map(d => d.data().challengeId)
        .filter(Boolean) as string[];

      if (challengeIds.length === 0) return { awarded: false, bonusXP: 0 };

      // Batch-fetch all challenge docs (max 10 per 'in' query)
      const challengeMap = new Map<string, DocumentData>();
      for (let i = 0; i < challengeIds.length; i += 10) {
        const batch = challengeIds.slice(i, i + 10);
        const snap = await getDocs(query(
          collection(db, 'challenges'),
          where('__name__', 'in', batch),
        ));
        snap.docs.forEach(d => challengeMap.set(d.id, d.data()));
      }

      // Filter to active daily challenges only
      const dailyChallengeIds: string[] = [];
      for (const [id, data] of challengeMap) {
        if (data.state === 'ended') continue;
        if (data.cadence?.unit === 'daily') {
          dailyChallengeIds.push(id);
        }
      }

      if (dailyChallengeIds.length === 0) return { awarded: false, bonusXP: 0 };

      // Check all daily challenges for today's check-in in parallel
      const now = new Date();
      const checkResults = await Promise.all(
        dailyChallengeIds.map(chalId => {
          const chalData = challengeMap.get(chalId)!;
          const adminTz = resolveAdminTimeZone(chalData as any);
          const dueTimeLocal = chalData.due?.dueTimeLocal || '23:59';
          const todayKey = chalData.type === 'deadline'
            ? getAdminZoneDayKey(adminTz, now)
            : getCurrentPeriodDayKey(adminTz, dueTimeLocal, now);

          return getDocs(query(
            collection(db, 'checkIns'),
            where('challengeId', '==', chalId),
            where('userId', '==', userId),
            where('period.dayKey', '==', todayKey),
          ));
        })
      );

      // If any daily challenge has no check-in today, bonus not earned
      if (checkResults.some(snap => snap.empty)) {
        return { awarded: false, bonusXP: 0 };
      }

      // All daily challenges done — award bonus
      const bonusXP = baseXpJustAwarded * (XP_VALUES.DAILY_COMPLETE_MULTIPLIER - 1);
      await this.updateUserXPOnly(userId, bonusXP);
      return { awarded: true, bonusXP };
    } catch (e) {
      if (__DEV__) console.error('Daily complete bonus error (non-blocking):', e);
      return { awarded: false, bonusXP: 0 };
    }
  }

  /**
   * Check if two period keys are consecutive
   */
  private static isConsecutivePeriod(
    lastKey: string,
    currentKey: string,
    cadenceUnit: 'daily' | 'weekly',
  ): boolean {
    if (!lastKey || !currentKey) return false;

    if (cadenceUnit === 'daily') {
      const lastDate = new Date(lastKey + 'T00:00:00');
      const currentDate = new Date(currentKey + 'T00:00:00');
      const diffMs = currentDate.getTime() - lastDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      return diffDays === 1;
    }

    // Weekly: check if currentKey is exactly 7 days after lastKey
    const lastDate = new Date(lastKey + 'T00:00:00');
    const currentDate = new Date(currentKey + 'T00:00:00');
    const diffMs = currentDate.getTime() - lastDate.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return diffDays === 7;
  }
}
