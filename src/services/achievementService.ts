import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  arrayUnion,
} from 'firebase/firestore';
import { db } from './firebase';
import { ACHIEVEMENTS, AchievementDefinition, RARITY_COLORS } from '../constants/achievements';
import { GamificationService } from './gamificationService';
import { Badge, UnlockedTitle } from '../types';

interface UserStats {
  totalCheckIns: number;
  longestStreak: number;
  deadlineComplete: number;
  eliminationWin: number;
  groupsJoined: number;
  groupsCreated: number;
  onTimeCheckIns: number;
  lateNightCheckIns: number;
}

export class AchievementService {
  /**
   * Check all achievements and award any newly unlocked ones.
   * Call fire-and-forget after check-ins, group join/create, etc.
   */
  static async checkAndAwardAchievements(userId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return;

      const userData = userSnap.data();
      const existingBadgeIds = new Set(
        (userData.badges || []).map((b: Badge) => b.id)
      );

      // Gather stats in parallel
      const stats = await this.gatherStats(userId, userData);

      // Find newly unlocked achievements
      const newlyUnlocked: AchievementDefinition[] = [];
      for (const achievement of ACHIEVEMENTS) {
        if (existingBadgeIds.has(achievement.id)) continue;
        if (this.isConditionMet(achievement, stats)) {
          newlyUnlocked.push(achievement);
        }
      }

      if (newlyUnlocked.length === 0) return;

      // Award each achievement
      // Use Date.now() (number) instead of new Date() to avoid Firestore serialization issues
      const nowMs = Date.now();
      const badgesToAdd: Badge[] = newlyUnlocked.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        icon: a.icon,
        color: RARITY_COLORS[a.rarity],
        backgroundColor: RARITY_COLORS[a.rarity] + '20',
        rarity: a.rarity,
        category: 'achievement' as const,
        unlockedAt: nowMs as any,
      }));

      const titlesToAdd: UnlockedTitle[] = newlyUnlocked.map((a) => ({
        id: `achievement_${a.id}`,
        text: a.titleReward,
        color: RARITY_COLORS[a.rarity],
        rarity: a.rarity,
        category: 'achievement',
        unlockedAt: nowMs as any,
      }));

      // Write badges and titles via arrayUnion (each item separately for dedup)
      const updates: Record<string, any> = {};
      for (const badge of badgesToAdd) {
        updates.badges = arrayUnion(badge);
      }
      for (const title of titlesToAdd) {
        updates.unlockedTitles = arrayUnion(title);
      }

      // arrayUnion with multiple calls gets merged — but we need all items.
      // Use a single updateDoc with arrayUnion spread for each array.
      await updateDoc(userRef, {
        badges: arrayUnion(...badgesToAdd),
        unlockedTitles: arrayUnion(...titlesToAdd),
      });

      // Award XP for all new achievements
      const totalXP = newlyUnlocked.reduce((sum, a) => sum + a.xpReward, 0);
      if (totalXP > 0) {
        await GamificationService.updateUserXPOnly(userId, totalXP);
      }
    } catch (e) {
      if (__DEV__) console.error('Achievement check error (non-blocking):', e);
    }
  }

  /**
   * Gather all stats needed for achievement condition checks.
   */
  private static async gatherStats(
    userId: string,
    userData: Record<string, any>
  ): Promise<UserStats> {
    // Start with user doc fields
    const totalCheckIns = userData.totalCheckIns || 0;
    const longestStreak = userData.longestStreak || 0;
    const onTimeCheckIns = userData.onTimeCheckIns || 0;
    const lateNightCheckIns = userData.lateNightCheckIns || 0;

    // Query Firestore for the rest in parallel
    const [deadlineComplete, eliminationWin, groupsJoined, groupsCreated] =
      await Promise.all([
        this.countDeadlineCompleted(userId),
        this.countEliminationWins(userId),
        this.countGroupsJoined(userId),
        this.countGroupsCreated(userId),
      ]);

    return {
      totalCheckIns,
      longestStreak,
      deadlineComplete,
      eliminationWin,
      groupsJoined,
      groupsCreated,
      onTimeCheckIns,
      lateNightCheckIns,
    };
  }

  private static async countDeadlineCompleted(userId: string): Promise<number> {
    try {
      // Count ended deadline challenges where user has a member doc
      const membersSnap = await getDocs(
        query(
          collection(db, 'challengeMembers'),
          where('userId', '==', userId)
        )
      );
      const challengeIds = membersSnap.docs.map((d) => d.data().challengeId).filter(Boolean);
      if (challengeIds.length === 0) return 0;

      let count = 0;
      for (let i = 0; i < challengeIds.length; i += 10) {
        const batch = challengeIds.slice(i, i + 10);
        const snap = await getDocs(
          query(
            collection(db, 'challenges'),
            where('__name__', 'in', batch),
            where('type', '==', 'deadline'),
            where('state', '==', 'ended')
          )
        );
        count += snap.size;
      }
      return count;
    } catch {
      return 0;
    }
  }

  private static async countEliminationWins(userId: string): Promise<number> {
    try {
      const snap = await getDocs(
        query(
          collection(db, 'challenges'),
          where('type', '==', 'elimination'),
          where('state', '==', 'ended'),
          where('winnerId', '==', userId)
        )
      );
      return snap.size;
    } catch {
      return 0;
    }
  }

  private static async countGroupsJoined(userId: string): Promise<number> {
    try {
      const snap = await getDocs(
        query(
          collection(db, 'groups'),
          where('memberIds', 'array-contains', userId)
        )
      );
      return snap.size;
    } catch {
      return 0;
    }
  }

  private static async countGroupsCreated(userId: string): Promise<number> {
    try {
      const snap = await getDocs(
        query(
          collection(db, 'groups'),
          where('creatorId', '==', userId)
        )
      );
      return snap.size;
    } catch {
      return 0;
    }
  }

  /**
   * Check if a single achievement's condition is met.
   */
  private static isConditionMet(
    achievement: AchievementDefinition,
    stats: UserStats
  ): boolean {
    const { condition } = achievement;
    switch (condition.type) {
      case 'totalCheckIns':
        return stats.totalCheckIns >= condition.count;
      case 'streak':
        return stats.longestStreak >= condition.days;
      case 'deadlineComplete':
        return stats.deadlineComplete >= condition.count;
      case 'eliminationWin':
        return stats.eliminationWin >= condition.count;
      case 'groupsJoined':
        return stats.groupsJoined >= condition.count;
      case 'groupsCreated':
        return stats.groupsCreated >= condition.count;
      case 'onTimeCheckIns':
        return stats.onTimeCheckIns >= condition.count;
      case 'lateNightCheckIns':
        return stats.lateNightCheckIns >= condition.count;
      default:
        return false;
    }
  }
}
