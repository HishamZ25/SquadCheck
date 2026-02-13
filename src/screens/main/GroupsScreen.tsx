import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Theme } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { GroupService } from '../../services/groupService';
import { AuthService } from '../../services/authService';
import { ChallengeService } from '../../services/challengeService';
import { Avatar } from '../../components/common/Avatar';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Group, User } from '../../types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { GroupCard } from '../../components/group';
import { useColorMode } from '../../theme/ColorModeContext';

interface GroupsScreenProps {
  navigation: any;
}

export const GroupsScreen: React.FC<GroupsScreenProps> = ({ navigation }) => {
  const { colors } = useColorMode();
  const [groups, setGroups] = useState<Group[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [groupMembers, setGroupMembers] = useState<Record<string, User[]>>({});
  const [groupsCache, setGroupsCache] = useState<Group[] | null>(null);
  const [challengeCountByGroupId, setChallengeCountByGroupId] = useState<Record<string, number>>({});

  // Load user on mount
  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  // Prefetch groups and members on app load
  useEffect(() => {
    if (user && !groupsCache) {
      prefetchGroups();
    }
  }, [user]);

  // Load groups when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        if (groupsCache) {
          setGroups(groupsCache);
          setLoading(false);
          setInitialLoad(false);
          // Ensure challenge counts are loaded (in case we had cache but counts weren't set yet)
          loadChallengeCounts(groupsCache);
        } else {
          loadGroups();
        }
      }
    }, [user, groupsCache])
  );

  const loadChallengeCounts = async (groupList: Group[]) => {
    if (groupList.length === 0) return;
    const counts: Record<string, number> = {};
    await Promise.all(
      groupList.map(async (g) => {
        try {
          const challenges = await ChallengeService.getGroupChallenges(g.id);
          const fromQuery = challenges.length;
          const fromDoc = Array.isArray((g as any).challengeIds) ? (g as any).challengeIds.length : 0;
          counts[g.id] = Math.max(fromQuery, fromDoc);
        } catch {
          counts[g.id] = Array.isArray((g as any).challengeIds) ? (g as any).challengeIds.length : 0;
        }
      })
    );
    setChallengeCountByGroupId((prev) => ({ ...prev, ...counts }));
  };

  const prefetchGroups = async () => {
    if (!user) return;
    
    try {
      console.log('Prefetching groups...');
      const userGroups = await GroupService.getUserGroups(user.id);
      
      await loadGroupMembers(userGroups);
      await loadChallengeCounts(userGroups);
      
      setGroupsCache(userGroups);
      setGroups(userGroups);
      console.log('Groups prefetched successfully');
    } catch (error) {
      console.error('Error prefetching groups:', error);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  const loadGroups = async () => {
    if (!user || !user.id) {
      console.log('⚠️ GroupsScreen: Cannot load groups - user or user.id is missing');
      setLoading(false);
      return;
    }
    
    try {
      console.log('📥 Loading groups for user:', user.id);
      setLoading(true);
      
      const userGroups = await GroupService.getUserGroups(user.id);
      console.log('📋 Groups returned from service:', userGroups.length);
      
      setGroups(userGroups);
      setGroupsCache(userGroups);
      
      await loadGroupMembers(userGroups);
      await loadChallengeCounts(userGroups);
    } catch (error) {
      console.error('❌ Error loading groups:', error);
      Alert.alert('Error', 'Failed to load groups');
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  const loadGroupMembers = async (groups: Group[]) => {
    try {
      // Collect all unique member IDs across all groups
      const allMemberIds = new Set<string>();
      groups.forEach(group => {
        group.memberIds.forEach(id => allMemberIds.add(id));
      });
      
      // Fetch all members in parallel
      const memberPromises = Array.from(allMemberIds).map(async (memberId) => {
        try {
          const userDoc = await getDoc(doc(db, 'users', memberId));
          if (userDoc.exists()) {
            return { id: memberId, data: userDoc.data() as User };
          }
        } catch (error) {
          console.error('Error loading member:', memberId, error);
        }
        return null;
      });
      
      const memberResults = await Promise.all(memberPromises);
      
      // Build a member lookup map
      const memberLookup: Record<string, User> = {};
      memberResults.forEach(result => {
        if (result) {
          memberLookup[result.id] = result.data;
        }
      });
      
      // Build the members map for each group
      const membersMap: Record<string, User[]> = {};
      groups.forEach(group => {
        membersMap[group.id] = group.memberIds
          .map(id => memberLookup[id])
          .filter(Boolean);
      });
      
      setGroupMembers(membersMap);
    } catch (error) {
      console.error('Error loading group members:', error);
    }
  };

  const renderGroup = ({ item }: { item: Group }) => {
    const members = groupMembers[item.id] || [];
    const challengeCount = challengeCountByGroupId[item.id] ?? 0;

    return (
      <GroupCard
        group={item}
        members={members}
        challengeCount={challengeCount}
        onPress={() => navigation.navigate('GroupChat', { groupId: item.id })}
      />
    );
  };

  if (loading && initialLoad) {
    return <LoadingSpinner text="Loading groups..." />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {groups.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={48} color={colors.accent} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Groups Yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Create your first accountability group to get started!</Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          renderItem={renderGroup}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.groupsList, styles.listContent]}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.surface, borderColor: colors.accent }]}
          onPress={() => navigation.navigate('CreateSimpleGroup')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color={colors.accent} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  
  
  groupsList: {
    padding: Theme.layout.screenPadding,
  },
  
  listContent: {
    paddingBottom: 80, // Account for FAB + curved tab bar
  },
  
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    ...Theme.shadows.sm,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  
  overlappingAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  avatarCircle: {
    borderWidth: 2.5,
    borderColor: '#FFB399',
    borderRadius: 18,
    shadowColor: '#FF6B35',
    shadowOpacity: 0.12,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  
  extraAvatarBadge: {
    width: 36,
    height: 36,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  extraAvatarText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  
  challengeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FFB399',
  },
  
  challengeCount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FF6B35',
  },
  
  groupContent: {
    marginTop: 2,
  },
  
  groupName: {
    fontSize: 17,
    color: '#333',
    fontWeight: '700',
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.layout.screenPadding,
    paddingVertical: Theme.spacing.xl * 2,
  },
  
  emptyTitle: {
    ...Theme.typography.h3,
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    ...Theme.typography.body,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
    lineHeight: 20,
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
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    ...Theme.shadows.lg,
    zIndex: 1000,
  },
}); 