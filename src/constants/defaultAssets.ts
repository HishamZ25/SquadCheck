import { Ionicons } from '@expo/vector-icons';

// ============================================================================
// DEFAULT TITLES
// ============================================================================
export interface DefaultTitle {
  id: string;
  text: string;
  color: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockCondition: string;
  category: 'achievement' | 'social' | 'fitness' | 'productivity' | 'creative' | 'academic';
}

export const DEFAULT_TITLES: DefaultTitle[] = [
  // Achievement Titles
  {
    id: 'first_streak',
    text: 'Streak Starter',
    color: '#FFD700', // Gold
    fontSize: 18,
    fontWeight: '600',
    rarity: 'common',
    unlockCondition: 'Complete your first 3-day streak',
    category: 'achievement'
  },
  {
    id: 'week_warrior',
    text: 'Week Warrior',
    color: '#FF6B35', // Orange
    fontSize: 18,
    fontWeight: '700',
    rarity: 'rare',
    unlockCondition: 'Complete a 7-day streak',
    category: 'achievement'
  },
  {
    id: 'month_master',
    text: 'Month Master',
    color: '#9C27B0', // Purple
    fontSize: 20,
    fontWeight: '800',
    rarity: 'epic',
    unlockCondition: 'Complete a 30-day streak',
    category: 'achievement'
  },
  {
    id: 'century_club',
    text: 'Century Club',
    color: '#FF1744', // Red
    fontSize: 22,
    fontWeight: '900',
    rarity: 'legendary',
    unlockCondition: 'Complete a 100-day streak',
    category: 'achievement'
  },
  
  // Social Titles
  {
    id: 'team_player',
    text: 'Team Player',
    color: '#4CAF50', // Green
    fontSize: 18,
    fontWeight: '600',
    rarity: 'common',
    unlockCondition: 'Join your first group',
    category: 'social'
  },
  {
    id: 'group_leader',
    text: 'Group Leader',
    color: '#2196F3', // Blue
    fontSize: 18,
    fontWeight: '700',
    rarity: 'rare',
    unlockCondition: 'Create your first group',
    category: 'social'
  },
  {
    id: 'motivator',
    text: 'Motivator',
    color: '#FF9800', // Orange
    fontSize: 18,
    fontWeight: '600',
    rarity: 'rare',
    unlockCondition: 'Help 5 people complete their goals',
    category: 'social'
  },
  
  // Fitness Titles
  {
    id: 'gym_rat',
    text: 'Gym Rat',
    color: '#795548', // Brown
    fontSize: 18,
    fontWeight: '600',
    rarity: 'common',
    unlockCondition: 'Complete 10 fitness check-ins',
    category: 'fitness'
  },
  {
    id: 'fitness_fanatic',
    text: 'Fitness Fanatic',
    color: '#E91E63', // Pink
    fontSize: 18,
    fontWeight: '700',
    rarity: 'rare',
    unlockCondition: 'Complete 50 fitness check-ins',
    category: 'fitness'
  },
  
  // Productivity Titles
  {
    id: 'early_bird',
    text: 'Early Bird',
    color: '#FFC107', // Yellow
    fontSize: 18,
    fontWeight: '600',
    rarity: 'common',
    unlockCondition: 'Complete 5 morning check-ins before 8 AM',
    category: 'productivity'
  },
  {
    id: 'night_owl',
    text: 'Night Owl',
    color: '#673AB7', // Deep Purple
    fontSize: 18,
    fontWeight: '600',
    rarity: 'common',
    unlockCondition: 'Complete 5 evening check-ins after 10 PM',
    category: 'productivity'
  },
  
  // Creative Titles
  {
    id: 'artist',
    text: 'Artist',
    color: '#FF5722', // Deep Orange
    fontSize: 18,
    fontWeight: '600',
    rarity: 'common',
    unlockCondition: 'Complete 10 creative project check-ins',
    category: 'creative'
  },
  {
    id: 'creative_genius',
    text: 'Creative Genius',
    color: '#00BCD4', // Cyan
    fontSize: 18,
    fontWeight: '700',
    rarity: 'rare',
    unlockCondition: 'Complete 50 creative project check-ins',
    category: 'creative'
  },
  
  // Academic Titles
  {
    id: 'student',
    text: 'Student',
    color: '#607D8B', // Blue Grey
    fontSize: 18,
    fontWeight: '600',
    rarity: 'common',
    unlockCondition: 'Complete 10 study check-ins',
    category: 'academic'
  },
  {
    id: 'scholar',
    text: 'Scholar',
    color: '#3F51B5', // Indigo
    fontSize: 18,
    fontWeight: '700',
    rarity: 'rare',
    unlockCondition: 'Complete 100 study check-ins',
    category: 'academic'
  }
];

// ============================================================================
// DEFAULT BADGES
// ============================================================================
export interface DefaultBadge {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  backgroundColor: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockCondition: string;
  category: 'achievement' | 'social' | 'fitness' | 'productivity' | 'creative' | 'academic';
  description: string;
}

export const DEFAULT_BADGES: DefaultBadge[] = [
  // Achievement Badges
  {
    id: 'first_checkin',
    name: 'First Check-in',
    icon: 'checkmark-circle',
    color: '#FFFFFF',
    backgroundColor: '#4CAF50',
    rarity: 'common',
    unlockCondition: 'Complete your first check-in',
    category: 'achievement',
    description: 'You\'ve taken your first step!'
  },
  {
    id: 'streak_3',
    name: '3-Day Streak',
    icon: 'flame',
    color: '#FFFFFF',
    backgroundColor: '#FF9800',
    rarity: 'common',
    unlockCondition: 'Complete a 3-day streak',
    category: 'achievement',
    description: 'You\'re building momentum!'
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    icon: 'flame',
    color: '#FFFFFF',
    backgroundColor: '#FF5722',
    rarity: 'rare',
    unlockCondition: 'Complete a 7-day streak',
    category: 'achievement',
    description: 'A full week of consistency!'
  },
  {
    id: 'streak_30',
    name: 'Month Master',
    icon: 'flame',
    color: '#FFFFFF',
    backgroundColor: '#9C27B0',
    rarity: 'epic',
    unlockCondition: 'Complete a 30-day streak',
    category: 'achievement',
    description: 'A month of dedication!'
  },
  {
    id: 'streak_100',
    name: 'Century Club',
    icon: 'flame',
    color: '#FFFFFF',
    backgroundColor: '#F44336',
    rarity: 'legendary',
    unlockCondition: 'Complete a 100-day streak',
    category: 'achievement',
    description: 'Legendary consistency!'
  },
  
  // Social Badges
  {
    id: 'group_joiner',
    name: 'Group Joiner',
    icon: 'people',
    color: '#FFFFFF',
    backgroundColor: '#2196F3',
    rarity: 'common',
    unlockCondition: 'Join your first group',
    category: 'social',
    description: 'You\'re part of a team!'
  },
  {
    id: 'group_creator',
    name: 'Group Creator',
    icon: 'add-circle',
    color: '#FFFFFF',
    backgroundColor: '#4CAF50',
    rarity: 'rare',
    unlockCondition: 'Create your first group',
    category: 'social',
    description: 'You\'re a leader!'
  },
  {
    id: 'motivator',
    name: 'Motivator',
    icon: 'heart',
    color: '#FFFFFF',
    backgroundColor: '#E91E63',
    rarity: 'rare',
    unlockCondition: 'Help 5 people complete their goals',
    category: 'social',
    description: 'You inspire others!'
  },
  
  // Fitness Badges
  {
    id: 'fitness_beginner',
    name: 'Fitness Beginner',
    icon: 'fitness',
    color: '#FFFFFF',
    backgroundColor: '#795548',
    rarity: 'common',
    unlockCondition: 'Complete 10 fitness check-ins',
    category: 'fitness',
    description: 'Getting stronger every day!'
  },
  {
    id: 'fitness_enthusiast',
    name: 'Fitness Enthusiast',
    icon: 'fitness',
    color: '#FFFFFF',
    backgroundColor: '#FF9800',
    rarity: 'rare',
    unlockCondition: 'Complete 50 fitness check-ins',
    category: 'fitness',
    description: 'You\'re a fitness machine!'
  },
  
  // Productivity Badges
  {
    id: 'early_bird',
    name: 'Early Bird',
    icon: 'sunny',
    color: '#FFFFFF',
    backgroundColor: '#FFC107',
    rarity: 'common',
    unlockCondition: 'Complete 5 morning check-ins before 8 AM',
    category: 'productivity',
    description: 'Rise and shine!'
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    icon: 'moon',
    color: '#FFFFFF',
    backgroundColor: '#673AB7',
    rarity: 'common',
    unlockCondition: 'Complete 5 evening check-ins after 10 PM',
    category: 'productivity',
    description: 'Working late into the night!'
  },
  
  // Creative Badges
  {
    id: 'creative_soul',
    name: 'Creative Soul',
    icon: 'brush',
    color: '#FFFFFF',
    backgroundColor: '#FF5722',
    rarity: 'common',
    unlockCondition: 'Complete 10 creative project check-ins',
    category: 'creative',
    description: 'Your creativity knows no bounds!'
  },
  {
    id: 'creative_master',
    name: 'Creative Master',
    icon: 'color-palette',
    color: '#FFFFFF',
    backgroundColor: '#00BCD4',
    rarity: 'rare',
    unlockCondition: 'Complete 50 creative project check-ins',
    category: 'creative',
    description: 'A true artist!'
  },
  
  // Academic Badges
  {
    id: 'student',
    name: 'Student',
    icon: 'school',
    color: '#FFFFFF',
    backgroundColor: '#607D8B',
    rarity: 'common',
    unlockCondition: 'Complete 10 study check-ins',
    category: 'academic',
    description: 'Knowledge is power!'
  },
  {
    id: 'scholar',
    name: 'Scholar',
    icon: 'library',
    color: '#FFFFFF',
    backgroundColor: '#3F51B5',
    rarity: 'rare',
    unlockCondition: 'Complete 100 study check-ins',
    category: 'academic',
    description: 'A true scholar!'
  }
];

// ============================================================================
// DEFAULT PROFILE ICONS
// ============================================================================
export interface DefaultProfileIcon {
  id: string;
  name: string;
  imageUrl: string; // This will be a URL to the image in Firebase Storage
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockCondition: string;
  category: 'animals' | 'nature' | 'abstract' | 'gaming' | 'sports' | 'food' | 'travel' | 'tech';
  description: string;
}

export const DEFAULT_PROFILE_ICONS: DefaultProfileIcon[] = [
  // Animals
  {
    id: 'lion',
    name: 'Lion',
    imageUrl: 'profile_icons/lion.png',
    rarity: 'rare',
    unlockCondition: 'Complete a 30-day streak',
    category: 'animals',
    description: 'The king of the jungle'
  },
  {
    id: 'eagle',
    name: 'Eagle',
    imageUrl: 'profile_icons/eagle.png',
    rarity: 'rare',
    unlockCondition: 'Complete a 50-day streak',
    category: 'animals',
    description: 'Soaring high above'
  },
  {
    id: 'wolf',
    name: 'Wolf',
    imageUrl: 'profile_icons/wolf.png',
    rarity: 'epic',
    unlockCondition: 'Complete a 14-day streak',
    category: 'animals',
    description: 'Loyal and fierce'
  },
  {
    id: 'phoenix',
    name: 'Phoenix',
    imageUrl: 'profile_icons/phoenix.png',
    rarity: 'legendary',
    unlockCondition: 'Complete a 100-day streak',
    category: 'animals',
    description: 'Rising from the ashes'
  },
  
  // Nature
  {
    id: 'mountain',
    name: 'Mountain',
    imageUrl: 'profile_icons/mountain.png',
    rarity: 'rare',
    unlockCondition: 'Complete 25 check-ins',
    category: 'nature',
    description: 'Reaching new heights'
  },
  {
    id: 'ocean',
    name: 'Ocean',
    imageUrl: 'profile_icons/ocean.png',
    rarity: 'rare',
    unlockCondition: 'Complete 50 check-ins',
    category: 'nature',
    description: 'Deep and mysterious'
  },
  {
    id: 'forest',
    name: 'Forest',
    imageUrl: 'profile_icons/forest.png',
    rarity: 'epic',
    unlockCondition: 'Join 3 different groups',
    category: 'nature',
    description: 'Growing and thriving'
  },
  
  // Abstract
  {
    id: 'geometric',
    name: 'Geometric',
    imageUrl: 'profile_icons/geometric.png',
    rarity: 'common',
    unlockCondition: 'Available by default',
    category: 'abstract',
    description: 'Clean and modern'
  },
  {
    id: 'gradient',
    name: 'Gradient',
    imageUrl: 'profile_icons/gradient.png',
    rarity: 'common',
    unlockCondition: 'Available by default',
    category: 'abstract',
    description: 'Smooth transitions'
  },
  
  // Gaming
  {
    id: 'controller',
    name: 'Game Controller',
    imageUrl: 'profile_icons/controller.png',
    rarity: 'common',
    unlockCondition: 'Available by default',
    category: 'gaming',
    description: 'Ready to play'
  },
  {
    id: 'dice',
    name: 'Dice',
    imageUrl: 'profile_icons/dice.png',
    rarity: 'rare',
    unlockCondition: 'Complete 25 random category check-ins',
    category: 'gaming',
    description: 'Roll the dice'
  },
  
  // Sports
  {
    id: 'basketball',
    name: 'Basketball',
    imageUrl: 'profile_icons/basketball.png',
    rarity: 'common',
    unlockCondition: 'Available by default',
    category: 'sports',
    description: 'Slam dunk!'
  },
  {
    id: 'soccer',
    name: 'Soccer Ball',
    imageUrl: 'profile_icons/soccer.png',
    rarity: 'common',
    unlockCondition: 'Available by default',
    category: 'sports',
    description: 'Goal!'
  },
  
  // Food
  {
    id: 'pizza',
    name: 'Pizza',
    imageUrl: 'profile_icons/pizza.png',
    rarity: 'common',
    unlockCondition: 'Available by default',
    category: 'food',
    description: 'Delicious!'
  },
  {
    id: 'coffee',
    name: 'Coffee',
    imageUrl: 'profile_icons/coffee.png',
    rarity: 'common',
    unlockCondition: 'Available by default',
    category: 'food',
    description: 'Fuel for the day'
  },
  
  // Travel
  {
    id: 'globe',
    name: 'Globe',
    imageUrl: 'profile_icons/globe.png',
    rarity: 'common',
    unlockCondition: 'Available by default',
    category: 'travel',
    description: 'World traveler'
  },
  {
    id: 'compass',
    name: 'Compass',
    imageUrl: 'profile_icons/compass.png',
    rarity: 'rare',
    unlockCondition: 'Complete check-ins in 5 different locations',
    category: 'travel',
    description: 'Finding your way'
  },
  
  // Tech
  {
    id: 'robot',
    name: 'Robot',
    imageUrl: 'profile_icons/robot.png',
    rarity: 'common',
    unlockCondition: 'Available by default',
    category: 'tech',
    description: 'Future is now'
  },
  {
    id: 'rocket',
    name: 'Rocket',
    imageUrl: 'profile_icons/rocket.png',
    rarity: 'epic',
    unlockCondition: 'Complete 100 check-ins',
    category: 'tech',
    description: 'Blasting off!'
  }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Get titles by category
export const getTitlesByCategory = (category: DefaultTitle['category']) => {
  return DEFAULT_TITLES.filter(title => title.category === category);
};

// Get badges by category
export const getBadgesByCategory = (category: DefaultBadge['category']) => {
  return DEFAULT_BADGES.filter(badge => badge.category === category);
};

// Get profile icons by category
export const getProfileIconsByCategory = (category: DefaultProfileIcon['category']) => {
  return DEFAULT_PROFILE_ICONS.filter(icon => icon.category === category);
};

// Get items by rarity
export const getItemsByRarity = <T extends { rarity: string }>(items: T[], rarity: T['rarity']) => {
  return items.filter(item => item.rarity === rarity);
};

// Get random item from a list
export const getRandomItem = <T>(items: T[]): T => {
  return items[Math.floor(Math.random() * items.length)];
};

// Get random item by rarity
export const getRandomItemByRarity = <T extends { rarity: string }>(items: T[], rarity: T['rarity']): T => {
  const filteredItems = getItemsByRarity(items, rarity);
  return getRandomItem(filteredItems);
}; 