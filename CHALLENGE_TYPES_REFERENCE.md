# Challenge Detail Screen - Type Definitions Reference

Quick reference for all TypeScript types used in the Challenge Detail Screen.

## Core Types

```typescript
type ChallengeType = "standard" | "progress" | "elimination" | "deadline";
type CadenceUnit = "daily" | "weekly";
type InputType = "boolean" | "number" | "text" | "timer";
type CheckInStatus = "completed" | "pending" | "missed" | "failed";
type MemberState = "active" | "eliminated";
```

## Challenge

```typescript
interface Challenge {
  id: string;
  groupId: string;
  title: string;
  description?: string;
  type: ChallengeType;

  cadence: {
    unit: CadenceUnit;
    requiredCount?: number;      // weekly: e.g. gym 3x/week
    weekStartsOn?: 0|1|2|3|4|5|6; // 0=Sunday, 1=Monday (default)
  };

  submission: {
    inputType: InputType;
    unitLabel?: string;          // "minutes", "pages", "pushups"
    minValue?: number;           // minimum value required
    requireAttachment?: boolean; // photo proof required
    attachmentTypes?: ('photo' | 'screenshot')[];
    requireText?: boolean;       // text note required
    minTextLength?: number;      // minimum text length
  };

  due: {
    dueTimeLocal?: string;       // "23:59" or "06:00"
    timezoneMode: "userLocal" | "groupLocal";
    deadlineDate?: string;       // YYYY-MM-DD if deadline challenge
  };

  rules?: {
    progress?: {
      startsAt: number;          // starting target value
      increaseBy: number;        // increase amount per week
      increaseUnit: "week";
      comparison: "gte" | "lte"; // >= or <=
    };
    elimination?: {
      strikesAllowed: number;    // number of strikes before elimination
      eliminateOn: "miss" | "failedRequirement";
    };
    deadline?: {
      targetValue?: number;      // target to reach by deadline
      comparison?: "gte" | "lte";
      progressMode: "accumulate" | "latest";
    };
  };

  createdAt: number; // ms epoch
}
```

## Group

```typescript
interface Group {
  id: string;
  name: string;
  memberIds: string[];
  createdBy: string;
  createdAt: Date;
}
```

## CheckIn

```typescript
interface CheckIn {
  id: string;
  challengeId: string;
  groupId: string;
  userId: string;

  period: {
    unit: CadenceUnit;
    dayKey?: string;   // YYYY-MM-DD
    weekKey?: string;  // week start YYYY-MM-DD
  };

  payload: {
    booleanValue?: boolean;
    numberValue?: number;
    textValue?: string;
    timerSeconds?: number; // always in seconds, even for timer input
  };

  attachments?: Array<{
    type: "photo" | "screenshot";
    uri: string;
  }>;

  status: CheckInStatus;

  computed?: {
    targetValue?: number;      // for progress challenges
    metRequirement?: boolean;  // did they meet the target?
  };

  createdAt: number; // ms epoch
}
```

## ChallengeMember

```typescript
interface ChallengeMember {
  id: string;                     // `${challengeId}_${userId}`
  challengeId: string;
  userId: string;
  state: MemberState;
  strikes: number;
  eliminatedAt?: number;          // ms epoch
  joinedAt: number;               // ms epoch
}
```

## User Status (Computed)

```typescript
type UserStatus = 
  | { type: 'completed'; timestamp: number; checkIn: CheckIn }
  | { type: 'pending'; timeRemaining: string }
  | { type: 'missed'; missedAt: string }
  | { type: 'eliminated'; strikes: number };
```

## Check-In Draft (Form Data)

```typescript
interface CheckInDraft {
  booleanValue?: boolean;
  numberValue?: number;
  textValue?: string;
  timerSeconds?: number;
  attachments?: Array<{
    type: "photo" | "screenshot";
    uri: string;
  }>;
}
```

## Member Profile (Optional)

```typescript
interface MemberProfile {
  name: string;
  avatarUri?: string;
}

type MemberProfiles = Record<string, MemberProfile>;
```

## Navigation Params

```typescript
interface ChallengeDetailParams {
  challenge: Challenge;
  group: Group;
  currentUserId: string;
  checkInsForCurrentPeriod: CheckIn[];
  myRecentCheckIns: CheckIn[];
  challengeMembers: ChallengeMember[];
  memberProfiles?: MemberProfiles;
}
```

## Date Keys

```typescript
type DayKey = string;   // Format: "YYYY-MM-DD"
type WeekKey = string;  // Format: "YYYY-MM-DD" (week start date)
```

## Examples

### Standard Daily Challenge
```typescript
const standardChallenge: Challenge = {
  id: '1',
  groupId: 'group1',
  title: 'Daily Workout',
  description: 'Complete 30 min workout',
  type: 'standard',
  cadence: { unit: 'daily' },
  submission: {
    inputType: 'boolean',
    requireAttachment: true,
  },
  due: {
    dueTimeLocal: '23:59',
    timezoneMode: 'userLocal',
  },
  createdAt: Date.now(),
};
```

### Progress Weekly Challenge
```typescript
const progressChallenge: Challenge = {
  id: '2',
  groupId: 'group1',
  title: 'Progressive Pushups',
  type: 'progress',
  cadence: {
    unit: 'weekly',
    requiredCount: 3,
    weekStartsOn: 1, // Monday
  },
  submission: {
    inputType: 'number',
    unitLabel: 'pushups',
    minValue: 10,
  },
  due: {
    dueTimeLocal: '23:59',
    timezoneMode: 'userLocal',
  },
  rules: {
    progress: {
      startsAt: 20,
      increaseBy: 5,
      increaseUnit: 'week',
      comparison: 'gte',
    },
  },
  createdAt: Date.now() - (7 * 24 * 60 * 60 * 1000),
};
```

### Elimination Challenge
```typescript
const eliminationChallenge: Challenge = {
  id: '3',
  groupId: 'group1',
  title: 'Code Streak',
  type: 'elimination',
  cadence: { unit: 'daily' },
  submission: {
    inputType: 'timer',
    minValue: 3600, // 60 minutes in seconds
  },
  due: {
    dueTimeLocal: '23:59',
    timezoneMode: 'userLocal',
  },
  rules: {
    elimination: {
      strikesAllowed: 0,
      eliminateOn: 'miss',
    },
  },
  createdAt: Date.now(),
};
```

### Deadline Challenge
```typescript
const deadlineChallenge: Challenge = {
  id: '4',
  groupId: 'group1',
  title: 'Marathon Training',
  type: 'deadline',
  cadence: {
    unit: 'weekly',
    requiredCount: 1,
  },
  submission: {
    inputType: 'number',
    unitLabel: 'miles',
  },
  due: {
    dueTimeLocal: '23:59',
    timezoneMode: 'userLocal',
    deadlineDate: '2026-02-28',
  },
  rules: {
    deadline: {
      targetValue: 100,
      comparison: 'gte',
      progressMode: 'accumulate',
    },
  },
  createdAt: Date.now(),
};
```

## Utility Functions

```typescript
// Date utilities
dateKeys.getDayKey(date?: Date): string
dateKeys.getWeekKey(date?: Date, weekStartsOn?: number): string
dateKeys.getLastNDays(n: number): string[]
dateKeys.getLastNWeeks(n: number, weekStartsOn?: number): string[]
dateKeys.isDueTimePassed(dueTimeLocal: string): boolean
dateKeys.getTimeRemaining(dueTimeLocal: string): string

// Status evaluation
challengeEval.getUserStatus(
  challenge: Challenge,
  userId: string,
  checkIns: CheckIn[],
  members: ChallengeMember[]
): UserStatus

challengeEval.computeProgressTarget(challenge: Challenge): number | null
challengeEval.meetsProgressRequirement(
  challenge: Challenge,
  value: number,
  target: number
): boolean
```

## Notes

- All timestamps are in milliseconds (epoch)
- Date keys are always local time in YYYY-MM-DD format
- Week keys represent the week start date (Monday by default)
- Timer values are stored in seconds, not minutes
- Attachments are optional even if requireAttachment is true (for flexibility)
- Member profiles are optional; will fallback to userId display
