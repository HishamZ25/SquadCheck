# SquadCheck Cloud Functions

## processMissedCheckIns (scheduled)

Runs **every hour** on Firebase’s servers so it works even when the app is closed.

For each group and its challenges it:

1. Computes the **previous** check-in period (yesterday for daily, last week for weekly) using the challenge’s due time and timezone.
2. Finds **active** challenge members who have **no completed** check-in for that period (= missed).
3. For each missed user, if we haven’t already notified for that `(group, challenge, user, period)`:
   - Posts a message in the group chat: **“[Display name] has missed the check in.”** (sender: SquadCheck).
   - Writes a doc in `missedCheckInNotified` so we don’t post again.

So messages are sent automatically when users miss a check-in, without anyone having to open the app.

---

## Do I need the Blaze plan?

**Yes, for the scheduled function.** Cloud Scheduler (which triggers the job every hour) only runs on the Blaze (pay-as-you-go) plan. Cost is usually small: a few dollars or less per month for one hourly job and the function invocations.

**On the free (Spark) plan:** The in-app logic in `GroupChatScreen` still runs when someone opens the group chat, so “X has missed the check in” can still be posted when the app is opened—just not automatically when the app is closed.

---

## Deploy (no container needed)

Firebase runs your function in their environment; you don’t need Docker or a container.

### Option A: Deploy from GitHub (recommended)

Push to `main` and the workflow in `.github/workflows/deploy-functions.yml` will deploy for you. No need to deploy from your laptop.

**One-time setup:**

1. **Blaze plan:** In [Firebase Console](https://console.firebase.google.com) → your project → Upgrade to Blaze (if you want the hourly automation).
2. **CI token:** On your machine (one time):
   ```bash
   npx firebase login:ci
   ```
   Copy the token it prints.
3. **GitHub secret:** In your repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**  
   - Name: `FIREBASE_TOKEN`  
   - Value: paste the token from step 2.

After that, every push to `main` that touches `functions/` or `firebase.json` will deploy. You can also run **Actions → Deploy Cloud Functions → Run workflow** manually.

### Option B: Deploy from your machine

From the project root:

```bash
firebase deploy --only functions
```

You still need the Blaze plan for the scheduled job to run.
