# Quick Schema Reference

## Firestore Collections

### `/groups/{groupId}`
```typescript
{
  id: string
  name: string
  memberIds: string[]
  createdBy: string
  createdAt: Timestamp
}
```

### `/challenges/{challengeId}`
```typescript
{
  id: string
  groupId: string
  title: string
  description?: string
  type: "standard" | "progress" | "elimination" | "deadline"
  
  cadence: {
    unit: "daily" | "weekly"
    requiredCount?: number           // For weekly: how many times required
    weekStartsOn?: 0-6               // 0=Sunday, 1=Monday
  }
  
  submission: {
    inputType: "boolean" | "number" | "text" | "timer"
    unitLabel?: string               // "minutes", "pages"
    minValue?: number
    requireAttachment?: boolean
    attachmentTypes?: ("photo"|"screenshot")[]
    requireText?: boolean
    minTextLength?: number
  }
  
  due: {
    dueTimeLocal?: string            // "23:59" (HH:MM)
    timezoneMode: "userLocal" | "groupLocal"
    deadlineDate?: string            // "2026-02-15" (YYYY-MM-DD)
  }
  
  rules?: {
    progress?: {
      startsAt: number
      increaseBy: number
      increaseUnit: "week"
      comparison: "gte" | "lte"
    }
    elimination?: {
      strikesAllowed: number
      eliminateOn: "miss" | "failedRequirement"
    }
    deadline?: {
      targetValue?: number
      comparison?: "gte" | "lte"
      progressMode: "accumulate" | "latest"
    }
  }
  
  settings?: {
    allowLateCheckIn?: boolean
    lateGraceMinutes?: number
  }
  
  createdBy: string
  createdAt: Timestamp
  isArchived?: boolean
}
```

### `/checkIns/{checkInId}`
```typescript
{
  id: string
  groupId: string
  challengeId: string
  userId: string
  
  period: {
    unit: "daily" | "weekly"
    dayKey?: string                  // "2026-01-24"
    weekKey?: string                 // "2026-01-20" (week start)
  }
  
  payload: {
    booleanValue?: boolean           // For boolean input
    numberValue?: number             // For number/timer input
    textValue?: string               // For text input
    timerSeconds?: number            // For timer input
  }
  
  attachments?: [{
    type: "photo" | "screenshot"
    storagePath: string
    downloadUrl?: string
    width?: number
    height?: number
  }]
  
  status: "completed" | "pending" | "missed" | "failed"
  
  computed?: {
    targetValue?: number
    metRequirement?: boolean
  }
  
  createdAt: Timestamp
  updatedAt?: Timestamp
}
```

### `/challengeMembers/{challengeId}_{userId}`
```typescript
{
  id: string                         // Format: "${challengeId}_${userId}"
  challengeId: string
  groupId: string
  userId: string
  
  state: "active" | "eliminated"
  strikes: number
  eliminatedAt?: Timestamp
  lastEvaluatedPeriodKey?: string    // Last period that was checked
  
  joinedAt: Timestamp
}
```

## Example Queries

### Get user's active challenges
```typescript
const challengeMembers = await getDocs(
  query(
    collection(db, 'challengeMembers'),
    where('userId', '==', currentUserId),
    where('state', '==', 'active')
  )
);
```

### Get today's check-ins for a challenge
```typescript
const todayKey = new Date().toISOString().split('T')[0]; // "2026-01-24"
const checkIns = await getDocs(
  query(
    collection(db, 'checkIns'),
    where('challengeId', '==', challengeId),
    where('period.dayKey', '==', todayKey)
  )
);
```

### Get user's check-in status for today
```typescript
const myCheckIn = await getDocs(
  query(
    collection(db, 'checkIns'),
    where('challengeId', '==', challengeId),
    where('userId', '==', currentUserId),
    where('period.dayKey', '==', todayKey),
    limit(1)
  )
);
```

## Status Calculation Examples

### Daily Challenge
```typescript
// "Completed today at 6:12 AM"
// "Due today at 11:59 PM"
// "Due in 3h 42min"
// "Missed today"
```

### Weekly Challenge (3x per week)
```typescript
// "2/3 done this week"
// "Completed this week"
// "1/3 done - due Sunday"
```

### Deadline Challenge
```typescript
// "Due in 5 days"
// "Due tomorrow"
// "Deadline passed"
```

### Progress Challenge
```typescript
// "Week 2: 15 pushups required"
// "Completed: 12/15 pushups"
```

## Migration Checklist

- [ ] Update Firestore rules in Firebase Console
- [ ] Create required indexes
- [ ] Run updated test data script
- [ ] Update challengeService.ts
- [ ] Implement check-in submission flow
- [ ] Update status calculation logic
- [ ] Test all challenge types
