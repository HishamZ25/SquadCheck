# Schema Migration Guide

## Overview
This guide explains how to migrate from the old schema to the new simplified schema.

## Changes Summary

### 1. **Group** - Simplified
**Old Schema:**
```typescript
{
  id, name, description, creatorId, memberIds, 
  challengeIds, createdAt, status
}
```

**New Schema:**
```typescript
{
  id, name, memberIds, createdBy, createdAt
}
```

**Migration Steps:**
- Remove `description`, `challengeIds`, and `status` fields
- Rename `creatorId` to `createdBy`
- Challenges now reference groups via `groupId` instead

### 2. **Challenge** - Complete Redesign
**New Schema** includes:
- `type`: 'standard' | 'progress' | 'elimination' | 'deadline'
- `cadence`: Defines frequency (daily/weekly with requirements)
- `submission`: Defines how users check in
- `due`: Defines deadline/timing rules
- `rules`: Type-specific rules for progress/elimination/deadline
- `settings`: Additional settings like late check-ins

### 3. **CheckIn** - New Collection (Source of Truth)
- Stores all user submissions
- Links to `challengeId` and `userId`
- Contains `period` (daily/weekly tracking)
- Has `payload` for different submission types
- Includes `status`: 'completed' | 'pending' | 'missed' | 'failed'

### 4. **ChallengeMember** - New Collection
- Tracks membership and elimination
- Stores strikes for elimination challenges
- Links challenge to user participation

## Firestore Collections Structure

```
/users/{userId}
/groups/{groupId}
/challenges/{challengeId}
/checkIns/{checkInId}
/challengeMembers/{challengeMemberId}  // format: {challengeId}_{userId}
/messages/{messageId}
/groupInvitations/{invitationId}
/friendships/{friendshipId}
/reminders/{reminderId}
```

## Migration Instructions

### Option 1: Clean Migration (Recommended for Development)

1. **Backup existing data** (if needed)
2. **Delete old collections** in Firebase Console:
   - Go to Firestore Database
   - Delete old `challenges` collection
   - Keep `groups` and `users` (we'll update them)

3. **Update existing groups**:
   - Remove `challengeIds`, `description`, `status` fields
   - Rename `creatorId` → `createdBy`
   
4. **Run the updated test data script**:
   ```bash
   npm run populate-test-data
   ```

### Option 2: Data Preservation Migration

If you need to preserve existing data, you'll need to write a migration script to:
1. Transform old challenge data to new schema
2. Create CheckIn records from old userProgress
3. Create ChallengeMember records for participants

## Updated Firestore Security Rules

```javascript
// Challenges - allow authenticated users to read
match /challenges/{challengeId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null && request.auth.uid == request.resource.data.createdBy;
  allow update, delete: if request.auth != null && request.auth.uid == resource.data.createdBy;
}

// CheckIns - users can read/write their own check-ins
match /checkIns/{checkInId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
  allow update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
}

// ChallengeMembers - users can read all, write their own
match /challengeMembers/{memberId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
  allow update: if request.auth != null && 
    (request.auth.uid == resource.data.userId || 
     request.auth.uid == get(/databases/$(database)/documents/challenges/$(resource.data.challengeId)).data.createdBy);
  allow delete: if request.auth != null && request.auth.uid == resource.data.userId;
}
```

## Required Firestore Indexes

```json
{
  "indexes": [
    {
      "collectionGroup": "checkIns",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "challengeId", "order": "ASCENDING" },
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "challengeMembers",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "state", "order": "ASCENDING" }
      ]
    }
  ]
}
```

## Next Steps

1. Update TypeScript types ✅ (Already done in src/types/index.ts)
2. Update test data script (See updated populateTestData.js)
3. Update challenge service to use new schema
4. Update UI to show status from CheckIns
5. Implement check-in functionality
