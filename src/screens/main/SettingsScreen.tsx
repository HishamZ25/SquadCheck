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

interface SettingsScreenProps {
  navigation: any;
  route: any;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation, route }) => {
  const user: User = route.params?.user;
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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#000000" />
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
          <Ionicons name="person-outline" size={24} color="#666666" />
          <Text style={styles.settingText}>Edit Profile</Text>
          <Ionicons name="chevron-forward" size={20} color="#999999" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingItem}>
          <Ionicons name="notifications-outline" size={24} color="#666666" />
          <Text style={styles.settingText}>Notifications</Text>
          <Ionicons name="chevron-forward" size={20} color="#999999" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingItem}>
          <Ionicons name="shield-outline" size={24} color="#666666" />
          <Text style={styles.settingText}>Privacy</Text>
          <Ionicons name="chevron-forward" size={20} color="#999999" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingItem}>
          <Ionicons name="help-circle-outline" size={24} color="#666666" />
          <Text style={styles.settingText}>Help & Support</Text>
          <Ionicons name="chevron-forward" size={20} color="#999999" />
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
    padding: Theme.layout.screenPadding,
  },
  
  backButton: {
    padding: Theme.spacing.sm,
  },
  
  headerTitle: {
    ...Theme.typography.h2,
    color: '#FF6B35',
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
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
    marginBottom: Theme.spacing.lg,
    textAlign: 'center',
    color: '#999999',
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
    backgroundColor: '#F5F5F5',
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    gap: Theme.spacing.md,
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