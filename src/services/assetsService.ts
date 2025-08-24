import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { User, Badge, UnlockedTitle, UnlockedProfileIcon } from '../types';
import { 
  DEFAULT_TITLES, 
  DEFAULT_BADGES, 
  DEFAULT_PROFILE_ICONS,
  DefaultTitle,
  DefaultBadge,
  DefaultProfileIcon
} from '../constants/defaultAssets';

export class AssetsService {
  // ============================================================================
  // BADGES
  // ============================================================================
  
  // Unlock a badge for a user
  static async unlockBadge(userId: string, badgeId: string): Promise<void> {
    try {
      const badge = DEFAULT_BADGES.find(b => b.id === badgeId);
      if (!badge) {
        throw new Error('Badge not found');
      }

      const userRef = doc(db, 'users', userId);
      const unlockedBadge: Badge = {
        id: badge.id,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        color: badge.color,
        backgroundColor: badge.backgroundColor,
        rarity: badge.rarity,
        category: badge.category,
        unlockedAt: new Date(),
      };

      await updateDoc(userRef, {
        badges: arrayUnion(unlockedBadge),
      });
    } catch (error) {
      console.error('Error unlocking badge:', error);
      throw error;
    }
  }

  // Get all unlocked badges for a user
  static async getUserBadges(userId: string): Promise<Badge[]> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        return userDoc.data().badges || [];
      }
      return [];
    } catch (error) {
      console.error('Error getting user badges:', error);
      return [];
    }
  }

  // Check if user has a specific badge
  static async hasBadge(userId: string, badgeId: string): Promise<boolean> {
    const badges = await this.getUserBadges(userId);
    return badges.some(badge => badge.id === badgeId);
  }

  // ============================================================================
  // TITLES
  // ============================================================================
  
  // Unlock a title for a user
  static async unlockTitle(userId: string, titleId: string): Promise<void> {
    try {
      const title = DEFAULT_TITLES.find(t => t.id === titleId);
      if (!title) {
        throw new Error('Title not found');
      }

      const userRef = doc(db, 'users', userId);
      const unlockedTitle: UnlockedTitle = {
        id: title.id,
        text: title.text,
        color: title.color,
        fontSize: title.fontSize,
        fontWeight: title.fontWeight,
        fontFamily: title.fontFamily,
        rarity: title.rarity,
        category: title.category,
        unlockedAt: new Date(),
      };

      await updateDoc(userRef, {
        unlockedTitles: arrayUnion(unlockedTitle),
      });
    } catch (error) {
      console.error('Error unlocking title:', error);
      throw error;
    }
  }

  // Get all unlocked titles for a user
  static async getUserTitles(userId: string): Promise<UnlockedTitle[]> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        return userDoc.data().unlockedTitles || [];
      }
      return [];
    } catch (error) {
      console.error('Error getting user titles:', error);
      return [];
    }
  }

  // Check if user has a specific title
  static async hasTitle(userId: string, titleId: string): Promise<boolean> {
    const titles = await this.getUserTitles(userId);
    return titles.some(title => title.id === titleId);
  }

  // ============================================================================
  // PROFILE ICONS
  // ============================================================================
  
  // Unlock a profile icon for a user
  static async unlockProfileIcon(userId: string, iconId: string): Promise<void> {
    try {
      const icon = DEFAULT_PROFILE_ICONS.find(i => i.id === iconId);
      if (!icon) {
        throw new Error('Profile icon not found');
      }

      const userRef = doc(db, 'users', userId);
      const unlockedIcon: UnlockedProfileIcon = {
        id: icon.id,
        name: icon.name,
        imageUrl: icon.imageUrl,
        rarity: icon.rarity,
        category: icon.category,
        unlockedAt: new Date(),
      };

      await updateDoc(userRef, {
        unlockedProfileIcons: arrayUnion(unlockedIcon),
      });
    } catch (error) {
      console.error('Error unlocking profile icon:', error);
      throw error;
    }
  }

  // Get all unlocked profile icons for a user
  static async getUserProfileIcons(userId: string): Promise<UnlockedProfileIcon[]> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        return userDoc.data().unlockedProfileIcons || [];
      }
      return [];
    } catch (error) {
      console.error('Error getting user profile icons:', error);
      return [];
    }
  }

  // Check if user has a specific profile icon
  static async hasProfileIcon(userId: string, iconId: string): Promise<boolean> {
    const icons = await this.getUserProfileIcons(userId);
    return icons.some(icon => icon.id === iconId);
  }

  // Select a profile icon for a user
  static async selectProfileIcon(userId: string, iconId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        selectedProfileIcon: iconId,
      });
    } catch (error) {
      console.error('Error selecting profile icon:', error);
      throw error;
    }
  }

  // ============================================================================
  // AUTO-UNLOCKING BASED ON ACHIEVEMENTS
  // ============================================================================
  
  // Check and unlock achievements based on user stats
  static async checkAndUnlockAchievements(userId: string, userStats: {
    totalCheckIns: number;
    currentStreak: number;
    groupsJoined: number;
    groupsCreated: number;
    categoriesCompleted: string[];
  }): Promise<void> {
    try {
      // Check streak achievements
      if (userStats.currentStreak >= 3 && !(await this.hasBadge(userId, 'streak_3'))) {
        await this.unlockBadge(userId, 'streak_3');
        await this.unlockTitle(userId, 'first_streak');
      }
      
      if (userStats.currentStreak >= 7 && !(await this.hasBadge(userId, 'streak_7'))) {
        await this.unlockBadge(userId, 'streak_7');
        await this.unlockTitle(userId, 'week_warrior');
      }
      
      if (userStats.currentStreak >= 30 && !(await this.hasBadge(userId, 'streak_30'))) {
        await this.unlockBadge(userId, 'streak_30');
        await this.unlockTitle(userId, 'month_master');
      }
      
      if (userStats.currentStreak >= 100 && !(await this.hasBadge(userId, 'streak_100'))) {
        await this.unlockBadge(userId, 'streak_100');
        await this.unlockTitle(userId, 'century_club');
      }

      // Check social achievements
      if (userStats.groupsJoined >= 1 && !(await this.hasBadge(userId, 'group_joiner'))) {
        await this.unlockBadge(userId, 'group_joiner');
        await this.unlockTitle(userId, 'team_player');
      }
      
      if (userStats.groupsCreated >= 1 && !(await this.hasBadge(userId, 'group_creator'))) {
        await this.unlockBadge(userId, 'group_creator');
        await this.unlockTitle(userId, 'group_leader');
      }

      // Check check-in achievements
      if (userStats.totalCheckIns >= 1 && !(await this.hasBadge(userId, 'first_checkin'))) {
        await this.unlockBadge(userId, 'first_checkin');
      }

      // Check category achievements
      if (userStats.categoriesCompleted.includes('fitness') && userStats.totalCheckIns >= 10) {
        if (!(await this.hasBadge(userId, 'fitness_beginner'))) {
          await this.unlockBadge(userId, 'fitness_beginner');
          await this.unlockTitle(userId, 'gym_rat');
        }
      }

      if (userStats.categoriesCompleted.includes('academic') && userStats.totalCheckIns >= 10) {
        if (!(await this.hasBadge(userId, 'student'))) {
          await this.unlockBadge(userId, 'student');
          await this.unlockTitle(userId, 'student');
        }
      }

      // Check profile icon unlocks
      if (userStats.currentStreak >= 14 && !(await this.hasProfileIcon(userId, 'wolf'))) {
        await this.unlockProfileIcon(userId, 'wolf');
      }
      
      if (userStats.currentStreak >= 100 && !(await this.hasProfileIcon(userId, 'phoenix'))) {
        await this.unlockProfileIcon(userId, 'phoenix');
      }

    } catch (error) {
      console.error('Error checking achievements:', error);
    }
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  
  // Get all available assets (for display in collections)
  static getAllTitles() {
    return DEFAULT_TITLES;
  }

  static getAllBadges() {
    return DEFAULT_BADGES;
  }

  static getAllProfileIcons() {
    return DEFAULT_PROFILE_ICONS;
  }

  // Get assets by category
  static getTitlesByCategory(category: string) {
    return DEFAULT_TITLES.filter(title => title.category === category);
  }

  static getBadgesByCategory(category: string) {
    return DEFAULT_BADGES.filter(badge => badge.category === category);
  }

  static getProfileIconsByCategory(category: string) {
    return DEFAULT_PROFILE_ICONS.filter(icon => icon.category === category);
  }

  // Get assets by rarity
  static getTitlesByRarity(rarity: string) {
    return DEFAULT_TITLES.filter(title => title.rarity === rarity);
  }

  static getBadgesByRarity(rarity: string) {
    return DEFAULT_BADGES.filter(badge => badge.rarity === rarity);
  }

  static getProfileIconsByRarity(rarity: string) {
    return DEFAULT_PROFILE_ICONS.filter(icon => icon.rarity === rarity);
  }
} 