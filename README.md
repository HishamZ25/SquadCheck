# SquadCheck 🏃‍♂️

A social accountability app built with React Native (Expo) and Firebase that helps users achieve their goals through group support and photo check-ins.

## 🎯 What is SquadCheck?

SquadCheck is a mobile app that combines social accountability with visual proof. Users can:

- **Join or create accountability groups** for team goals or solo challenges
- **Submit photo check-ins** to prove they're working toward their goals
- **Get verified by group members or AI** to ensure accountability
- **Earn rewards and badges** for consistent progress
- **Build lasting habits** through community support

## 🛠 Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Firebase (Auth, Firestore, Storage)
- **AI Integration**: OpenAI GPT-4 Vision (optional)
- **State Management**: React Hooks + Context
- **Navigation**: React Navigation
- **UI Components**: Custom design system with React Native Paper

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (for iOS development) or Android Studio (for Android)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd SquadCheck
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up Firebase**
   - Create a new Firebase project at [firebase.google.com](https://firebase.google.com)
   - Enable Authentication, Firestore, and Storage
   - Download your `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)
   - Update `src/services/firebase.ts` with your Firebase config

4. **Set up OpenAI (Optional)**
   - Get an API key from [openai.com](https://openai.com)
   - Update the AI service configuration in `src/services/aiService.ts`

5. **Start the development server**
   ```bash
   npm start
   # or
   yarn start
   ```

6. **Run on device/simulator**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on your phone

## 📱 App Structure

```
src/
├── components/          # Reusable UI components
│   └── common/         # Button, Input, Avatar, etc.
├── screens/            # App screens
│   ├── auth/          # Login, SignUp
│   └── main/          # Home, Groups, Chat, Profile
├── services/           # Firebase and API services
├── types/              # TypeScript type definitions
├── constants/          # Colors, theme, configuration
├── hooks/              # Custom React hooks
└── utils/              # Helper functions
```

## 🔧 Configuration

### Firebase Setup

1. **Authentication**
   - Enable Email/Password authentication
   - Configure user profile fields

2. **Firestore Rules**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Users can read/write their own data
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
       
       // Group members can read/write group data
       match /groups/{groupId} {
         allow read, write: if request.auth != null && 
           resource.data.members[request.auth.uid] != null;
       }
       
       // Check-ins can be read by group members, written by users
       match /check-ins/{checkInId} {
         allow read: if request.auth != null && 
           get(/databases/$(database)/documents/groups/$(resource.data.groupId)).data.members[request.auth.uid] != null;
         allow write: if request.auth != null && 
           request.auth.uid == resource.data.userId;
       }
     }
   }
   ```

3. **Storage Rules**
   ```javascript
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /check-ins/{groupId}/{fileName} {
         allow read: if request.auth != null;
         allow write: if request.auth != null && 
           request.auth.uid == fileName.split('_')[1];
       }
     }
   }
   ```

## 🎨 Customization

### Theme & Colors

Edit `src/constants/colors.ts` and `src/constants/theme.ts` to customize:
- Color palette
- Typography
- Spacing
- Shadows
- Border radius

### Components

All UI components are built with a consistent design system. Modify them in `src/components/common/` to match your brand.

## 📋 MVP Features

### ✅ Implemented
- User authentication (sign up/login)
- Group creation and management
- Photo check-in system
- Manual verification by group members
- Real-time updates with Firebase
- Responsive UI with custom components

### 🚧 Coming Soon
- AI-powered image verification
- Reward and badge system
- Push notifications
- Group invitations
- Progress tracking and analytics

## 🧪 Testing

```bash
# Run linting
npm run lint

# Type checking
npm run type-check

# Start development server
npm start
```

## 📦 Building for Production

```bash
# Build for iOS
expo build:ios

# Build for Android
expo build:android

# Build for web
expo build:web
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the code comments and this README
- **Issues**: Create an issue in the GitHub repository
- **Questions**: Reach out to the development team

## 🎯 Roadmap

### Phase 1 (Current - MVP)
- [x] User authentication
- [x] Group creation and management
- [x] Photo check-ins
- [x] Manual verification
- [x] Basic UI/UX

### Phase 2 (Next)
- [ ] AI image verification
- [ ] Reward system
- [ ] Push notifications
- [ ] Group invitations
- [ ] Progress tracking

### Phase 3 (Future)
- [ ] Social features
- [ ] Advanced analytics
- [ ] Integration with fitness apps
- [ ] Public groups and discovery
- [ ] Gamification elements

---

**Built with ❤️ for accountability and personal growth**
