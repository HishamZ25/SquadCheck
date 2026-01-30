# Schema Update Summary

## ✅ What's Been Updated

### 1. TypeScript Types (`src/types/index.ts`)
- ✅ Updated `Group` interface to simplified schema
- ✅ Completely replaced `Challenge` interface with new comprehensive schema
- ✅ Added new `CheckIn` interface (source of truth for status)
- ✅ Added new `ChallengeMember` interface (tracks elimination/strikes)
- ✅ Removed old conflicting interfaces

### 2. Home Screen UI (`src/screens/main/HomeScreen.tsx`)
- ✅ Challenge cards redesigned with new layout:
  - Title with solo/group icon on right
  - Description below
  - Status line at bottom showing challenge state
- ✅ Fixed margins to be consistent between groups and challenges
- ✅ Added `getChallengeStatus()` helper function
- ✅ Updated card styling

### 3. Test Data Script (`scripts/populateTestData.js`)
- ✅ Updated `createGroups()` to use simplified schema
- ✅ Completely rewrote `createChallenges()` to:
  - Create challenges with new schema
  - Create `ChallengeMember` records for all participants
  - Create sample `CheckIn` records
- ✅ Removed old challenge templates
- ✅ Added 2 sample challenges with different types

## 📋 What You Need to Do Next

### Step 1: Update Firebase Console
You need to deploy the updated Firestore rules and create indexes.

#### A. Update Firestore Rules
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Firestore Database** → **Rules**
4. Add these new rules for the new collections:

```javascript
// CheckIns
match /checkIns/{checkInId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
  allow update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
}

// ChallengeMembers
match /challengeMembers/{memberId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
  allow update: if request.auth != null;
  allow delete: if request.auth != null && request.auth.uid == resource.data.userId;
}
```

#### B. Create Firestore Indexes
Go to **Firestore Database** → **Indexes** → **Create Index**

**Index 1: CheckIns by Challenge and User**
- Collection: `checkIns`
- Fields:
  1. `challengeId` - Ascending
  2. `userId` - Ascending
  3. `createdAt` - Descending

**Index 2: ChallengeMember by User**
- Collection: `challengeMembers`
- Fields:
  1. `userId` - Ascending
  2. `state` - Ascending

### Step 2: Clean Up Old Data (Recommended)
Since the schema has changed significantly, you should:

1. **Backup** any important data (if needed)
2. **Delete old challenge documents** in Firebase Console
3. **Update existing groups** to remove `challengeIds`, `description`, `status` fields
4. Run the updated test data script:
   ```bash
   npm run populate-test-data
   ```

### Step 3: Update Challenge Service
The `challengeService.ts` will need updates to work with the new schema:

- Update `getUserChallenges()` to fetch from `challengeMembers` collection
- Remove methods that reference old fields (`participantIds`, `userProgress`, etc.)
- Add methods to query `checkIns` for status information
- Add methods to manage `challengeMembers`

### Step 4: Implement Status Logic
The `getChallengeStatus()` function in HomeScreen currently returns placeholder data. You'll need to:

1. Query actual `CheckIn` documents for the user
2. Calculate real status based on:
   - Challenge type
   - Cadence requirements
   - Due times
   - Recent check-ins
3. Update the display logic

## 🎯 Benefits of New Schema

### Cleaner Separation of Concerns
- **Groups**: Just user collections (no challenge logic)
- **Challenges**: Pure configuration (no progress data)
- **CheckIns**: All submission data in one place
- **ChallengeMembers**: Participation and elimination tracking

### Better Scalability
- Check-ins can be queried independently
- Progress calculation happens on-demand
- No nested data structures
- Easier to add new challenge types

### More Flexibility
- Rich submission types (boolean, number, text, timer)
- Complex cadence rules (daily, weekly with counts)
- Progressive challenges with increasing requirements
- Elimination rules with configurable strikes

## 📝 New Challenge Types Explained

### 1. **Standard**
- Simple daily/weekly tasks
- No special rules
- Just complete the requirement

### 2. **Progress**
- Requirements increase over time
- Example: Week 1: 10 pushups, Week 2: 15 pushups, etc.

### 3. **Elimination**
- Miss requirements = strikes
- Configurable strikes before elimination
- Can be instant (0 strikes) or forgiving

### 4. **Deadline**
- Must reach target by specific date
- Can accumulate progress or use latest value
- Useful for goals like "Run 100km by end of month"

## 🚀 Next Development Tasks

1. ✅ Update UI to show new challenge cards
2. ⏳ Update challengeService.ts
3. ⏳ Implement check-in submission flow
4. ⏳ Implement status calculation logic
5. ⏳ Create challenge detail screen
6. ⏳ Implement elimination logic
7. ⏳ Add progress tracking visualization

## 📚 Documentation

See `SCHEMA_MIGRATION_GUIDE.md` for detailed migration instructions and examples.
