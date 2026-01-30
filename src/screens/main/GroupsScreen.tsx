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
import { Avatar } from '../../components/common/Avatar';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Group, User } from '../../types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

interface GroupsScreenProps {
  navigation: any;
}

export const GroupsScreen: React.FC<GroupsScreenProps> = ({ navigation }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [groupMembers, setGroupMembers] = useState<Record<string, User[]>>({});
  const [groupsCache, setGroupsCache] = useState<Group[] | null>(null);

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
        // Use cache if available, otherwise load
        if (groupsCache) {
          console.log('Using cached groups data');
          setGroups(groupsCache);
          setLoading(false);
          setInitialLoad(false);
        } else {
          loadGroups();
        }
      }
    }, [user, groupsCache])
  );

  const prefetchGroups = async () => {
    if (!user) return;
    
    try {
      console.log('Prefetching groups...');
      const userGroups = await GroupService.getUserGroups(user.id);
      
      // Load members for each group (in parallel)
      await loadGroupMembers(userGroups);
      
      setGroupsCache(userGroups);
      setGroups(userGroups);
      console.log('Groups prefetched successfully');
    } catch (error) {
      console.error('Error prefetching groups:', error);
      // Don't throw - prefetch is an optimization
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  const loadGroups = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const userGroups = await GroupService.getUserGroups(user.id);
      console.log('📋 Groups returned from service:', userGroups.length);
      
      setGroups(userGroups);
      setGroupsCache(userGroups);
      
      // Load members for each group (in parallel)
      await loadGroupMembers(userGroups);
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
    const maxAvatars = 5;
    const members = groupMembers[item.id] || [];
    const displayMembers = members.slice(0, maxAvatars);
    const extraCount = Math.max(0, item.memberIds.length - maxAvatars);
    
    return (
      <TouchableOpacity 
        style={styles.groupCard}
        onPress={() => navigation.navigate('GroupChat', { groupId: item.id })}
      >
        {/* Top Row: Overlapping Avatars on Left, Challenge Badge on Right */}
        <View style={styles.topRow}>
          <View style={styles.overlappingAvatars}>
            {displayMembers.map((member, index) => (
              <View 
                key={member.id} 
                style={[
                  styles.avatarCircle,
                  { 
                    zIndex: maxAvatars - index,
                    marginLeft: index > 0 ? -10 : 0 
                  }
                ]}
              >
                <Avatar
                  source={member.photoURL}
                  initials={member.displayName?.charAt(0)?.toUpperCase() || '?'}
                  size="sm"
                />
              </View>
            ))}
            {extraCount > 0 && (
              <View 
                style={[
                  styles.avatarCircle,
                  styles.extraAvatarBadge,
                  { marginLeft: -10 }
                ]}
              >
                <Text style={styles.extraAvatarText}>+{extraCount}</Text>
              </View>
            )}
          </View>
          
          {/* Challenge Badge */}
          <View style={styles.challengeBadge}>
            <Ionicons name="trophy" size={16} color="#FFB800" />
            <Text style={styles.challengeCount}>0</Text>
          </View>
        </View>

        {/* Middle: Group Info */}
        <View style={styles.groupContent}>
          <Text style={styles.groupName}>{item.name}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && initialLoad) {
    return <LoadingSpinner text="Loading groups..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {groups.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={48} color="#666666" />
          <Text style={styles.emptyTitle}>No Groups Yet</Text>
          <Text style={styles.emptySubtitle}>Create your first accountability group to get started!</Text>
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

      {/* Floating Action Button - Create Group */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('CreateSimpleGroup')}
          activeOpacity={0.8}
        >
          <Ionicons 
            name="add" 
            size={24} 
            color="#FF6B35" 
          />
        </TouchableOpacity>
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
  
  
  groupsList: {
    padding: Theme.layout.screenPadding,
  },
  
  listContent: {
    paddingBottom: 100, // Account for FAB + tab bar
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
    borderColor: '#FFFFFF',
    borderRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
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
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FFE8B3',
  },
  
  challengeCount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#333',
  },
  
  groupContent: {
    marginTop: 2,
  },
  
  groupName: {
    fontSize: 17,
    color: '#000000',
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
    color: '#000000',
    fontWeight: '700',
    textAlign: 'center',
  },
  
  emptySubtitle: {
    ...Theme.typography.body,
    color: '#000000',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
    lineHeight: 20,
  },
  
  fabContainer: {
    position: 'absolute',
    bottom: 90, // Account for tab bar height (~70px) + padding
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
}); 