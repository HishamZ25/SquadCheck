# Deploy Firestore Rules

You're getting permission errors because the Firestore rules haven't been deployed yet.

## Quick Fix (Option 1): Manual Deployment via Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Firestore Database** → **Rules**
4. Copy the contents of `firestore.rules` and paste into the editor
5. Click **Publish**

## Full Setup (Option 2): Using Firebase CLI

### 1. Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Login to Firebase

```bash
firebase login
```

### 3. Initialize Firebase (if not already done)

```bash
firebase init
```

Select:
- Firestore (Rules and Indexes)
- Use existing project
- Accept default files (firestore.rules, firestore.indexes.json)

### 4. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

### 5. Deploy Firestore Indexes (optional but recommended)

```bash
firebase deploy --only firestore:indexes
```

## Verify Deployment

After deploying, test your app again. The permission errors should be resolved.

## What the rules allow:

- **Messages**: Authenticated users can read messages. Users can create messages only if they're members of the target group.
- **Groups**: Authenticated users can read groups. Members can update/delete.
- **Users**: Authenticated users can read any user profile. Users can only write their own profile.
- **Friendships**: Authenticated users can read. Users can create/update/delete friendships they're part of.
- **Challenges**: Participants and group members can read. Creator can update/delete.
- **Check-ins**: Authenticated users can read. Users can create their own check-ins.
- **Group Invitations**: Inviter and invitee can read/manage.
- **Reminders**: Users can only access their own reminders.
