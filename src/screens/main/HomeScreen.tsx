import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { Theme } from '../../constants/theme';
import { GroupService } from '../../services/groupService';
import { AuthService } from '../../services/authService';
import { Group, User } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { DicebearService } from '../../services/dicebearService';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';


interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [user, setUser] = useState<User | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);

  useEffect(() => {
    loadUserData();
    
    // Test Dicebear service
    console.log('Testing Dicebear service...');
    const testAvatar = DicebearService.testDicebear();
    console.log('Test avatar result:', testAvatar ? 'Success' : 'Failed');
  }, []);

  useEffect(() => {
    if (user) {
      loadGroups();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      console.log('Loading user data...');
      const currentUser = await AuthService.getCurrentUser();
      console.log('Loaded user data:', currentUser);
      setUser(currentUser);
    } catch (error) {
      console.error('Error loading user data:', error);
      setError('Failed to load user data');
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      const userGroups = await GroupService.getUserGroups(user.id);
      setGroups(userGroups);
    } catch (error) {
      console.error('Error loading groups:', error);
      setError('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarPress = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to change your profile picture.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const selectedImage = result.assets[0];
        console.log('Selected image:', selectedImage.uri);
        
        // TODO: Upload image to Firebase Storage and update user profile
        // For now, just show a success message
        Alert.alert(
          'Image Selected',
          'Profile picture updated successfully! (Upload to Firebase coming soon)',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadGroups();
    setRefreshing(false);
  };

  const handleNewGroup = () => {
    console.log('New Group pressed');
    setShowActionMenu(false);
    navigation.navigate('CreateGroup');
  };

  const handleNewSoloEndeavor = () => {
    console.log('New Solo Endeavor pressed');
    setShowActionMenu(false);
    // navigation.navigate('CreateSoloEndeavor');
  };

  const handleNewReminder = () => {
    console.log('New Reminder pressed');
    setShowActionMenu(false);
    // navigation.navigate('CreateReminder');
  };

  const renderGroupItem = ({ item }: { item: Group }) => (
    <TouchableOpacity
      style={styles.groupItem}
      onPress={() => navigation.navigate('GroupChat', { groupId: item.id })}
    >
      <View style={styles.groupHeader}>
        <Text style={styles.groupName}>{item.name}</Text>
        <Text style={styles.groupType}>
          {item.groupType === 'team' ? 'Team Goals' : 'Solo Accountability'}
        </Text>
      </View>
      
      <Text style={styles.groupDescription} numberOfLines={2}>
        {item.goal}
      </Text>
      
      <View style={styles.groupFooter}>
        <Text style={styles.memberCount}>
          {item.memberIds.length} member{item.memberIds.length !== 1 ? 's' : ''}
        </Text>
        <Text style={styles.goalTitle}>{item.goal}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderReminderItem = ({ item }: { item: any }) => (
    <View style={styles.reminderItem}>
      <Ionicons name="checkmark-circle-outline" size={24} color={Theme.colors.secondary} />
      <Text style={styles.reminderText}>{item.text}</Text>
      <Text style={styles.reminderTime}>{item.time}</Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={64} color={Theme.colors.gray500} />
      <Text style={styles.emptyStateTitle}>No groups</Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorState}>
      <Ionicons name="alert-circle-outline" size={64} color={Theme.colors.error} />
      <Text style={styles.errorStateTitle}>Something went wrong</Text>
      <Text style={styles.errorStateSubtitle}>{error}</Text>
      <Button
        title="Try Again"
        onPress={loadGroups}
        variant="outline"
        style={styles.errorStateButton}
      />
    </View>
  );

  // Mock data for now
  const mockReminders = [
    { id: '1', text: 'Workout at 6 PM', time: '6:00 PM' },
    { id: '2', text: 'Read 30 minutes', time: '8:00 PM' },
    { id: '3', text: 'Meditation', time: '7:00 AM' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* User Profile Section - Centered */}
      <View style={styles.userSection}>
        <Avatar
          source={user?.photoURL}
          initials={user?.displayName?.charAt(0)}
          size="xl"
          onPress={() => {
            console.log('Avatar pressed in HomeScreen!');
            handleAvatarPress();
          }}
        />
        <TouchableOpacity onPress={() => navigation.navigate('Settings', { user })}>
          <Text style={styles.userName}>{user?.displayName || 'Loading...'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Settings', { user })}>
          <Text style={styles.userTitle}>{user?.title || 'Accountability Seeker'}</Text>
        </TouchableOpacity>
        
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

      {/* Groups Section */}
      <View style={styles.section}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Ionicons name="refresh" size={32} color={Theme.colors.gray500} />
            <Text style={styles.loadingText}>Loading groups...</Text>
          </View>
        ) : error ? (
          renderErrorState()
        ) : groups.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={groups}
            renderItem={renderGroupItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Reminders Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Reminders</Text>
        </View>
        <FlatList
          data={mockReminders}
          renderItem={renderReminderItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Floating Action Button with Circular Speed Dial */}
      <View style={styles.fabContainer}>
        {/* Action Buttons - Circular pattern around FAB */}
        {showActionMenu && (
          <>
            {/* Group Button - 12 o'clock (above FAB) */}
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonTopRight]}
              onPress={handleNewGroup}
              activeOpacity={0.8}
            >
              <Ionicons name="people" size={24} color={Theme.colors.white} />
            </TouchableOpacity>

            {/* Solo Button - 4 o'clock (bottom right) */}
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonBottomRight]}
              onPress={handleNewSoloEndeavor}
              activeOpacity={0.8}
            >
              <Ionicons name="person" size={24} color={Theme.colors.white} />
            </TouchableOpacity>

            {/* Reminder Button - 8 o'clock (bottom left) */}
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonBottomLeft]}
              onPress={handleNewReminder}
              activeOpacity={0.8}
            >
              <Ionicons name="alert-circle" size={24} color={Theme.colors.white} />
            </TouchableOpacity>
          </>
        )}

        {/* Main FAB Button */}
        <TouchableOpacity
          style={[styles.fab, showActionMenu && styles.fabActive]}
          onPress={() => setShowActionMenu(!showActionMenu)}
          activeOpacity={0.8}
        >
          <Ionicons 
            name={showActionMenu ? "close" : "add"} 
            size={24} 
            color={Theme.colors.white} 
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  
  userSection: {
    alignItems: 'center',
    padding: Theme.layout.screenPadding,
    paddingTop: Theme.spacing.lg,
  },
  
  userName: {
    ...Theme.typography.h2,
    marginTop: Theme.spacing.sm,
    marginBottom: Theme.spacing.xs,
    textAlign: 'center',
    color: Theme.colors.text,
  },
  
  userTitle: {
    ...Theme.typography.body,
    marginBottom: Theme.spacing.md,
    textAlign: 'center',
    color: Theme.colors.textSecondary,
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
  
  section: {
    flex: 1,
    paddingHorizontal: Theme.layout.screenPadding,
  },
  
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
  },
  
  sectionTitle: {
    ...Theme.typography.h3,
    color: Theme.colors.text,
  },
  
  groupItem: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.layout.cardPadding,
    marginBottom: Theme.spacing.md,
    ...Theme.shadows.sm,
  },
  
  groupHeader: {
    marginBottom: Theme.spacing.sm,
  },
  
  groupName: {
    ...Theme.typography.h4,
    marginBottom: Theme.spacing.xs,
    color: Theme.colors.text,
  },
  
  groupType: {
    ...Theme.typography.caption,
    color: Theme.colors.secondary,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  
  groupDescription: {
    ...Theme.typography.bodySmall,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.md,
  },
  
  groupFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  memberCount: {
    ...Theme.typography.caption,
    color: Theme.colors.textTertiary,
  },
  
  goalTitle: {
    ...Theme.typography.bodySmall,
    color: Theme.colors.secondary,
    fontWeight: '600',
  },
  
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    gap: Theme.spacing.sm,
  },
  
  reminderText: {
    ...Theme.typography.body,
    flex: 1,
    color: Theme.colors.text,
  },
  
  reminderTime: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  loadingText: {
    ...Theme.typography.bodySmall,
    color: Theme.colors.textSecondary,
    marginTop: Theme.spacing.md,
  },
  
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.xl,
  },
  
  emptyStateTitle: {
    ...Theme.typography.h3,
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
    color: Theme.colors.text,
  },
  

  
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.xl,
  },
  
  errorStateTitle: {
    ...Theme.typography.h3,
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
    color: Theme.colors.error,
  },
  
  errorStateSubtitle: {
    ...Theme.typography.bodySmall,
    textAlign: 'center',
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.xl,
  },
  
  errorStateButton: {
    marginTop: Theme.spacing.md,
  },
  
  fabContainer: {
    position: 'absolute',
    bottom: Theme.spacing.xl,
    right: Theme.layout.screenPadding,
    width: 56,
    height: 56,
    zIndex: 1000,
  },
  
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Theme.colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Theme.colors.white,
    ...Theme.shadows.lg,
    zIndex: 1000,
  },
  
  fabActive: {
    backgroundColor: Theme.colors.error,
    transform: [{ rotate: '45deg' }],
  },
  

  
  actionButton: {
    position: 'absolute',
    backgroundColor: Theme.colors.secondary,
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Theme.colors.white,
    ...Theme.shadows.lg,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  
  actionButtonTopRight: {
    bottom: 100,
    right: 1,
    transform: [{ translateX: 0 }],
  },
  
  actionButtonBottomLeft: {
    bottom: 70,
    left: 45,
    transform: [{ translateX: -100 }],
  },
  
  actionButtonBottomRight: {
    bottom: 0,
    right: 100,
    transform: [{ translateX: 0 }],
  },
  

}); 