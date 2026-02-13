import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../constants/theme';
import { useNavigation } from '@react-navigation/native';
import { GroupService } from '../../services/groupService';
import { ChallengeService } from '../../services/challengeService';
import { auth } from '../../services/firebase';
import { CircleLoader } from '../../components/common/CircleLoader';
import { Group, User } from '../../types';
import { GroupCard } from '../../components/group';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useColorMode } from '../../theme/ColorModeContext';

export const SelectGroupScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useColorMode();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [groupMembers, setGroupMembers] = useState<Record<string, User[]>>({});
  const [challengeCountByGroupId, setChallengeCountByGroupId] = useState<Record<string, number>>({});

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroupMembers = async (groupList: Group[]) => {
    const membersMap: Record<string, User[]> = {};
    await Promise.all(
      groupList.map(async (g) => {
        const members: User[] = [];
        for (const uid of g.memberIds || []) {
          try {
            const snap = await getDoc(doc(db, 'users', uid));
            if (snap.exists()) members.push({ id: uid, ...snap.data() } as User);
          } catch {
            members.push({ id: uid, displayName: 'Unknown', email: '' } as User);
          }
        }
        membersMap[g.id] = members;
      })
    );
    setGroupMembers((prev) => ({ ...prev, ...membersMap }));
  };

  const loadChallengeCounts = async (groupList: Group[]) => {
    const counts: Record<string, number> = {};
    await Promise.all(
      groupList.map(async (g) => {
        try {
          const challenges = await ChallengeService.getGroupChallenges(g.id);
          counts[g.id] = challenges.length;
        } catch {
          counts[g.id] = 0;
        }
      })
    );
    setChallengeCountByGroupId((prev) => ({ ...prev, ...counts }));
  };

  const loadGroups = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const userGroups = await GroupService.getUserGroups(currentUser.uid);
      setGroups(userGroups);
      await loadGroupMembers(userGroups);
      await loadChallengeCounts(userGroups);
    } catch (error) {
      console.error('Error loading groups:', error);
      Alert.alert('Error', 'Failed to load your groups');
    } finally {
      setLoading(false);
    }
  };

  const handleGroupSelect = (groupId: string) => {
    setSelectedGroup(groupId);
  };

  const handleContinue = () => {
    if (!selectedGroup) {
      Alert.alert('Error', 'Please select a group');
      return;
    }

    // Navigate to GroupTypeScreen with the selected group
    (navigation as any).navigate('GroupType', { 
      isSolo: false,
      groupId: selectedGroup
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <CircleLoader size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.mainTitle, { color: colors.text }]}>Select Group</Text>
          <View style={styles.placeholder} />
        </View>
        
        <Text style={[styles.mainSubtitle, { color: colors.textSecondary }]}>
          {groups.length === 0 
            ? 'Create a group first before adding a group challenge'
            : 'Choose which group to create the challenge for'}
        </Text>

        {groups.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.text }]}>No Groups Yet</Text>
          </View>
        ) : (
          <View style={styles.groupsContainer}>
            {groups.map((group) => (
              <TouchableOpacity
                key={group.id}
                activeOpacity={0.9}
                onPress={() => handleGroupSelect(group.id)}
                style={[selectedGroup === group.id && { borderColor: colors.accent }, selectedGroup === group.id ? styles.selectedGroupWrapper : undefined]}
              >
                <GroupCard
                  group={group}
                  members={groupMembers[group.id] || []}
                  challengeCount={challengeCountByGroupId[group.id] ?? 0}
                  onPress={() => handleGroupSelect(group.id)}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {selectedGroup && (
        <View style={[styles.bottomContainer, { backgroundColor: colors.background }]}>
          <TouchableOpacity 
            style={[styles.continueButton, { backgroundColor: colors.accent }]}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>
              Continue to Challenge Type
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: 8,
  },
  placeholder: {
    width: 48,
  },
  content: {
    flex: 1,
    padding: Theme.spacing.md,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
  },
  mainSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.xxl,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  groupsContainer: {
    marginBottom: Theme.spacing.xl,
  },
  selectedGroupWrapper: {
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 2,
  },
  bottomContainer: {
    padding: Theme.spacing.md,
  },
  continueButton: {
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadows.sm,
  },
  
  continueButtonText: {
    ...Theme.typography.button,
    color: '#FFFFFF',
    fontWeight: '600',
    marginRight: Theme.spacing.sm,
  },
});
