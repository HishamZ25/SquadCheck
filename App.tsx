import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ColorModeProvider, useColorMode } from './src/theme/ColorModeContext';
import { UserProvider, useCurrentUser } from './src/contexts/UserContext';
import { NotificationService } from './src/services/notificationService';
import { ReminderService } from './src/services/reminderService';

// Configure foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function StatusBarThemed() {
  const { mode } = useColorMode();
  return <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />;
}

function NotificationInitializer() {
  const { user } = useCurrentUser();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    if (!user?.id) return;

    // Register push token
    NotificationService.registerPushToken(user.id);

    // Re-schedule monthly reminders (one-shot, so they need refreshing on app open)
    ReminderService.getUserReminders(user.id)
      .then((reminders) => {
        const monthly = reminders.filter(r => r.isActive && r.frequency === 'monthly');
        if (monthly.length > 0) {
          NotificationService.rescheduleMonthlyReminders(monthly);
        }
      })
      .catch((err) => {
        if (__DEV__) console.error('Failed to reschedule monthly reminders:', err);
      });

    // Handle notification tap (deep linking)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (__DEV__) console.log('Notification tapped:', data);
        // Navigation is handled by the NavigationContainer ref if needed
      },
    );

    return () => {
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [user?.id]);

  return null;
}

export default function App() {
  return (
    <ColorModeProvider>
      <UserProvider>
        <StatusBarThemed />
        <NotificationInitializer />
        <AppNavigator />
      </UserProvider>
    </ColorModeProvider>
  );
}
