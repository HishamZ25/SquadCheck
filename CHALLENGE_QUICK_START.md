# Challenge Detail Screen - Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Add to Navigation (2 minutes)

In your `AppNavigator.tsx` or wherever you define routes:

```typescript
import { ChallengeDetailScreen } from './src/screens/challenge/ChallengeDetailScreen';

// Add to your Stack Navigator
<Stack.Screen 
  name="ChallengeDetail" 
  component={ChallengeDetailScreen}
  options={{ headerShown: false }}
/>
```

### Step 2: Test with Mock Data (1 minute)

Use the demo to test immediately:

```typescript
import { generateMockChallengeData } from './src/screens/challenge/ChallengeDetailDemo';

// In any screen:
const testChallenge = () => {
  const mockData = generateMockChallengeData('standard');
  navigation.navigate('ChallengeDetail', mockData);
};
```

### Step 3: Wire to Real Data (10 minutes)

When clicking a challenge card on HomeScreen:

```typescript
import { dateKeys } from './src/utils/dateKeys';

const handleChallengePress = async (challengeId: string) => {
  // 1. Fetch challenge
  const challengeDoc = await getDoc(doc(db, 'challenges', challengeId));
  const challenge = { id: challengeDoc.id, ...challengeDoc.data() };
  
  // 2. Fetch group
  const groupDoc = await getDoc(doc(db, 'groups', challenge.groupId));
  const group = { id: groupDoc.id, ...groupDoc.data() };
  
  // 3. Get current period key
  const currentPeriodKey = challenge.cadence.unit === 'daily' 
    ? dateKeys.getDayKey() 
    : dateKeys.getWeekKey(new Date(), challenge.cadence.weekStartsOn);
  
  // 4. Fetch check-ins for current period
  const checkInsQuery = query(
    collection(db, 'checkIns'),
    where('challengeId', '==', challengeId),
    where(`period.${challenge.cadence.unit}Key`, '==', currentPeriodKey)
  );
  const checkInsSnapshot = await getDocs(checkInsQuery);
  const checkInsForCurrentPeriod = checkInsSnapshot.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));
  
  // 5. Fetch recent check-ins for history
  const recentDays = challenge.cadence.unit === 'daily' ? 7 : 28;
  const recentCheckInsQuery = query(
    collection(db, 'checkIns'),
    where('challengeId', '==', challengeId),
    where('userId', '==', currentUserId),
    orderBy('createdAt', 'desc'),
    limit(recentDays)
  );
  const recentSnapshot = await getDocs(recentCheckInsQuery);
  const myRecentCheckIns = recentSnapshot.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));
  
  // 6. Fetch challenge members (optional, for elimination)
  const membersQuery = query(
    collection(db, 'challengeMembers'),
    where('challengeId', '==', challengeId)
  );
  const membersSnapshot = await getDocs(membersQuery);
  const challengeMembers = membersSnapshot.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));
  
  // 7. Fetch member profiles (optional)
  const memberProfiles = {};
  for (const memberId of group.memberIds) {
    const userDoc = await getDoc(doc(db, 'users', memberId));
    if (userDoc.exists()) {
      memberProfiles[memberId] = {
        name: userDoc.data().displayName,
        avatarUri: userDoc.data().photoURL,
      };
    }
  }
  
  // 8. Navigate!
  navigation.navigate('ChallengeDetail', {
    challenge,
    group,
    currentUserId,
    checkInsForCurrentPeriod,
    myRecentCheckIns,
    challengeMembers,
    memberProfiles,
  });
};
```

## 🔧 Implement Check-In Submission

In your `ChallengeDetailScreen.tsx`, wire up the submission callback:

```typescript
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { CheckInDraft } from './src/components/challenge/CheckInComposer';

const handleSubmitCheckIn = async (draft: CheckInDraft) => {
  try {
    const periodKey = challenge.cadence.unit === 'daily'
      ? dateKeys.getDayKey()
      : dateKeys.getWeekKey(new Date(), challenge.cadence.weekStartsOn);
    
    await addDoc(collection(db, 'checkIns'), {
      challengeId: challenge.id,
      groupId: challenge.groupId,
      userId: currentUserId,
      period: {
        unit: challenge.cadence.unit,
        dayKey: challenge.cadence.unit === 'daily' ? periodKey : undefined,
        weekKey: challenge.cadence.unit === 'weekly' ? periodKey : undefined,
      },
      payload: {
        booleanValue: draft.booleanValue,
        numberValue: draft.numberValue,
        textValue: draft.textValue,
        timerSeconds: draft.timerSeconds,
      },
      attachments: draft.attachments,
      status: 'completed',
      createdAt: Date.now(),
    });
    
    Alert.alert('Success', 'Check-in submitted!');
    navigation.goBack(); // Or refresh data
  } catch (error) {
    console.error('Error submitting check-in:', error);
    Alert.alert('Error', 'Failed to submit check-in');
  }
};
```

## 📱 Optional: Add to HomeScreen

Update your challenge card onPress:

```typescript
// In HomeScreen.tsx, in renderChallengeItem:
<TouchableOpacity
  style={styles.challengeCard}
  onPress={() => handleChallengePress(item.id)} // Add this handler
>
  {/* existing card content */}
</TouchableOpacity>
```

## 🎨 Customization

### Change Accent Color
In all component files, search for `#FF6B35` and replace with your brand color.

### Adjust Card Styling
All cards use these common styles:
- `borderRadius: 12`
- `padding: 16`
- `borderWidth: 1`
- `borderColor: '#E0E0E0'`

### Modify Status Icons
In `StatusCard.tsx`, update the emoji or icon configurations.

## 🐛 Troubleshooting

### "Cannot find module" errors
Make sure you created all files in the correct directories:
- `src/screens/challenge/`
- `src/components/challenge/`
- `src/utils/`

### Status not showing correctly
Check that your check-ins have the correct `period` structure:
```typescript
period: {
  unit: 'daily' | 'weekly',
  dayKey: 'YYYY-MM-DD',     // for daily
  weekKey: 'YYYY-MM-DD',    // for weekly (week start date)
}
```

### History not displaying
Ensure `myRecentCheckIns` is an array with check-ins that have:
- Correct `period.dayKey` or `period.weekKey`
- Valid `status` field
- `createdAt` timestamp

## 📚 Documentation

- **Full Guide**: `CHALLENGE_DETAIL_README.md`
- **Type Reference**: `CHALLENGE_TYPES_REFERENCE.md`
- **Implementation Summary**: `CHALLENGE_DETAIL_SUMMARY.md`

## ✅ Checklist

- [ ] Added ChallengeDetailScreen to navigator
- [ ] Tested with mock data using Demo
- [ ] Fetched real data from Firestore
- [ ] Implemented check-in submission
- [ ] Tested all 4 challenge types
- [ ] Tested all 4 input types
- [ ] Verified status computation
- [ ] Checked history display
- [ ] Tested member status list
- [ ] Added error handling

## 🎉 You're Done!

Your Challenge Detail Screen is now fully functional. Users can:
- ✅ View challenge details and rules
- ✅ See their current status
- ✅ Submit check-ins with validation
- ✅ View group members' status
- ✅ Browse their history
- ✅ Track progress over time

Need help? Check the full documentation files or review the example code in `ChallengeDetailDemo.tsx`.
