import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { Theme } from '../../constants/theme';
import { AuthService } from '../../services/authService';
import { GamificationService } from '../../services/gamificationService';
import { User } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { useColorMode } from '../../theme/ColorModeContext';
import { useCurrentUser } from '../../contexts/UserContext';

interface SettingsScreenProps {
  navigation: any;
  route: any;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation, route }) => {
  const { user: contextUser } = useCurrentUser();
  const user: User = contextUser ?? route.params?.user;
  const { mode, colors, setMode } = useColorMode();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoggingOut(true);
              
              // Sign out from Firebase
              await AuthService.signOut();
              
              // Navigate to root and reset to Login
              // Get parent navigator (root stack)
              const rootNavigation = navigation.getParent() || navigation;
              rootNavigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                })
              );
              
            } catch (error: any) {
              if (__DEV__) console.error('Error logging out:', error);
              setIsLoggingOut(false);
              const errorMessage = error?.message || 'Failed to logout. Please try again.';
              Alert.alert('Error', errorMessage);
            }
          },
        },
      ]
    );
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <View style={[styles.userSection, { backgroundColor: colors.background }]}>
        <Avatar
          source={user?.photoURL}
          initials={user?.displayName?.charAt(0)}
          size="xl"
        />
        <Text style={[styles.userName, { color: colors.text }]}>{user?.displayName || 'User'}</Text>
        <Text style={[styles.userTitle, { color: colors.textSecondary }]}>{user?.title || 'Accountability Seeker'}</Text>
        <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user?.email}</Text>

        {/* Level + XP Progress */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Levels')}
          style={[styles.levelSection, { backgroundColor: colors.card, borderColor: colors.dividerLineTodo + '50' }]}
        >
          <View style={styles.levelRow}>
            <Text style={[styles.levelBadge, { color: colors.accent }]}>
              Lv. {user?.level || 1} — {user?.levelTitle || 'Rookie'}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </View>
          <View style={styles.xpProgressRow}>
            <View style={[styles.xpProgressBg, { backgroundColor: colors.accent + '15' }]}>
              <View
                style={[
                  styles.xpProgressFill,
                  {
                    backgroundColor: colors.accent,
                    width: `${Math.min(100, ((user?.xp || 0) / GamificationService.getNextLevelXP(user?.level || 1)) * 100)}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.xpLabel, { color: colors.textSecondary }]}>
              {user?.xp || 0}/{GamificationService.getNextLevelXP(user?.level || 1)} XP
            </Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {user?.totalCheckIns || 0} check-ins
            </Text>
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {user?.longestStreak || 0} best streak
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.settingsSection}>
        <TouchableOpacity
          style={[styles.settingItem, { backgroundColor: colors.card, borderColor: colors.dividerLineTodo + '50' }]}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={[styles.settingText, { color: colors.text }]}>Edit Profile</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.settingItem, { backgroundColor: colors.card, borderColor: colors.dividerLineTodo + '50' }]}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Text style={[styles.settingText, { color: colors.text }]}>Notifications</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.settingItem, { backgroundColor: colors.card, borderColor: colors.dividerLineTodo + '50' }]}
          onPress={() => navigation.navigate('Privacy')}
        >
          <Text style={[styles.settingText, { color: colors.text }]}>Privacy</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.settingItem, { backgroundColor: colors.card, borderColor: colors.dividerLineTodo + '50' }]}
          onPress={() => navigation.navigate('Onboarding', { fromSettings: true })}
        >
          <Text style={[styles.settingText, { color: colors.text }]}>View Tutorial</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.settingItem, { backgroundColor: colors.card, borderColor: colors.dividerLineTodo + '50' }]}
          onPress={() => navigation.navigate('HelpSupport')}
        >
          <Text style={[styles.settingText, { color: colors.text }]}>Help & Support</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={[styles.settingItem, { backgroundColor: colors.card, borderColor: colors.dividerLineTodo + '50' }]}>
          <Ionicons name={mode === 'dark' ? 'moon' : 'sunny'} size={20} color={colors.accent} />
          <Text style={[styles.settingText, { color: colors.text }]}>Dark Mode</Text>
          <Switch
            value={mode === 'dark'}
            onValueChange={(val) => setMode(val ? 'dark' : 'light')}
            trackColor={{ false: '#D1D5DB', true: colors.accent + '80' }}
            thumbColor={mode === 'dark' ? colors.accent : '#F9FAFB'}
          />
        </View>
      </View>

      <View style={styles.logoutSection}>
        <Button
          title="Logout"
          onPress={handleLogout}
          variant="outline"
          fullWidth
          style={styles.logoutButton}
          textStyle={styles.logoutButtonText}
          disabled={isLoggingOut}
          loading={isLoggingOut}
        />
      </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F0ED',
    position: 'relative',
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#F1F0ED',
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 48,
  },
  userSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  
  userName: {
    ...Theme.typography.h2,
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.xs,
    textAlign: 'center',
    color: '#000000',
  },
  
  userTitle: {
    ...Theme.typography.body,
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
    color: '#666666',
  },
  
  userEmail: {
    ...Theme.typography.bodySmall,
    marginBottom: Theme.spacing.md,
    textAlign: 'center',
    color: '#999999',
  },
  levelSection: {
    width: '100%',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  levelBadge: {
    fontSize: 15,
    fontWeight: '700',
  },
  xpProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  xpProgressBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  xpLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  statText: {
    fontSize: 12,
    fontWeight: '500',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  settingsSection: {
    paddingHorizontal: 20,
    marginTop: Theme.spacing.md,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    gap: Theme.spacing.md,
    borderWidth: 1,
  },
  
  settingText: {
    ...Theme.typography.body,
    flex: 1,
    color: '#000000',
  },
  
  logoutSection: {
    paddingHorizontal: 20,
    paddingTop: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xl,
  },
  logoutButton: {
    width: '100%',
    borderColor: Theme.colors.error,
  },
  logoutButtonText: {
    color: Theme.colors.error,
  },
}); 