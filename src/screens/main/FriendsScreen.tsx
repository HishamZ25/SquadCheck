import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Share,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Theme } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { FriendshipService } from '../../services/friendshipService';
import { AuthService } from '../../services/authService';
import { Avatar } from '../../components/common/Avatar';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { AddFriendModal } from '../../components/common/AddFriendModal';
import { User } from '../../types';
import { useColorMode } from '../../theme/ColorModeContext';

interface FriendsScreenProps {
  navigation: any;
}

export const FriendsScreen: React.FC<FriendsScreenProps> = ({ navigation }) => {
  const { colors } = useColorMode();
  const [friends, setFriends] = useState<User[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  // Initial load when user becomes available
  useEffect(() => {
    if (user?.id) {
      loadFriends();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadUser = async () => {
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      } else {
        // No user found, stop loading
        setLoading(false);
      }
    } catch (error) {
      if (__DEV__) console.error('Error loading user:', error);
      setLoading(false);
    }
  };

  const loadFriends = async (isRefresh = false) => {
    if (!user || !user.id) {
      setLoading(false);
      return;
    }
    try {
      if (!isRefresh) setLoading(true);
      else setRefreshing(true);
      const userFriends = await FriendshipService.getUserFriends(user.id);
      const validFriends = (userFriends || []).filter((f) => f && f.id);
      setFriends(validFriends);
    } catch (error) {
      if (__DEV__) console.error('Error loading friends:', error);
      setFriends([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    if (user?.id) loadFriends(true);
  };

  const handleFriendPress = useCallback(
    (friend: User) => {
      navigation.navigate('FriendProfile', { user: friend, currentUser: user ?? undefined });
    },
    [navigation, user]
  );

  const renderFriendItem = useCallback(({ item }: { item: User }) => {
    if (!item || !item.id) {
      return null;
    }

    const displayName = item.displayName || 'Unknown';
    const subtitle = item.title || 'Accountability Seeker';
    const initials = displayName?.charAt(0)?.toUpperCase() || '?';

    return (
      <TouchableOpacity
        style={[styles.friendCard, { backgroundColor: colors.surface, borderColor: colors.dividerLineTodo + '60' }]}
        onPress={() => handleFriendPress(item)}
        activeOpacity={0.7}
      >
        <Avatar
          source={item.photoURL}
          initials={initials}
          size="md"
        />
        <View style={styles.friendInfo}>
          <Text style={[styles.friendName, { color: colors.text }]} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={[styles.friendSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  }, [handleFriendPress]);

  const handleInviteFriends = async () => {
    if (!user) return;
    
    try {
      const message = `Join me on SquadCheck! Use my friend code: ${user.id.substring(0, 8)}\n\nDownload the app and let's stay accountable together!`;
      
      await Share.share({
        message,
        title: 'Join SquadCheck',
      });
    } catch (error) {
      if (__DEV__) console.error('Error sharing invite:', error);
    }
  };

  const handleAddFriend = () => {
    setShowActionMenu(false);
    setShowAddFriendModal(true);
  };

  const handleInviteFriendsFromMenu = () => {
    setShowActionMenu(false);
    handleInviteFriends();
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={64} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Friends Yet</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Add friends to see their progress and stay motivated together!
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  // Filter out any invalid friend objects
  const validFriends = friends.filter(f => f && f.id);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <FlatList
          data={validFriends}
          renderItem={renderFriendItem}
          keyExtractor={(item, index) => item?.id || `friend-${index}`}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />
          }
        />
      </View>

      {/* Floating Action Button with Speed Dial */}
      {showActionMenu && (
        <TouchableOpacity
          style={styles.fabOverlay}
          activeOpacity={1}
          onPress={() => setShowActionMenu(false)}
        />
      )}
      <View style={styles.fabContainer}>
        {/* Action Buttons */}
        {showActionMenu && (
          <>
            {/* Add Friend Button - Top Right */}
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonTop, { backgroundColor: colors.surface, borderColor: colors.accent }]}
              onPress={handleAddFriend}
              activeOpacity={0.8}
            >
              <Ionicons name="person-add-outline" size={24} color={colors.accent} />
            </TouchableOpacity>

            {/* Invite Friends Button - Bottom Left */}
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonBottom, { backgroundColor: colors.surface, borderColor: colors.accent }]}
              onPress={handleInviteFriendsFromMenu}
              activeOpacity={0.8}
            >
              <Ionicons name="share-outline" size={24} color={colors.accent} />
            </TouchableOpacity>
          </>
        )}

        {/* Main FAB */}
        <TouchableOpacity
          style={[styles.fab, showActionMenu && styles.fabActive, { backgroundColor: colors.surface, borderColor: colors.accent }]}
          onPress={() => setShowActionMenu(!showActionMenu)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={showActionMenu ? "close" : "add"}
            size={24}
            color={colors.accent}
          />
        </TouchableOpacity>
      </View>

      {/* Add Friend Modal */}
      {user && (
        <AddFriendModal
          visible={showAddFriendModal}
          onClose={() => {
            setShowAddFriendModal(false);
            loadFriends(true); // Refresh on close
          }}
          currentUserId={user.id}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F0ED',
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: Theme.layout.screenPadding,
    paddingBottom: 80, // Account for smaller curved tab bar
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  friendName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 3,
  },
  friendSubtitle: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  
  fabOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 999,
  },
  
  fabContainer: {
    position: 'absolute',
    bottom: Theme.layout.fabBottomOffsetSocial,
    right: Theme.layout.screenPadding,
    width: 56,
    height: 56,
    zIndex: 1000,
  },
  
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF6B35',
    ...Theme.shadows.lg,
    zIndex: 1000,
  },
  
  fabActive: {
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
  },
  
  actionButton: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FF6B35',
    ...Theme.shadows.lg,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  
  actionButtonTop: {
    bottom: 80,
    right: 4,
  },
  
  actionButtonBottom: {
    bottom: 40,
    left: 30,
    transform: [{ translateX: -80 }],
  },
});
