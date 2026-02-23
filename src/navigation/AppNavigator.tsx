import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CurvedBottomBarExpo } from 'react-native-curved-bottom-bar';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, StyleSheet, Animated, View } from 'react-native';
import { auth } from '../services/firebase';
import { useColorMode } from '../theme/ColorModeContext';

// Auth Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { SignUpScreen } from '../screens/auth/SignUpScreen';
import { EmailConfirmationScreen } from '../screens/auth/EmailConfirmationScreen';
import { OnboardingScreen } from '../screens/auth/OnboardingScreen';

// Main Screens
import { HomeScreen } from '../screens/main/HomeScreen';
import { GroupsScreen } from '../screens/main/GroupsScreen';
import { CalendarScreen } from '../screens/main/CalendarScreen';
import { GroupChatScreen } from '../screens/main/GroupChatScreen';
import { SocialScreen } from '../screens/main/SocialScreen';
import { SettingsScreen } from '../screens/main/SettingsScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { NotificationsScreen } from '../screens/main/NotificationsScreen';
import { PrivacyScreen } from '../screens/main/PrivacyScreen';
import { HelpSupportScreen } from '../screens/main/HelpSupportScreen';
import { CreateSimpleGroupScreen } from '../screens/main/CreateSimpleGroupScreen';
import { CreateChallengeScreen } from '../screens/main/CreateChallengeScreen';
import { GroupTypeScreen } from '../screens/main/GroupTypeScreen';
import { SelectGroupScreen } from '../screens/main/SelectGroupScreen';
import { StoreScreen } from '../screens/main/StoreScreen';
import { CreateReminderScreen } from '../screens/main/CreateReminderScreen';
import { InviteToGroupScreen } from '../screens/main/InviteToGroupScreen';
import { FriendProfileScreen } from '../screens/main/FriendProfileScreen';
import { AchievementsScreen } from '../screens/main/AchievementsScreen';
import { LevelsScreen } from '../screens/main/LevelsScreen';

// Challenge Screens
import { ChallengeDetailScreen } from '../screens/challenge/ChallengeDetailScreen';
import { CheckInScreen } from '../screens/challenge/CheckInScreen';
import { ChallengeGalleryScreen } from '../screens/challenge/ChallengeGalleryScreen';

export type RootStackParamList = {
  Main: undefined;
  Login: undefined;
  SignUp: undefined;
  EmailConfirmation: { email?: string };
  Onboarding: { fromSettings?: boolean };
  Settings: { user?: any };
  Profile: { user?: any };
  Notifications: undefined;
  Privacy: undefined;
  HelpSupport: undefined;
  SelectGroup: undefined;
  GroupType: { isSolo?: boolean; groupId?: string };
  CreateSimpleGroup: undefined;
  CreateChallenge: { challengeType?: string; isSolo?: boolean; groupId?: string };
  CreateReminder: undefined;
  GroupChat: { groupId: string };
  InviteToGroup: { groupId: string; groupName?: string };
  Store: undefined;
  FriendProfile: { user: any; currentUser?: any };
  Achievements: undefined;
  Levels: undefined;
  ChallengeDetail: { challengeId: string };
  CheckIn: { challengeId: string; details?: any };
  ChallengeGallery: { challengeId: string; memberIds: string[]; memberProfiles: Record<string, { name: string; avatarUri?: string }> };
};

// Create navigators
const Stack = createStackNavigator<RootStackParamList>();

// Main Tab Navigator with Curved Bottom Bar (react-native-curved-bottom-bar)
const MainTabNavigator = () => {
  const { colors, mode } = useColorMode();

  const _renderIcon = (routeName: string, selectedTab: string) => {
    let icon = '';
    switch (routeName) {
      case 'Calendar':
        icon = 'calendar-outline';
        break;
      case 'Home':
        icon = 'home';
        break;
      case 'Social':
        icon = 'people-outline';
        break;
    }

    // Light mode: original behavior (orange for Home, white for others)
    // Dark mode: dark icons on orange bar
    if (mode === 'dark') {
      return <Ionicons name={icon as any} size={26} color="#111827" />;
    }

    const iconColor = routeName === 'Home' ? colors.accent : '#FFFFFF';
    return <Ionicons name={icon as any} size={26} color={iconColor} />;
  };

  const renderTabBar = ({ routeName, selectedTab, navigate }: any) => (
    <TouchableOpacity
      onPress={() => navigate(routeName)}
      style={styles.tabbarItem}
      activeOpacity={0.7}
    >
      {_renderIcon(routeName, selectedTab)}
    </TouchableOpacity>
  );

  return (
    <CurvedBottomBarExpo.Navigator
      type="UP"
      style={styles.bottomBar}
      shadowStyle={styles.shadow}
      height={55}
      circleWidth={50}
      bgColor={colors.accent}
      initialRouteName="Home"
      borderTopLeftRight={true}
      {...({ detachInactiveScreens: false } as any)}
      screenOptions={{
        headerShown: false,
        lazy: false,
        freezeOnBlur: false,
        tabBarVisibilityAnimationConfig: {
          show: { animation: 'timing', config: { duration: 0 } },
          hide: { animation: 'timing', config: { duration: 0 } },
        },
      }}
      renderCircle={({ selectedTab, navigate }: any) => (
        <Animated.View
          style={[
            styles.btnCircleUp,
            mode === 'dark'
              ? { backgroundColor: colors.surface, borderColor: colors.accent, borderWidth: 2 }
              : null,
          ]}
        >
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigate('Home')}
          >
            <Ionicons name="home" size={26} color={colors.accent} />
          </TouchableOpacity>
        </Animated.View>
      )}
      tabBar={renderTabBar}
    >
      <CurvedBottomBarExpo.Screen
        name="Calendar"
        position="LEFT"
        component={CalendarScreen}
      />
      <CurvedBottomBarExpo.Screen
        name="Home"
        position="CIRCLE"
        component={HomeScreen}
      />
      <CurvedBottomBarExpo.Screen
        name="Social"
        position="RIGHT"
        component={SocialScreen}
      />
    </CurvedBottomBarExpo.Navigator>
  );
};

// Root Navigator
const RootNavigator = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        // Check if onboarding was completed
        const onboardingComplete = await AsyncStorage.getItem('onboardingComplete');
        const isNewSignup = await AsyncStorage.getItem('isNewSignup');
        
        // Only require onboarding for new signups
        if (isNewSignup === 'true') {
          setHasCompletedOnboarding(onboardingComplete === 'true');
        } else {
          // Existing users who log in skip onboarding
          setHasCompletedOnboarding(true);
        }
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    // You can add a splash screen here
    return null;
  }

  // Determine initial route based on auth and onboarding state
  let initialRouteName: keyof RootStackParamList = 'Login';
  if (user) {
    if (!user.emailVerified) {
      initialRouteName = 'EmailConfirmation';
    } else if (!hasCompletedOnboarding) {
      initialRouteName = 'Onboarding';
    } else {
      initialRouteName = 'Main';
    }
  }

  // Conditionally render screens based on auth state
  return (
    <Stack.Navigator 
      key={user ? `authenticated-${user.emailVerified}-${hasCompletedOnboarding}` : 'unauthenticated'}
      screenOptions={{ headerShown: false }}
      initialRouteName={initialRouteName}
    >
      {user ? (
        // Authenticated screens (including onboarding flow)
        <>
          <Stack.Screen name="EmailConfirmation" component={EmailConfirmationScreen as React.ComponentType<any>} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen as React.ComponentType<any>} />
          <Stack.Screen name="Main" component={MainTabNavigator} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Privacy" component={PrivacyScreen} />
          <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
          <Stack.Screen name="SelectGroup" component={SelectGroupScreen} />
          <Stack.Screen name="GroupType" component={GroupTypeScreen} />
          <Stack.Screen name="CreateSimpleGroup" component={CreateSimpleGroupScreen} />
          <Stack.Screen name="CreateChallenge" component={CreateChallengeScreen as React.ComponentType<any>} />
          <Stack.Screen name="GroupChat" component={GroupChatScreen as React.ComponentType<any>} />
          <Stack.Screen name="InviteToGroup" component={InviteToGroupScreen as React.ComponentType<any>} />
          <Stack.Screen name="Store" component={StoreScreen} />
          <Stack.Screen name="FriendProfile" component={FriendProfileScreen as React.ComponentType<any>} />
          <Stack.Screen name="Achievements" component={AchievementsScreen} />
          <Stack.Screen name="Levels" component={LevelsScreen} />
          <Stack.Screen name="CreateReminder" component={CreateReminderScreen} />
          <Stack.Screen name="ChallengeDetail" component={ChallengeDetailScreen} />
          <Stack.Screen name="CheckIn" component={CheckInScreen as React.ComponentType<any>} />
          <Stack.Screen name="ChallengeGallery" component={ChallengeGalleryScreen} />
        </>
      ) : (
        // Unauthenticated screens
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="EmailConfirmation" component={EmailConfirmationScreen as React.ComponentType<any>} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen as React.ComponentType<any>} />
        </>
      )}
    </Stack.Navigator>
  );
};

// App Navigator
export const AppNavigator = () => {
  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F0ED',
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 8,
  },
  button: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBar: {},
  btnCircleUp: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFB399',
    bottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  tabbarItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 