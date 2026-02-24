export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  title?: string | null;
  badges: Badge[];
  unlockedTitles: UnlockedTitle[];
  unlockedProfileIcons: UnlockedProfileIcon[];
  selectedProfileIcon?: string;
  pushToken?: string;
  notificationPreferences?: NotificationPreferences;
  // Gamification
  xp: number;
  level: number;
  levelTitle: string;
  totalCheckIns: number;
  longestStreak: number;
  onTimeCheckIns: number;
  lateNightCheckIns: number;

  createdAt: Date;
  lastActive: Date;
}

export interface NotificationPreferences {
  hour_before: boolean;
  chat_all: boolean;
  group_checkins: boolean;
  elimination: boolean;
  invites: boolean;
  reminders: boolean;
}

export type NotificationType = keyof NotificationPreferences;

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
  read: boolean;
  createdAt: Date;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  backgroundColor: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: 'achievement' | 'social' | 'fitness' | 'productivity' | 'creative' | 'academic';
  unlockedAt: Date;
}

export interface UnlockedTitle {
  id: string;
  text: string;
  color: string;
  fontSize?: number;
  fontWeight?: string;
  fontFamily?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: string;
  unlockedAt: Date;
}

export interface UnlockedProfileIcon {
  id: string;
  name: string;
  imageUrl: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: string;
  unlockedAt: Date;
}

// Group: Simple collection of users
export interface Group {
  id: string;
  name: string;
  memberIds: string[];
  createdBy: string;
  createdAt: Date;
}

// Challenge: New comprehensive schema
export interface Challenge {
  id: string;
  groupId?: string | null;  // Optional for solo challenges

  title: string;
  description?: string;

  type: 'standard' | 'progress' | 'elimination' | 'deadline';
  category?: string;                   // e.g. 'fitness', 'diet', 'study', 'custom'

  cadence: {
    unit: 'daily' | 'weekly';
    requiredCount?: number;          // e.g. 3x per week
    weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;     // 1 = Monday
  };

  submission: {
    inputType: 'boolean' | 'number' | 'text' | 'timer';
    unitLabel?: string;              // "minutes", "pages", "pushups"
    minValue?: number;
    requireAttachment?: boolean;
    attachmentTypes?: ('photo' | 'screenshot')[];
    requireText?: boolean;
    minTextLength?: number;
  };

  due: {
    dueTimeLocal?: string;           // "23:59", "06:00" — wall-clock time in adminTimeZone
    timezoneMode: 'userLocal' | 'groupLocal';
    timezone?: string;               // IANA timezone (e.g., "America/New_York") — legacy alias for adminTimeZone
    timezoneOffset?: number;         // Offset in minutes from UTC when challenge created (legacy)
    deadlineDate?: string;           // YYYY-MM-DD (for deadline type)
  };

  rules?: {
    progress?: {
      startsAt: number;
      increaseBy: number;
      increaseUnit: 'week';
      comparison: 'gte' | 'lte';
    };

    elimination?: {
      strikesAllowed: number;        // 0 = instant elimination
      eliminateOn: 'miss' | 'failedRequirement';
    };

    deadline?: {
      targetValue?: number;
      comparison?: 'gte' | 'lte';
      progressMode: 'accumulate' | 'latest';
    };
  };

  settings?: {
    allowLateCheckIn?: boolean;
    lateGraceMinutes?: number;
  };

  // Admin / ownership
  adminUserId?: string;              // Challenge admin (creator). Falls back to createdBy.
  adminTimeZone?: string;            // IANA timezone of the admin at creation (e.g., "America/Los_Angeles")

  // Challenge lifecycle state
  state?: 'active' | 'ended';       // Default 'active'. Set to 'ended' when deadline/winner.
  endedAt?: Date;                    // When the challenge ended
  winnerId?: string;                 // userId of the winner (elimination challenges)

  // Scheduler hint: next due moment as UTC millis for efficient querying
  nextDueAtUtc?: number;

  createdBy: string;
  createdAt: Date;
  isArchived?: boolean;
}

// CheckIn: Source of truth for progress
export interface CheckIn {
  id: string;
  groupId?: string | null;  // Optional for solo challenges
  challengeId: string;
  userId: string;

  period: {
    unit: 'daily' | 'weekly';
    dayKey?: string;                // YYYY-MM-DD
    weekKey?: string;               // week start date YYYY-MM-DD
  };

  payload: {
    booleanValue?: boolean;
    numberValue?: number;
    textValue?: string;
    timerSeconds?: number;
  };

  attachments?: Array<{
    type: 'photo' | 'screenshot';
    storagePath: string;
    downloadUrl?: string;
    width?: number;
    height?: number;
  }>;

  status: 'completed' | 'pending' | 'missed' | 'failed';

  computed?: {
    targetValue?: number;
    metRequirement?: boolean;
  };

  createdAt: Date;
  updatedAt?: Date;
}

// ChallengeMember: Tracks elimination and strikes
export interface ChallengeMember {
  id: string;                     // `${challengeId}_${userId}`
  challengeId: string;
  groupId?: string | null;        // Optional for solo challenges
  userId: string;

  state: 'active' | 'eliminated';
  strikes: number;
  eliminatedAt?: Date;
  lastEvaluatedPeriodKey?: string;

  // Gamification — streaks
  currentStreak: number;
  longestStreak: number;
  streakShields: number;
  streakShieldUsed: boolean;
  lastCheckInPeriodKey?: string;

  joinedAt: Date;
}

export interface GroupInvitation {
  id: string;
  groupId: string;
  inviterId: string;
  inviteeId: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  sentAt: Date;
  expiresAt: Date;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  frequency: 'daily' | 'weekly' | 'monthly';
  targetDays?: number;
  startDate: Date;
  endDate?: Date;
  isCompleted: boolean;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  type: 'title' | 'badge' | 'profile-pic';
  icon?: string;
  color?: string;
  unlockCondition: string;
  isUnlocked: boolean;
  unlockedAt?: Date;
}

export interface ChatMessage {
  id: string;
  type: 'check-in' | 'text' | 'system';
  content: string;
  senderId?: string;
  timestamp: Date;
  checkIn?: CheckIn;
  metadata?: Record<string, any>;
}

export interface Friendship {
  id: string;
  userId1: string;
  userId2: string;
  status: 'pending' | 'accepted' | 'blocked';
  requestedBy: string;
  requestedAt: Date | string;
  acceptedAt?: Date | string;
}

export interface Reminder {
  id: string;
  userId: string;
  title: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  // For daily: array of hours (0-23)
  // For weekly: array of { day: number (0-6), hour: number (0-23) }
  // For monthly: array of { day: number (1-31), hour: number (0-23) }
  schedule: number[] | { day: number; hour: number }[];
  isActive: boolean;
  createdAt: Date;
  lastTriggered?: Date;
} 