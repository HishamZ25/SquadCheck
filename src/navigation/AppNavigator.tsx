import React, { useEffect, useState } from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../services/firebase';
import { CustomTabBar } from '../components/CustomTabBar';

// Auth Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { SignUpScreen } from '../screens/auth/SignUpScreen';

// Main Screens
import { HomeScreen } from '../screens/main/HomeScreen';
import { GroupsScreen } from '../screens/main/GroupsScreen';
import { CalendarScreen } from '../screens/main/CalendarScreen';
import { GroupChatScreen } from '../screens/main/GroupChatScreen';
import { SocialScreen } from '../screens/main/SocialScreen';
import { SettingsScreen } from '../screens/main/SettingsScreen';
import { CreateGroupScreen } from '../screens/main/CreateGroupScreen';
import { CreateSimpleGroupScreen } from '../screens/main/CreateSimpleGroupScreen';
import { CreateChallengeScreen } from '../screens/main/CreateChallengeScreen';
import { GroupTypeScreen } from '../screens/main/GroupTypeScreen';
import { StoreScreen } from '../screens/main/StoreScreen';
import { CreateReminderScreen } from '../screens/main/CreateReminderScreen';
import { CreateSoloChallengeScreen } from '../screens/main/CreateSoloChallengeScreen';

// Challenge Screens
import { ChallengeDetailScreen } from '../screens/challenge/ChallengeDetailScreen';

// Create navigators
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Main Tab Navigator with Custom Tab Bar
const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Groups" component={GroupsScreen} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Social" component={SocialScreen} />
      <Tab.Screen name="Store" component={StoreScreen} />
    </Tab.Navigator>
  );
};

// Root Navigator
const RootNavigator = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed:', user ? `User: ${user.email}` : 'No user');
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    // You can add a splash screen here
    return null;
  }

  // Conditionally render screens based on auth state
  return (
    <Stack.Navigator 
      key={user ? "authenticated" : "unauthenticated"}
      screenOptions={{ headerShown: false }}
      initialRouteName={user ? "Main" : "Login"}
    >
      {user ? (
        // Authenticated screens
        <>
          <Stack.Screen name="Main" component={MainTabNavigator} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="GroupType" component={GroupTypeScreen} />
          <Stack.Screen name="CreateSimpleGroup" component={CreateSimpleGroupScreen} />
          <Stack.Screen name="CreateChallenge" component={CreateChallengeScreen} />
          <Stack.Screen name="GroupChat" component={GroupChatScreen} />
          <Stack.Screen name="Store" component={StoreScreen} />
          <Stack.Screen name="CreateReminder" component={CreateReminderScreen} />
          <Stack.Screen name="CreateSoloChallenge" component={CreateSoloChallengeScreen} />
          <Stack.Screen name="ChallengeDetail" component={ChallengeDetailScreen} />
        </>
      ) : (
        // Unauthenticated screens
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
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