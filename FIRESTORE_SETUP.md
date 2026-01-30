# Firestore Rules & Indexes Setup

## Quick Deploy (Recommended)

If you have Firebase CLI installed:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## Manual Setup

### 1. Deploy Rules

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Firestore Database** → **Rules**
4. Copy the contents of `firestore.rules` and paste it
5. Click **Publish**

### 2. Create Indexes

Go to **Firestore Database** → **Indexes** and create these composite indexes:

#### Index 1: checkIns (for Challenge Detail queries)
- Collection: `checkIns`
- Fields:
  - `challengeId` (Ascending)
  - `createdAt` (Descending)
- Query scope: Collection

#### Index 2: challengeMembers (for user challenges query)
- Collection: `challengeMembers`
- Fields:
  - `userId` (Ascending)
  - `state` (Ascending)
- Query scope: Collection

#### Index 3: challengeMembers (for challenge members query)
- Collection: `challengeMembers`
- Fields:
  - `challengeId` (Ascending)
  - `state` (Ascending)
- Query scope: Collection

#### Index 4: messages (existing)
- Collection: `messages`
- Fields:
  - `groupId` (Ascending)
  - `createdAt` (Descending)
- Query scope: Collection

#### Index 5: groupInvitations (existing)
- Collection: `groupInvitations`
- Fields:
  - `inviteeId` (Ascending)
  - `status` (Ascending)
- Query scope: Collection

## Alternative: Wait for Firestore Errors

Firebase will automatically suggest creating indexes when you run queries that need them. You'll see an error with a clickable link to create the index.

## Key Changes in Rules

### What Was Fixed:

1. **Simplified Challenge Rules**: Removed complex `participantIds` checks since we now use `challengeMembers` collection
2. **Removed old `check-ins` collection**: Now using `checkIns` (camelCase)
3. **Better ChallengeMember update rules**: Allow system to update strikes/elimination

### Security Notes:

- All authenticated users can read challenges (they're filtered by `challengeMembers` in the app)
- Only challenge creators can update/delete challenges
- Users can only create their own check-ins
- System can update `challengeMembers` for strikes and elimination
