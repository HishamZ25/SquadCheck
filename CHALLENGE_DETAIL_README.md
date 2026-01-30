# Challenge Detail Screen - Implementation Guide

## Overview

Complete UI + logic implementation for the Challenge Detail Screen. All components are ready to use - just wire them to your data sources.

## Files Created

### Core Screen
- `src/screens/challenge/ChallengeDetailScreen.tsx` - Main screen component

### Components
- `src/components/challenge/ChallengeHeader.tsx` - Header with back button, title, badges
- `src/components/challenge/RuleCard.tsx` - Shows challenge rules and requirements
- `src/components/challenge/StatusCard.tsx` - **Most prominent** - displays user's current status
- `src/components/challenge/CheckInComposer.tsx` - Input form for submitting check-ins
- `src/components/challenge/MemberStatusList.tsx` - Shows all members' status
- `src/components/challenge/HistoryStrip.tsx` - Last 7 days or 4 weeks history

### Utilities
- `src/utils/dateKeys.ts` - Date key helpers (dayKey, weekKey, etc.)
- `src/utils/challengeEval.ts` - Status computation logic

## How to Use

### 1. Navigation Setup

Add to your navigation:

```typescript
import { ChallengeDetailScreen } from './src/screens/challenge/ChallengeDetailScreen';

// In your Stack Navigator:
<Stack.Screen 
  name="ChallengeDetail" 
  component={ChallengeDetailScreen}
  options={{ headerShown: false }}
/>
```

### 2. Navigate with Data

```typescript
navigation.navigate('ChallengeDetail', {
  challenge: challengeData,
  group: groupData,
  currentUserId: userId,
  checkInsForCurrentPeriod: currentPeriodCheckIns,
  myRecentCheckIns: recentCheckIns,
  challengeMembers: members,
  memberProfiles: profilesMap,
});
```

### 3. Data Requirements

All data should be fetched beforehand and passed via route params:

```typescript
{
  challenge: Challenge;                    // Full challenge object
  group: Group;                           // Group info
  currentUserId: string;                  // Current user's ID
  checkInsForCurrentPeriod: CheckIn[];   // All check-ins for current period
  myRecentCheckIns: CheckIn[];           // User's last 7 days / 4 weeks
  challengeMembers: ChallengeMember[];   // Optional, for elimination
  memberProfiles: Record<string, {...}>; // Optional, member info
}
```

## Features Implemented

### ✅ Status Computation
- Completed: Shows ✅ with timestamp
- Pending: Shows ⏳ with time remaining
- Missed: Shows ❌ when deadline passed
- Eliminated: Shows ☠️ for eliminated users

### ✅ Input Types
All input types supported:
- **Boolean**: Simple yes/no switch
- **Number**: Numeric input with unit label and min value validation
- **Timer**: Minutes input (stored as seconds)
- **Text**: Multiline text with character count

### ✅ Challenge Types
- **Standard**: Basic check-in
- **Progress**: Computes weekly target, validates against it
- **Elimination**: Shows strikes, disables check-in when eliminated
- **Deadline**: Shows countdown, validates deadline

### ✅ Cadence Support
- **Daily**: Due time checking, shows last 7 days
- **Weekly**: Counts check-ins, shows last 4 weeks, supports partial completion (e.g., "2/3")

### ✅ Attachments
- "Add Proof" button (currently shows mock dialog)
- Displays attachment count
- Can remove attachments before submit

### ✅ History
- Daily: Last 7 days with day labels (Mon, Tue, etc.)
- Weekly: Last 4 weeks with "Wk of Jan 22" labels
- Tap to open modal with check-in details
- Shows payload summary, attachments, timestamps

### ✅ Member Status List
- Current user shown first
- Sorted by status (completed, pending, missed, eliminated)
- Shows weekly progress like "2/3" for partial completion
- Highlights current user row

### ✅ Validation
- Min value checks
- Min text length checks
- Required attachment checks
- Required text note checks

## Styling

- Clean, card-based UI
- Accent color: `#FF6B35`
- Rounded corners (12-16px)
- Subtle borders and shadows
- System-like appearance
- Consistent icon sizing

## Next Steps (Backend Integration)

To make this fully functional:

1. **Fetch Data**: Load challenge, group, check-ins, members from Firestore
2. **Submit Check-In**: Implement `onSubmitCheckIn` callback to save to Firestore
3. **Real-time Updates**: Subscribe to check-ins collection for live updates
4. **Image Upload**: Implement actual image picker and upload to Firebase Storage
5. **Notifications**: Add push notifications for due times

## Example Backend Integration

```typescript
// Fetch data before navigation
const fetchChallengeData = async (challengeId: string) => {
  const challenge = await getDoc(doc(db, 'challenges', challengeId));
  const group = await getDoc(doc(db, 'groups', challenge.groupId));
  
  const currentPeriodKey = challenge.cadence.unit === 'daily' 
    ? dateKeys.getDayKey() 
    : dateKeys.getWeekKey();
    
  const checkInsQuery = query(
    collection(db, 'checkIns'),
    where('challengeId', '==', challengeId),
    where(`period.${challenge.cadence.unit}Key`, '==', currentPeriodKey)
  );
  
  const checkInsSnapshot = await getDocs(checkInsQuery);
  // ... etc
};

// Submit check-in
const handleSubmitCheckIn = async (draft: CheckInDraft) => {
  await addDoc(collection(db, 'checkIns'), {
    challengeId: challenge.id,
    userId: currentUserId,
    groupId: challenge.groupId,
    period: {
      unit: challenge.cadence.unit,
      dayKey: challenge.cadence.unit === 'daily' ? dateKeys.getDayKey() : undefined,
      weekKey: challenge.cadence.unit === 'weekly' ? dateKeys.getWeekKey() : undefined,
    },
    payload: draft,
    status: 'completed',
    createdAt: Date.now(),
  });
};
```

## Testing

To test without backend:

1. Create mock data matching the types
2. Pass it via navigation params
3. Check-in submissions will log to console and show optimistic UI
4. All UI features will work immediately

## Design Decisions

- **Optimistic Updates**: Check-in shows as completed immediately on submit
- **No Backend Code**: Pure UI/logic layer, easily testable
- **Type Safety**: Full TypeScript with strict types
- **Modular**: Each component is independent and reusable
- **Accessible**: Clear visual hierarchy, good contrast, readable fonts
- **Performant**: Minimal re-renders, efficient computations

## Questions?

All status computation logic is in `utils/challengeEval.ts` - review this file to understand how completion, pending, and missed states are determined.

All date utilities are in `utils/dateKeys.ts` - handles day/week key generation, time remaining calculations, etc.
