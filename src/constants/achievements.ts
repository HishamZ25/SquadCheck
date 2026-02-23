export type AchievementCondition =
  | { type: 'totalCheckIns'; count: number }
  | { type: 'streak'; days: number }
  | { type: 'deadlineComplete'; count: number }
  | { type: 'eliminationWin'; count: number }
  | { type: 'groupsJoined'; count: number }
  | { type: 'groupsCreated'; count: number }
  | { type: 'onTimeCheckIns'; count: number }
  | { type: 'lateNightCheckIns'; count: number };

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type AchievementCategory = 'check-ins' | 'streaks' | 'challenges' | 'social' | 'habits';

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string; // Ionicons name
  color: string;
  rarity: AchievementRarity;
  xpReward: number;
  titleReward: string;
  category: AchievementCategory;
  condition: AchievementCondition;
}

export const RARITY_COLORS: Record<AchievementRarity, string> = {
  common: '#9CA3AF',
  rare: '#3B82F6',
  epic: '#8B5CF6',
  legendary: '#F59E0B',
};

export const ACHIEVEMENTS: AchievementDefinition[] = [
  // Check-in milestones
  {
    id: 'first_steps',
    name: 'First Steps',
    description: 'Complete your first check-in',
    icon: 'footsteps-outline',
    color: '#4CAF50',
    rarity: 'common',
    xpReward: 25,
    titleReward: 'Beginner',
    category: 'check-ins',
    condition: { type: 'totalCheckIns', count: 1 },
  },
  {
    id: 'getting_started',
    name: 'Getting Started',
    description: 'Complete 10 check-ins',
    icon: 'rocket-outline',
    color: '#2196F3',
    rarity: 'common',
    xpReward: 50,
    titleReward: 'Go-Getter',
    category: 'check-ins',
    condition: { type: 'totalCheckIns', count: 10 },
  },
  {
    id: 'halfway_there',
    name: 'Halfway There',
    description: 'Complete 50 check-ins',
    icon: 'flag-outline',
    color: '#3B82F6',
    rarity: 'rare',
    xpReward: 100,
    titleReward: 'Halfway Hero',
    category: 'check-ins',
    condition: { type: 'totalCheckIns', count: 50 },
  },
  {
    id: 'century_mark',
    name: 'Century Mark',
    description: 'Complete 100 check-ins',
    icon: 'ribbon-outline',
    color: '#8B5CF6',
    rarity: 'epic',
    xpReward: 200,
    titleReward: 'Centurion',
    category: 'check-ins',
    condition: { type: 'totalCheckIns', count: 100 },
  },
  {
    id: 'checkin_machine',
    name: 'Check-in Machine',
    description: 'Complete 500 check-ins',
    icon: 'hardware-chip-outline',
    color: '#F59E0B',
    rarity: 'legendary',
    xpReward: 500,
    titleReward: 'Unstoppable',
    category: 'check-ins',
    condition: { type: 'totalCheckIns', count: 500 },
  },

  // Streak achievements
  {
    id: 'streak_starter',
    name: 'Streak Starter',
    description: 'Reach a 3-day streak',
    icon: 'flame-outline',
    color: '#FF6B35',
    rarity: 'common',
    xpReward: 25,
    titleReward: 'Streak Starter',
    category: 'streaks',
    condition: { type: 'streak', days: 3 },
  },
  {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: 'Reach a 7-day streak',
    icon: 'flame',
    color: '#FF6B35',
    rarity: 'rare',
    xpReward: 75,
    titleReward: 'Week Warrior',
    category: 'streaks',
    condition: { type: 'streak', days: 7 },
  },
  {
    id: 'fortnight_force',
    name: 'Fortnight Force',
    description: 'Reach a 14-day streak',
    icon: 'bonfire-outline',
    color: '#EF4444',
    rarity: 'rare',
    xpReward: 100,
    titleReward: 'Fortnight Force',
    category: 'streaks',
    condition: { type: 'streak', days: 14 },
  },
  {
    id: 'month_master',
    name: 'Month Master',
    description: 'Reach a 30-day streak',
    icon: 'bonfire',
    color: '#8B5CF6',
    rarity: 'epic',
    xpReward: 200,
    titleReward: 'Month Master',
    category: 'streaks',
    condition: { type: 'streak', days: 30 },
  },
  {
    id: 'century_streak',
    name: 'Century Streak',
    description: 'Reach a 100-day streak',
    icon: 'trophy',
    color: '#F59E0B',
    rarity: 'legendary',
    xpReward: 500,
    titleReward: 'Streak Legend',
    category: 'streaks',
    condition: { type: 'streak', days: 100 },
  },

  // Challenge type achievements
  {
    id: 'deadline_crusher',
    name: 'Deadline Crusher',
    description: 'Complete a deadline challenge',
    icon: 'timer-outline',
    color: '#10B981',
    rarity: 'common',
    xpReward: 50,
    titleReward: 'Deadline Crusher',
    category: 'challenges',
    condition: { type: 'deadlineComplete', count: 1 },
  },
  {
    id: 'deadline_pro',
    name: 'Deadline Pro',
    description: 'Complete 5 deadline challenges',
    icon: 'timer',
    color: '#3B82F6',
    rarity: 'rare',
    xpReward: 150,
    titleReward: 'Deadline Pro',
    category: 'challenges',
    condition: { type: 'deadlineComplete', count: 5 },
  },
  {
    id: 'survivor',
    name: 'Survivor',
    description: 'Win an elimination challenge',
    icon: 'shield-checkmark-outline',
    color: '#EF4444',
    rarity: 'rare',
    xpReward: 100,
    titleReward: 'Survivor',
    category: 'challenges',
    condition: { type: 'eliminationWin', count: 1 },
  },
  {
    id: 'elimination_king',
    name: 'Elimination King',
    description: 'Win 3 elimination challenges',
    icon: 'shield-checkmark',
    color: '#8B5CF6',
    rarity: 'epic',
    xpReward: 250,
    titleReward: 'Elimination King',
    category: 'challenges',
    condition: { type: 'eliminationWin', count: 3 },
  },

  // Social achievements
  {
    id: 'team_player',
    name: 'Team Player',
    description: 'Join your first group',
    icon: 'people-outline',
    color: '#06B6D4',
    rarity: 'common',
    xpReward: 25,
    titleReward: 'Team Player',
    category: 'social',
    condition: { type: 'groupsJoined', count: 1 },
  },
  {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Join 5 groups',
    icon: 'people',
    color: '#3B82F6',
    rarity: 'rare',
    xpReward: 100,
    titleReward: 'Social Butterfly',
    category: 'social',
    condition: { type: 'groupsJoined', count: 5 },
  },
  {
    id: 'squad_leader',
    name: 'Squad Leader',
    description: 'Create your first group',
    icon: 'megaphone-outline',
    color: '#FF8C42',
    rarity: 'common',
    xpReward: 50,
    titleReward: 'Squad Leader',
    category: 'social',
    condition: { type: 'groupsCreated', count: 1 },
  },

  // Habit achievements
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Complete 10 on-time check-ins',
    icon: 'sunny-outline',
    color: '#F59E0B',
    rarity: 'common',
    xpReward: 50,
    titleReward: 'Early Bird',
    category: 'habits',
    condition: { type: 'onTimeCheckIns', count: 10 },
  },
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Complete 50 on-time check-ins',
    icon: 'checkmark-done-circle',
    color: '#8B5CF6',
    rarity: 'rare',
    xpReward: 150,
    titleReward: 'Perfectionist',
    category: 'habits',
    condition: { type: 'onTimeCheckIns', count: 50 },
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Check in after 10 PM 5 times',
    icon: 'moon-outline',
    color: '#6366F1',
    rarity: 'common',
    xpReward: 50,
    titleReward: 'Night Owl',
    category: 'habits',
    condition: { type: 'lateNightCheckIns', count: 5 },
  },
];
