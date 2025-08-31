import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Theme } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { GroupService } from '../../services/groupService';
import { AuthService } from '../../services/authService';
import { Avatar } from '../../components/common/Avatar';
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
  const [groupMembers, setGroupMembers] = useState<Record<string, User[]>>({});

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const currentUser = await AuthService.getCurrentUser();
      console.log('👤 Current user:', currentUser?.id, currentUser?.displayName);
      
      if (currentUser) {
        setUser(currentUser);
        const userGroups = await GroupService.getUserGroups(currentUser.id);
        console.log('📋 Groups returned from service:', userGroups.length);
        console.log('📋 Groups data:', userGroups.map(g => ({ id: g.id, name: g.name, memberIds: g.memberIds })));
        
        setGroups(userGroups);
        
        // Load members for each group
        await loadGroupMembers(userGroups);
      }
    } catch (error) {
      console.error('❌ Error loading groups:', error);
      Alert.alert('Error', 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const loadGroupMembers = async (groups: Group[]) => {
    try {
      const membersMap: Record<string, User[]> = {};
      
      for (const group of groups) {
        const members: User[] = [];
        for (const memberId of group.memberIds) {
          try {
            const userDoc = await getDoc(doc(db, 'users', memberId));
            if (userDoc.exists()) {
              members.push(userDoc.data() as User);
            }
          } catch (error) {
            console.error('Error loading member:', error);
          }
        }
        membersMap[group.id] = members;
      }
      
      setGroupMembers(membersMap);
    } catch (error) {
      console.error('Error loading group members:', error);
    }
  };

  const renderGroup = ({ item }: { item: Group }) => (
    <TouchableOpacity 
      style={styles.groupCard}
      onPress={() => navigation.navigate('GroupChat', { groupId: item.id })}
    >
      {/* Header with overlapping profile circles */}
      <View style={styles.groupHeader}>
        <View style={styles.groupInfo}>
          <Text style={styles.groupName}>{item.name}</Text>
          <Text style={styles.groupGoal}>{item.goal}</Text>
        </View>
        
        <View style={styles.membersContainer}>
          <View style={styles.overlappingAvatars}>
            {groupMembers[item.id]?.slice(0, 3).map((member, index) => (
              <View 
                key={member.id} 
                style={[
                  styles.avatarCircle,
                  { 
                    zIndex: 3 - index,
                    marginLeft: index > 0 ? -15 : 0 
                  }
                ]}
              >
                <Avatar
                  source={member.photoURL}
                  initials={member.displayName.charAt(0).toUpperCase()}
                  size="sm"
                />
              </View>
            ))}
            {item.memberIds.length > 3 && (
              <View style={[styles.avatarCircle, styles.moreMembers]}>
                <Text style={styles.moreMembersText}>+{item.memberIds.length - 3}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Requirements section */}
      <View style={styles.requirementsSection}>
        <Text style={styles.requirementsTitle}>Requirements:</Text>
        {item.requirements.map((requirement, index) => (
          <View key={index} style={styles.requirementRow}>
            <Text style={styles.bulletPoint}>•</Text>
            <Text style={styles.requirementText}>{requirement}</Text>
          </View>
        ))}
      </View>

      {/* Group stats */}
      <View style={styles.groupStats}>
        <View style={styles.statItem}>
          <Ionicons name="people" size={16} color={Theme.colors.secondary} />
          <Text style={styles.statText}>{item.memberIds.length} members</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="diamond" size={16} color={Theme.colors.points} />
          <Text style={styles.statText}>{item.rewards.points} pts</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="trophy" size={16} color={Theme.colors.primary} />
          <Text style={styles.statText}>{item.groupType}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="refresh" size={32} color={Theme.colors.gray400} />
          <Text style={styles.loadingText}>Loading groups...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Groups</Text>
        <TouchableOpacity 
          style={styles.createButton}
                      onPress={() => navigation.navigate('GroupType')}
        >
          <Ionicons name="add" size={24} color={Theme.colors.white} />
        </TouchableOpacity>
      </View>

      {groups.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={64} color={Theme.colors.gray400} />
          <Text style={styles.emptyTitle}>No Groups Yet</Text>
          <Text style={styles.emptySubtitle}>Create your first accountability group to get started!</Text>
          <TouchableOpacity 
            style={styles.createFirstButton}
            onPress={() => navigation.navigate('GroupType')}
          >
            <Text style={styles.createFirstButtonText}>Create Group</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={groups}
          renderItem={renderGroup}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.groupsList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#212529', // Dark theme background
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.layout.screenPadding,
    paddingVertical: Theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#374151', // Darker border
    backgroundColor: '#374151', // Dark header background
  },
  
  title: {
    ...Theme.typography.h2,
    color: Theme.colors.white, // White text like CreateGroupScreen
    fontWeight: '700',
  },
  
  createButton: {
    backgroundColor: '#FF6B35', // Orange accent like CreateGroupScreen
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadows.sm,
  },
  
  groupsList: {
    padding: Theme.layout.screenPadding,
  },
  
  groupCard: {
    backgroundColor: '#374151', // Dark card background
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.layout.cardPadding,
    marginBottom: Theme.spacing.md,
    ...Theme.shadows.sm,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35', // Orange accent border
  },
  
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Theme.spacing.md,
  },
  
  groupInfo: {
    flex: 1,
    marginRight: Theme.spacing.md,
  },
  
  groupName: {
    ...Theme.typography.h4,
    color: Theme.colors.white, // White text
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Theme.spacing.xs,
  },
  
  groupGoal: {
    ...Theme.typography.body,
    color: '#9CA3AF', // Light grey text like CreateGroupScreen
    textAlign: 'center',
    lineHeight: 20,
  },
  
  membersContainer: {
    alignItems: 'flex-end',
  },
  
  overlappingAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  avatarCircle: {
    borderWidth: 2,
    borderColor: '#FF6B35', // Orange accent border
    borderRadius: 20,
    backgroundColor: Theme.colors.white,
  },
  
  moreMembers: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4B5563', // Darker grey
  },
  
  moreMembersText: {
    ...Theme.typography.caption,
    color: '#9CA3AF', // Light grey text
    fontWeight: '600',
  },
  
  requirementsSection: {
    marginBottom: Theme.spacing.md,
  },
  
  requirementsTitle: {
    ...Theme.typography.bodySmall,
    color: '#9CA3AF', // Light grey text
    fontWeight: '600',
    marginBottom: Theme.spacing.xs,
  },
  
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Theme.spacing.xs,
  },
  
  bulletPoint: {
    fontSize: 28,
    color: '#FF6B35', // Orange accent like CreateGroupScreen
    marginRight: Theme.spacing.sm,
    marginTop: 0,
    fontWeight: 'bold',
  },
  
  requirementText: {
    ...Theme.typography.bodySmall,
    color: '#9CA3AF', // Light grey text
    flex: 1,
    lineHeight: 18,
  },
  
  groupStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#4B5563', // Darker border
  },
  
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  statText: {
    ...Theme.typography.caption,
    color: '#9CA3AF', // Light grey text
    marginLeft: Theme.spacing.xs,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  loadingText: {
    ...Theme.typography.bodySmall,
    color: '#9CA3AF', // Light grey text
    marginTop: Theme.spacing.md,
  },
  
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.layout.screenPadding,
  },
  
  emptyTitle: {
    ...Theme.typography.h3,
    marginTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.sm,
    color: '#9CA3AF', // Light grey text
  },
  
  emptySubtitle: {
    ...Theme.typography.bodySmall,
    textAlign: 'center',
    color: '#6B7280', // Darker grey text
    marginBottom: Theme.spacing.xl,
    lineHeight: 20,
  },
  
  createFirstButton: {
    backgroundColor: '#FF6B35', // Orange accent
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    ...Theme.shadows.sm,
  },
  
  createFirstButtonText: {
    ...Theme.typography.body,
    color: Theme.colors.white,
    fontWeight: '600',
  },
}); 