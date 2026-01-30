# Test Data Population Script

This script populates your Firebase project with test data including users, friendships, groups, and challenges.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Get Firebase Service Account Key:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project: `squadcheck-30ece`
   - Go to **Project Settings** > **Service Accounts**
   - Click **"Generate New Private Key"**
   - Save the downloaded JSON file as `scripts/serviceAccountKey.json`

3. **Run the script:**
   ```bash
   npm run populate-test-data
   ```

## What Gets Created

### Users (6 total)
All users are friends with each other:
- alice@test.com / Test123!
- bob@test.com / Test123!
- charlie@test.com / Test123!
- diana@test.com / Test123!
- eve@test.com / Test123!
- frank@test.com / Test123!

### Groups (5 total)
1. **Fitness Squad** - Alice, Diana, Eve
2. **Code Warriors** - Bob, Charlie, Frank
3. **Morning Champions** - Alice, Eve, Frank
4. **Wellness Circle** - Charlie, Diana, Alice, Bob
5. **Productivity Pros** - Eve, Frank, Bob, Diana

### Challenges
- **3 Solo Challenges** (one for Alice, Bob, and Charlie)
- **3 Group Challenges** (one for each of the first 3 groups)

## Notes

- The script is idempotent - you can run it multiple times safely
- Existing users won't be recreated
- All users have the same password: `Test123!`
- All friendships are automatically accepted
- All challenges are set to "active" status

## Troubleshooting

If you get an error about the service account key:
- Make sure the file is named exactly `serviceAccountKey.json`
- Make sure it's in the `scripts/` folder
- Check that the JSON file is valid
