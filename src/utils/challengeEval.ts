/**
 * Challenge evaluation and status computation utilities
 */

import { dateKeys } from './dateKeys';

type ChallengeType = "standard" | "progress" | "elimination" | "deadline";
type CadenceUnit = "daily" | "weekly";

type Challenge = {
  id: string;
  type: ChallengeType;
  cadence: {
    unit: CadenceUnit;
    requiredCount?: number;
    weekStartsOn?: 0|1|2|3|4|5|6;
  };
  due: {
    dueTimeLocal?: string;
    deadlineDate?: string;
  };
  rules?: {
    progress?: {
      startsAt: number;
      increaseBy: number;
      comparison: "gte" | "lte";
    };
    elimination?: {
      strikesAllowed: number;
      eliminateOn: "miss" | "failedRequirement";
    };
    deadline?: {
      targetValue?: number;
      comparison?: "gte" | "lte";
      progressMode: "accumulate" | "latest";
    };
  };
  createdAt: number;
};

type CheckIn = {
  id: string;
  challengeId: string;
  userId: string;
  period: {
    unit: CadenceUnit;
    dayKey?: string;
    weekKey?: string;
  };
  payload: {
    booleanValue?: boolean;
    numberValue?: number;
    textValue?: string;
    timerSeconds?: number;
  };
  status: "completed" | "pending" | "missed" | "failed";
  computed?: { targetValue?: number; metRequirement?: boolean };
  createdAt: number;
};

type ChallengeMember = {
  challengeId: string;
  userId: string;
  state: "active" | "eliminated";
  strikes: number;
  eliminatedAt?: number;
};

export type UserStatus = 
  | { type: 'completed'; timestamp: number; checkIn: CheckIn }
  | { type: 'pending'; timeRemaining: string }
  | { type: 'missed'; missedAt: string }
  | { type: 'eliminated'; strikes: number };

export const challengeEval = {
  /**
   * Get current user's status for the current period
   */
  getUserStatus(
    challenge: Challenge,
    userId: string,
    checkInsForCurrentPeriod: CheckIn[],
    challengeMembers: ChallengeMember[],
    selectedPeriodKey?: string // Optional: if viewing a specific historical period
  ): UserStatus {
    // Check if user is eliminated
    const member = challengeMembers.find(m => m.userId === userId);
    if (member?.state === 'eliminated') {
      return {
        type: 'eliminated',
        strikes: member.strikes,
      };
    }

    // Get current period key
    const currentDayKey = dateKeys.getDayKey();
    const currentWeekKey = dateKeys.getWeekKey(new Date(), challenge.cadence.weekStartsOn);
    const currentPeriodKey = challenge.cadence.unit === 'daily' ? currentDayKey : currentWeekKey;
    
    // Use selected period if provided (for historical view), otherwise use current
    const periodKey = selectedPeriodKey || currentPeriodKey;
    const isCurrentPeriod = periodKey === currentPeriodKey;

    // Get user's check-ins for this period
    const myCheckIns = checkInsForCurrentPeriod.filter(ci => ci.userId === userId);

    // Check if completed
    if (challenge.cadence.unit === 'daily') {
      const completedCheckIn = myCheckIns.find(ci => ci.status === 'completed');
      if (completedCheckIn) {
        return {
          type: 'completed',
          timestamp: completedCheckIn.createdAt,
          checkIn: completedCheckIn,
        };
      }
    } else {
      // Weekly
      const completedCount = myCheckIns.filter(ci => ci.status === 'completed').length;
      const requiredCount = challenge.cadence.requiredCount || 1;
      
      if (completedCount >= requiredCount) {
        const lastCompleted = myCheckIns
          .filter(ci => ci.status === 'completed')
          .sort((a, b) => b.createdAt - a.createdAt)[0];
        
        return {
          type: 'completed',
          timestamp: lastCompleted.createdAt,
          checkIn: lastCompleted,
        };
      }
    }

    // Check if the period is before the challenge creation date
    const challengeCreatedAt = typeof challenge.createdAt === 'number' 
      ? new Date(challenge.createdAt) 
      : challenge.createdAt;
    
    if (challenge.cadence.unit === 'daily') {
      const periodDate = new Date(periodKey); // periodKey is YYYY-MM-DD
      const creationDate = new Date(challengeCreatedAt);
      creationDate.setHours(0, 0, 0, 0);
      
      if (periodDate < creationDate) {
        // Period is before challenge was created - show as not started
        return {
          type: 'pending',
          timeRemaining: 'Not started yet',
        };
      }
    }

    // Check if viewing a past period (not current)
    if (!isCurrentPeriod) {
      // Past period without completion = missed
      const dueTime = challenge.due?.dueTimeLocal || '23:59';
      return {
        type: 'missed',
        missedAt: dateKeys.format12Hour(dueTime),
      };
    }

    // For current period: Check if due has passed
    const duePassed = this.isDuePassed(challenge, periodKey);

    if (duePassed) {
      const dueTime = challenge.due.dueTimeLocal || '23:59';
      return {
        type: 'missed',
        missedAt: dateKeys.format12Hour(dueTime),
      };
    }

    // Still pending
    const timeRemaining = dateKeys.getTimeRemaining(challenge.due.dueTimeLocal);
    return {
      type: 'pending',
      timeRemaining,
    };
  },

  /**
   * Check if due has passed for current period
   */
  isDuePassed(challenge: Challenge, currentPeriodKey: string): boolean {
    if (challenge.cadence.unit === 'daily') {
      return dateKeys.isDueTimePassed(challenge.due.dueTimeLocal);
    } else {
      // Weekly: due passed if we're in a different week
      const currentWeekKey = dateKeys.getWeekKey(new Date(), challenge.cadence.weekStartsOn);
      return currentWeekKey !== currentPeriodKey;
    }
  },

  /**
   * Compute target for progress challenges
   */
  computeProgressTarget(challenge: Challenge): number | null {
    if (challenge.type !== 'progress' || !challenge.rules?.progress) {
      return null;
    }

    const { startsAt, increaseBy } = challenge.rules.progress;
    const currentWeekKey = dateKeys.getWeekKey(new Date(), challenge.cadence.weekStartsOn);
    const weeksElapsed = dateKeys.getWeeksElapsed(
      challenge.createdAt,
      currentWeekKey,
      challenge.cadence.weekStartsOn
    );

    return startsAt + (weeksElapsed * increaseBy);
  },

  /**
   * Check if progress requirement is met
   */
  meetsProgressRequirement(
    challenge: Challenge,
    submittedValue: number,
    target: number
  ): boolean {
    if (!challenge.rules?.progress) return true;

    const comparison = challenge.rules.progress.comparison;
    if (comparison === 'gte') {
      return submittedValue >= target;
    } else {
      return submittedValue <= target;
    }
  },

  /**
   * Get member status for current period
   */
  getMemberStatus(
    challenge: Challenge,
    userId: string,
    checkInsForCurrentPeriod: CheckIn[],
    challengeMembers: ChallengeMember[],
    selectedPeriodKey?: string
  ): 'completed' | 'pending' | 'missed' | 'eliminated' {
    const status = this.getUserStatus(
      challenge, 
      userId, 
      checkInsForCurrentPeriod, 
      challengeMembers,
      selectedPeriodKey
    );
    return status.type;
  },

  /**
   * Get check-in count for weekly challenges
   */
  getWeeklyCheckInCount(
    userId: string,
    checkInsForCurrentPeriod: CheckIn[]
  ): { completed: number; required: number } {
    const userCheckIns = checkInsForCurrentPeriod.filter(ci => ci.userId === userId);
    const completed = userCheckIns.filter(ci => ci.status === 'completed').length;
    
    return { completed, required: 1 }; // Default required is 1, but should come from challenge
  },

  /**
   * Format timestamp for display
   */
  formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = dateKeys.getDayKey(date) === dateKeys.getDayKey(now);
    
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = String(minutes).padStart(2, '0');
    
    if (isToday) {
      return `Today at ${displayHours}:${displayMinutes} ${ampm}`;
    } else {
      const monthDay = dateKeys.formatDate(dateKeys.getDayKey(date));
      return `${monthDay} at ${displayHours}:${displayMinutes} ${ampm}`;
    }
  },
};
