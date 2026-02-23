# SquadCheck

A social accountability app built with React Native (Expo) and Firebase. Create challenges, check in daily or weekly, and hold your squad accountable.

## What is SquadCheck?

SquadCheck helps you and your friends stay on track with goals through group accountability. Users can:

- **Create and join groups** with friends for shared challenges
- **Run four challenge types** — Standard, Elimination, Progress, and Deadline
- **Submit check-ins** with photos, numbers, text, or timers as proof
- **Earn XP and level up** through 50 levels across 10 title tiers
- **Build streaks** for bonus rewards and earn streak shields
- **Unlock achievements** for milestones like total check-ins, streaks, and wins
- **Chat in groups** with real-time messaging and check-in updates
- **Track progress** via a calendar view and challenge history

## Tech Stack

- **Frontend**: React Native with Expo (~50)
- **Backend**: Firebase (Auth, Firestore, Storage, Cloud Functions)
- **State Management**: React Hooks + Context (no external state library)
- **Navigation**: React Navigation (stack-based)
- **Animations**: React Native Reanimated
- **Icons**: Ionicons + Lucide React Native
- **Avatars**: DiceBear API
- **Language**: TypeScript throughout

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI (`npx expo`)
- iOS Simulator (Mac) or Android Studio

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd SquadCheck
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Set up Firebase**
   - Create a Firebase project at [firebase.google.com](https://firebase.google.com)
   - Enable Authentication (Email/Password), Firestore, and Storage
   - Add your Firebase config to `src/services/firebase.ts`
   - Deploy Firestore rules: `firebase deploy --only firestore:rules`
   - Deploy Cloud Functions: `cd functions && npm install && cd .. && firebase deploy --only functions`

4. **Start the development server**
   ```bash
   yarn start
   ```

5. **Run on device/simulator**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go on your phone

## Project Structure

```
src/
├── components/
│   ├── challenge/      # ChallengeCarouselCard, StatusCard, HistoryStrip, CheckInComposer, MemberStatusList
│   ├── common/         # Avatar, Button, Input, Modals, CountdownTimer, CheckInSuccessModal
│   └── group/          # ChatMessage, ChatTab, LeaderboardTab, SettingsTab, GroupHeader
├── constants/          # achievements, gamification (XP/levels), calendar, theme
├── contexts/           # App-level context providers
├── navigation/         # AppNavigator (React Navigation stack)
├── screens/
│   ├── auth/           # Login, SignUp, Onboarding, EmailConfirmation
│   ├── challenge/      # ChallengeDetail, CheckIn, ChallengeGallery
│   └── main/           # Home, Groups, Social, Calendar, Settings, CreateChallenge, Profile, Levels, Achievements, etc.
├── services/           # Firebase service classes (auth, challenge, checkIn, group, message, gamification, achievement, notification, friendship, reminder)
├── theme/              # ColorModeContext (light/dark mode)
├── types/              # TypeScript type definitions
└── utils/              # dueTime (timezone), challengeEval, dateKeys, calendarGrid
functions/
└── src/                # Cloud Functions — 5-min scheduler for eliminations, deadlines, missed check-ins
```

## Challenge Types

| Type | Description |
|---|---|
| **Standard** | Simple daily or weekly check-ins. No penalties for missing. |
| **Elimination** | Miss a check-in and get a strike. Too many strikes and you're eliminated. Last one standing wins. |
| **Progress** | Targets increase over time (e.g., run further each week). |
| **Deadline** | Reach a goal by a specific date. Check in as many times as needed before the deadline. |

## Gamification

- **XP System**: 10 XP per check-in + on-time bonus (+5 XP) + streak bonuses
- **50 Levels**: 10 title tiers from Rookie to Legend
- **Streaks**: Consecutive check-in tracking with milestones at 7, 14, 30, 60, and 100 days
- **Streak Shields**: Earned every 7-day streak, protects against a missed check-in in elimination challenges
- **Achievements**: Unlocked by reaching milestones (total check-ins, streaks, wins, groups)
- **Daily Complete Bonus**: 2x XP when all daily challenges are completed

## Key Architecture Decisions

- **Timezone model**: IANA timezone string stored on each challenge at creation. Due times are wall-clock in the admin's timezone. All UTC conversions use `Intl.DateTimeFormat` — no external date libraries.
- **Period keys**: Daily = `YYYY-MM-DD`, Weekly = week-start date as `YYYY-MM-DD`
- **Cloud Functions**: A 5-minute scheduler evaluates eliminations, deadline outcomes, and missed check-ins server-side with idempotency tracking via `challengeEvalLog`.
- **No external state manager**: Local React state + Firebase real-time listeners.

## Building for Production

```bash
# Build with EAS
eas build --platform ios
eas build --platform android
```

## License

This project is licensed under the MIT License.
