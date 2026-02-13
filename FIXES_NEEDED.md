# Critical Fixes Needed

## ✅ DONE: Database Scripts

### 1. Cleanup Script
```bash
node scripts/cleanupAll.js
```
- Deletes ALL data (check-ins, challenges, groups, users, auth)
- Clean slate for testing

### 2. Comprehensive Test Data
```bash
node scripts/populateComprehensiveData.js
```
- 6 users across 4 US timezones (EST, PST, CST, MST)
- 3 groups with multiple members
- 7 total challenges (some with multiple per group)
- Everyone is friends with everyone
- **Tests timezone conversion!**

## 🔧 REMAINING FIXES

### 1. Timezone Logic (CRITICAL)
**Current Issue**: Two check-ins showing for same challenge with different histories

**Root Cause**: Reading logic in `challengeService.ts` needs to match writing logic

**Fix Needed in `challengeService.ts` (line ~460)**:
- Currently uses `dateKeys.getCurrentCheckInPeriod()` without timezone
- Need to pass `challenge.due.timezoneOffset` to calculate correct period
- Same timezone conversion logic as in `checkInService.ts`

**Correct Flow**:
1. Challenge created: Store creator's timezone offset (e.g., EST = 300)
2. User views challenge: Convert due time to THEIR timezone
3. User submits: Calculate period using challenge's timezone + user's offset
4. App reads: Use same timezone logic to find correct period

### 2. Calendar Integration
**Issues**:
- No real data (uses mock tasks)
- No green dots for submission days
- Navigation can be buggy with quick clicks
- Doesn't show actual challenges

**Fixes Needed**:
1. Fetch user's challenges and check-ins
2. Group check-ins by day
3. Show green dot if day has completed check-in
4. Display challenges on selected day in bottom sheet
5. Debounce navigation to prevent rapid-click bugs
6. Scroll to selected date smoothly

### 3. Duplicate Check-ins
**Issue**: Multiple check-ins created for same challenge

**Potential Causes**:
- Race condition in submission
- Cache not clearing properly
- Timezone mismatch causing wrong period key

**Debug Steps**:
1. Check console logs with `🕐 TIMEZONE DEBUG`
2. Verify `periodDayKey` matches between submit and read
3. Ensure cache clears after submission

## 📋 Testing Steps

### Test Timezone Logic:
1. Run cleanup: `node scripts/cleanupAll.js`
2. Run populate: `node scripts/populateComprehensiveData.js`
3. Login as Alice (alice@test.com, Test123!)
4. Check "Daily Workout" - shows "Due at 9:00 PM" (EST)
5. Submit check-in at 7:00 PM EST (before due time)
6. Should record for TODAY (Monday)
7. Check console for debug logs

### Test Cross-Timezone:
1. Login as Bob (bob@test.com, Test123!) - PST user
2. Check "Daily Workout" - should show "Due at 6:00 PM" (converted from EST)
3. Submit at 5:00 PM PST
4. Should record for TODAY
5. Both Alice and Bob should see each other's submissions

### Test Calendar:
1. Navigate to calendar
2. Previous/next month should work smoothly
3. Click on day -> should scroll to that day
4. (After fix) Green dot on days with submissions
5. (After fix) Show challenges for selected day

## 🎯 Priority Order

1. **HIGHEST**: Fix timezone reading logic (prevents duplicate check-ins)
2. **HIGH**: Test with new comprehensive data
3. **MEDIUM**: Calendar integration with real data
4. **LOW**: Calendar UI polish

## 🔍 Debug Commands

Watch console logs for:
```
🕐 TIMEZONE DEBUG - submitCheckIn
🕐 TIMEZONE DEBUG - getChallengeDetails
```

Compare:
- `periodDayKey` when submitting
- `currentPeriodKey` when reading
- These MUST match!
