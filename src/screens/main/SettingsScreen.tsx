import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { Theme } from '../../constants/theme';
import { AuthService } from '../../services/authService';
import { User } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { useColorMode } from '../../theme/ColorModeContext';

interface SettingsScreenProps {
  navigation: any;
  route: any;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation, route }) => {
  const user: User = route.params?.user;
  const { colors } = useColorMode();
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
              console.log('Starting logout...');
              
              // Sign out from Firebase
              await AuthService.signOut();
              console.log('SignOut successful');
              
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
              console.error('Error logging out:', error);
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

      <View style={styles.userSection}>
        <Avatar
          source={user?.photoURL}
          initials={user?.displayName?.charAt(0)}
          size="xl"
        />
        <Text style={[styles.userName, { color: colors.text }]}>{user?.displayName || 'User'}</Text>
        <Text style={[styles.userTitle, { color: colors.textSecondary }]}>{user?.title || 'Accountability Seeker'}</Text>
        <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
      </View>

      <View style={[styles.settingsSection, { backgroundColor: colors.card }]}>
        <TouchableOpacity style={[styles.settingItem, { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.accent, borderBottomColor: colors.dividerLineTodo + '40' }]}>
          <Text style={[styles.settingText, { color: colors.text }]}>Edit Profile</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.settingItem, { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.accent, borderBottomColor: colors.dividerLineTodo + '40' }]}>
          <Text style={[styles.settingText, { color: colors.text }]}>Notifications</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.settingItem, { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.accent, borderBottomColor: colors.dividerLineTodo + '40' }]}>
          <Text style={[styles.settingText, { color: colors.text }]}>Privacy</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.settingItem, { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.accent, borderBottomColor: colors.dividerLineTodo + '40' }]}
          onPress={() => navigation.navigate('Onboarding', { fromSettings: true })}
        >
          <Text style={[styles.settingText, { color: colors.text }]}>View Tutorial</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.settingItem, { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.accent, borderBottomColor: colors.dividerLineTodo + '40' }]}>
          <Text style={[styles.settingText, { color: colors.text }]}>Help & Support</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <View style={styles.logoutSection}>
        <Button
          title="Logout"
          onPress={handleLogout}
          variant="outline"
          style={styles.logoutButton}
          textStyle={styles.logoutButtonText}
          disabled={isLoggingOut}
          loading={isLoggingOut}
        />
      </View>
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
    paddingTop: 16,
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
  settingsSection: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: Theme.spacing.lg,
  },
  
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    gap: Theme.spacing.md,
    borderWidth: 2,
  },
  
  settingText: {
    ...Theme.typography.body,
    flex: 1,
    color: '#000000',
  },
  
  logoutSection: {
    padding: Theme.layout.screenPadding,
    paddingBottom: Theme.spacing.xl,
  },
  
  logoutButton: {
    borderColor: Theme.colors.error,
  },
  
  logoutButtonText: {
    color: Theme.colors.error,
  },
}); 