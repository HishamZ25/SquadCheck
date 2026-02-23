import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Avatar } from '../common/Avatar';
import { User, Challenge } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { useColorMode } from '../../theme/ColorModeContext';

interface SettingsTabProps {
  description: string | null;
  members: User[];
  challenges: Challenge[];
  groupMembers?: User[];
  onChallengePress: (challenge: Challenge) => void;
  onInvitePress?: () => void;
  onLeaveGroup?: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  description,
  members,
  challenges,
  groupMembers,
  onChallengePress,
  onInvitePress,
  onLeaveGroup,
}) => {
  const { colors } = useColorMode();
  const activeChallenges = challenges.filter(c => c.state !== 'ended');
  const finishedChallenges = challenges.filter(c => c.state === 'ended');

  const getWinnerName = (winnerId?: string) => {
    if (!winnerId) return null;
    const allMembers = groupMembers || members;
    const winner = allMembers.find(m => m.id === winnerId);
    return winner?.displayName || null;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* About Section */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.cardLabel, { color: colors.text }]}>About</Text>
        <Text style={[styles.descriptionText, { color: colors.text }]}>{description || 'No description'}</Text>
      </View>

      {/* Members Section */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardLabel, { color: colors.text }]}>Members</Text>
          <Text style={[styles.cardCount, { color: colors.textSecondary }]}>{members.length}</Text>
        </View>
        <View style={styles.membersList}>
          {members.map((member) => (
            <View key={member.id} style={styles.memberRow}>
              <Avatar
                source={member.photoURL}
                initials={member.displayName.charAt(0)}
                size="sm"
              />
              <Text style={[styles.memberName, { color: colors.text }]}>{member.displayName}</Text>
            </View>
          ))}
        </View>
        {onInvitePress && (
          <TouchableOpacity style={[styles.inviteButton, { backgroundColor: colors.card, borderColor: colors.accent }]} onPress={onInvitePress}>
            <Ionicons name="person-add" size={20} color={colors.accent} />
            <Text style={[styles.inviteButtonText, { color: colors.accent }]}>Invite to squad</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Active Challenges Section */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardLabel, { color: colors.text }]}>Active Challenges</Text>
          <Text style={[styles.cardCount, { color: colors.textSecondary }]}>{activeChallenges.length}</Text>
        </View>
        {activeChallenges.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No active challenges</Text>
        ) : (
          <View style={styles.challengesList}>
            {activeChallenges.map((challenge) => (
              <TouchableOpacity
                key={challenge.id}
                style={[styles.challengeRow, { backgroundColor: colors.card }]}
                onPress={() => onChallengePress(challenge)}
              >
                <View style={[styles.challengeIcon, { backgroundColor: colors.accent + '20' }]}>
                  <Ionicons
                    name={challenge.type === 'elimination' ? 'skull' : 'trophy'}
                    size={18}
                    color={colors.accent}
                  />
                </View>
                <View style={styles.challengeInfo}>
                  <Text style={[styles.challengeName, { color: colors.text }]}>{challenge.title}</Text>
                  <Text style={[styles.challengeType, { color: colors.textSecondary }]}>
                    {challenge.cadence?.unit === 'daily'
                      ? 'Daily'
                      : `${challenge.cadence?.requiredCount || 1}x/week`}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Finished Challenges Section */}
      {finishedChallenges.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardLabel, { color: colors.text }]}>Finished</Text>
            <Text style={[styles.cardCount, { color: colors.textSecondary }]}>{finishedChallenges.length}</Text>
          </View>
          <View style={styles.challengesList}>
            {finishedChallenges.map((challenge) => {
              const winnerName = getWinnerName(challenge.winnerId);
              return (
                <TouchableOpacity
                  key={challenge.id}
                  style={[styles.challengeRow, styles.finishedRow, { backgroundColor: colors.card }]}
                  onPress={() => onChallengePress(challenge)}
                >
                  <View style={[styles.challengeIcon, { backgroundColor: colors.textSecondary + '20' }]}>
                    <Ionicons
                      name={challenge.type === 'elimination' ? 'skull' : 'trophy'}
                      size={18}
                      color={colors.textSecondary}
                    />
                  </View>
                  <View style={styles.challengeInfo}>
                    <Text style={[styles.challengeName, { color: colors.textSecondary }]}>{challenge.title}</Text>
                    {winnerName ? (
                      <View style={styles.winnerBadge}>
                        <Ionicons name="medal" size={12} color="#F5A623" />
                        <Text style={styles.winnerText}>{winnerName}</Text>
                      </View>
                    ) : (
                      <Text style={[styles.challengeType, { color: colors.textSecondary }]}>Ended</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Ionicons name="people" size={24} color={colors.accent} />
          <Text style={[styles.statNumber, { color: colors.text }]}>{members.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Members</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Ionicons name="flame" size={24} color={colors.accent} />
          <Text style={[styles.statNumber, { color: colors.text }]}>{activeChallenges.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Ionicons name="checkmark-circle" size={24} color={colors.textSecondary} />
          <Text style={[styles.statNumber, { color: colors.text }]}>{finishedChallenges.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Finished</Text>
        </View>
      </View>

      {/* Leave Group */}
      {onLeaveGroup && (
        <TouchableOpacity style={[styles.leaveButton, { backgroundColor: colors.surface }]} onPress={onLeaveGroup}>
          <Ionicons name="exit-outline" size={20} color="#F44336" />
          <Text style={styles.leaveButtonText}>Leave Group</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  membersList: {
    gap: 12,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '500',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  inviteButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  challengesList: {
    gap: 8,
  },
  challengeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  challengeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  challengeInfo: {
    flex: 1,
  },
  challengeName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  challengeType: {
    fontSize: 13,
  },
  finishedRow: {
    opacity: 0.6,
  },
  winnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  winnerText: {
    fontSize: 13,
    color: '#F5A623',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  leaveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F44336',
  },
});
