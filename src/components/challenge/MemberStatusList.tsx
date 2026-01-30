import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../common/Avatar';
import { challengeEval } from '../../utils/challengeEval';

type ChallengeType = "standard" | "progress" | "elimination" | "deadline";
type CadenceUnit = "daily" | "weekly";

type Challenge = any;
type CheckIn = any;
type ChallengeMember = any;

interface MemberStatusListProps {
  currentUserId: string;
  memberIds: string[];
  memberProfiles: Record<string, { name: string; avatarUri?: string }>;
  challenge: Challenge;
  checkInsForCurrentPeriod: CheckIn[];
  challengeMembers: ChallengeMember[];
  selectedPeriodKey?: string;
}

export const MemberStatusList: React.FC<MemberStatusListProps> = ({
  currentUserId,
  memberIds,
  memberProfiles,
  challenge,
  checkInsForCurrentPeriod,
  challengeMembers,
  selectedPeriodKey,
}) => {
  const getMemberStatus = (userId: string): 'completed' | 'pending' | 'missed' | 'eliminated' => {
    return challengeEval.getMemberStatus(
      challenge,
      userId,
      checkInsForCurrentPeriod,
      challengeMembers,
      selectedPeriodKey
    );
  };

  const getStatusIcon = (status: 'completed' | 'pending' | 'missed' | 'eliminated') => {
    switch (status) {
      case 'completed':
        return { icon: 'checkmark-circle' as const, color: '#4CAF50', label: 'Done', isFilled: true };
      case 'pending':
        return { icon: 'ellipse-outline' as const, color: '#999', label: 'Pending', isFilled: false };
      case 'missed':
        return { icon: 'close-circle' as const, color: '#F44336', label: 'Missed', isFilled: true };
      case 'eliminated':
        return { icon: 'skull-outline' as const, color: '#666', label: 'Out', isFilled: false };
    }
  };

  const getWeeklyProgress = (userId: string): string | null => {
    if (challenge.cadence.unit !== 'weekly') return null;
    
    const userCheckIns = checkInsForCurrentPeriod.filter((ci: any) => ci.userId === userId);
    const completed = userCheckIns.filter((ci: any) => ci.status === 'completed').length;
    const required = challenge.cadence.requiredCount || 1;
    
    return `${completed}/${required}`;
  };

  // Sort: current user first, then by status (completed, pending, missed, eliminated)
  const sortedMembers = [...memberIds].sort((a, b) => {
    if (a === currentUserId) return -1;
    if (b === currentUserId) return 1;
    
    const statusA = getMemberStatus(a);
    const statusB = getMemberStatus(b);
    const statusOrder = { completed: 0, pending: 1, missed: 2, eliminated: 3 };
    
    return statusOrder[statusA] - statusOrder[statusB];
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Group Status</Text>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {sortedMembers.map(userId => {
          const profile = memberProfiles[userId] || { name: `User ${userId.slice(0, 4)}` };
          const status = getMemberStatus(userId);
          const statusConfig = getStatusIcon(status);
          const weeklyProgress = getWeeklyProgress(userId);
          const isCurrentUser = userId === currentUserId;

          return (
            <View
              key={userId}
              style={[
                styles.memberRow,
                isCurrentUser && styles.currentUserRow,
              ]}
            >
              {/* Avatar */}
              <View style={[styles.avatarContainer, { borderColor: statusConfig.color }]}>
                <Avatar
                  source={profile.avatarUri}
                  initials={profile.name?.charAt(0).toUpperCase() || '?'}
                  size="sm"
                />
              </View>

              {/* Name */}
              <View style={styles.memberInfo}>
                <Text style={[styles.memberName, isCurrentUser && styles.currentUserName]}>
                  {isCurrentUser ? 'You' : profile.name}
                </Text>
                {weeklyProgress && (
                  <Text style={styles.weeklyProgress}>{weeklyProgress}</Text>
                )}
              </View>

              {/* Status Icon */}
              <View style={styles.statusContainer}>
                <Ionicons 
                  name={statusConfig.icon} 
                  size={statusConfig.isFilled ? 22 : 20} 
                  color={statusConfig.color} 
                />
                <Text style={[styles.statusText, { color: statusConfig.color }]}>
                  {statusConfig.label}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },

  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },

  list: {
    maxHeight: 250,
  },

  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },

  currentUserRow: {
    backgroundColor: 'transparent',
  },

  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    marginRight: 10,
    overflow: 'hidden',
  },

  memberInfo: {
    flex: 1,
  },

  memberName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },

  currentUserName: {
    fontWeight: '700',
    color: '#000',
  },

  weeklyProgress: {
    fontSize: 11,
    color: '#999',
    marginTop: 1,
  },

  statusContainer: {
    alignItems: 'center',
    gap: 2,
    minWidth: 60,
  },

  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
});
