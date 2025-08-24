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
  createdAt: Date;
  lastActive: Date;
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

export interface Group {
  id: string;
  name: string;
  goal: string;
  requirements: string[];
  rewards: {
    points: number;
    title?: string;
    picture?: string;
    badge?: string;
  };
  penalty?: number;
  creatorId: string;
  memberIds: string[];
  createdAt: Date;
  status: 'active' | 'completed' | 'cancelled';
  groupType: 'team' | 'solo';
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

export interface CheckIn {
  id: string;
  userId: string;
  groupId: string;
  goalId: string;
  imageURL: string;
  caption?: string;
  timestamp: Date;
  status: 'pending' | 'approved' | 'rejected' | 'ai-verified';
  verifiedBy?: string;
  verificationTimestamp?: Date;
  aiVerdict?: AIVerdict;
  disputes: Dispute[];
}

export interface AIVerdict {
  isApproved: boolean;
  confidence: number;
  reasoning: string;
  timestamp: Date;
}

export interface Dispute {
  id: string;
  userId: string;
  reason: string;
  timestamp: Date;
  isResolved: boolean;
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