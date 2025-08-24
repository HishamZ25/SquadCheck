import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { Theme } from '../../constants/theme';
import { AuthService } from '../../services/authService';
import { User } from '../../types';
import { Ionicons } from '@expo/vector-icons';

interface SettingsScreenProps {
  navigation: any;
  route: any;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation, route }) => {
  const user: User = route.params?.user;

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
              await AuthService.signOut();
              // Navigation will automatically go back to login due to auth state change
            } catch (error) {
              console.error('Error logging out:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* User Profile Section */}
      <View style={styles.userSection}>
        <Avatar
          source={user?.photoURL}
          initials={user?.displayName?.charAt(0)}
          size="xl"
        />
        <Text style={styles.userName}>{user?.displayName || 'User'}</Text>
        <Text style={styles.userTitle}>{user?.title || 'Accountability Seeker'}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        
        {/* Stats Row */}
        <View style={styles.statsRow}>
          {/* Badges */}
          <View style={styles.badgesContainer}>
            <Ionicons name="star" size={20} color={Theme.colors.gold} />
            <Ionicons name="trophy" size={20} color={Theme.colors.gold} />
            <Ionicons name="medal" size={20} color={Theme.colors.gold} />
          </View>
          
          {/* Streak */}
          <View style={styles.streakContainer}>
            <Ionicons name="flame" size={20} color={Theme.colors.streak} />
            <Text style={styles.streakText}>7</Text>
          </View>
          
          {/* Points */}
          <View style={styles.pointsContainer}>
            <Ionicons name="diamond" size={20} color={Theme.colors.points} />
            <Text style={styles.pointsText}>1250</Text>
          </View>
        </View>
      </View>

      {/* Settings Options */}
      <View style={styles.settingsSection}>
        <TouchableOpacity style={styles.settingItem}>
          <Ionicons name="person-outline" size={24} color={Theme.colors.textSecondary} />
          <Text style={styles.settingText}>Edit Profile</Text>
          <Ionicons name="chevron-forward" size={20} color={Theme.colors.textTertiary} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingItem}>
          <Ionicons name="notifications-outline" size={24} color={Theme.colors.textSecondary} />
          <Text style={styles.settingText}>Notifications</Text>
          <Ionicons name="chevron-forward" size={20} color={Theme.colors.textTertiary} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingItem}>
          <Ionicons name="shield-outline" size={24} color={Theme.colors.textSecondary} />
          <Text style={styles.settingText}>Privacy</Text>
          <Ionicons name="chevron-forward" size={20} color={Theme.colors.textTertiary} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingItem}>
          <Ionicons name="help-circle-outline" size={24} color={Theme.colors.textSecondary} />
          <Text style={styles.settingText}>Help & Support</Text>
          <Ionicons name="chevron-forward" size={20} color={Theme.colors.textTertiary} />
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
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Theme.layout.screenPadding,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  
  backButton: {
    padding: Theme.spacing.sm,
  },
  
  headerTitle: {
    ...Theme.typography.h3,
    color: Theme.colors.text,
    fontWeight: '600',
  },
  
  headerSpacer: {
    width: 48, // Same width as back button for centering
  },
  
  userSection: {
    alignItems: 'center',
    padding: Theme.layout.screenPadding,
    paddingTop: Theme.spacing.xl,
  },
  
  userName: {
    ...Theme.typography.h2,
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.xs,
    textAlign: 'center',
    color: Theme.colors.text,
  },
  
  userTitle: {
    ...Theme.typography.body,
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
    color: Theme.colors.textSecondary,
  },
  
  userEmail: {
    ...Theme.typography.bodySmall,
    marginBottom: Theme.spacing.lg,
    textAlign: 'center',
    color: Theme.colors.textTertiary,
  },
  
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: Theme.spacing.xl,
  },
  
  badgesContainer: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },
  
  streakText: {
    ...Theme.typography.h4,
    color: Theme.colors.streak,
    fontWeight: '600',
  },
  
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },
  
  pointsText: {
    ...Theme.typography.h4,
    color: Theme.colors.points,
    fontWeight: '600',
  },
  
  settingsSection: {
    flex: 1,
    paddingHorizontal: Theme.layout.screenPadding,
    marginTop: Theme.spacing.xl,
  },
  
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    gap: Theme.spacing.md,
  },
  
  settingText: {
    ...Theme.typography.body,
    flex: 1,
    color: Theme.colors.text,
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