import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Avatar } from '../common/Avatar';
import { User, Challenge } from '../../types';
import { Ionicons } from '@expo/vector-icons';

interface SettingsTabProps {
  description: string | null;
  members: User[];
  challenges: Challenge[];
  onChallengePress: (challenge: Challenge) => void;
  onInvitePress?: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  description,
  members,
  challenges,
  onChallengePress,
  onInvitePress,
}) => {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* About Section */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>About</Text>
        <Text style={styles.descriptionText}>{description || 'No description'}</Text>
      </View>

      {/* Members Section */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardLabel}>Members</Text>
          <Text style={styles.cardCount}>{members.length}</Text>
        </View>
        <View style={styles.membersList}>
          {members.map((member) => (
            <View key={member.id} style={styles.memberRow}>
              <Avatar
                source={member.photoURL}
                initials={member.displayName.charAt(0)}
                size="sm"
              />
              <Text style={styles.memberName}>{member.displayName}</Text>
            </View>
          ))}
        </View>
        {onInvitePress && (
          <TouchableOpacity style={styles.inviteButton} onPress={onInvitePress}>
            <Ionicons name="person-add" size={20} color="#FF6B35" />
            <Text style={styles.inviteButtonText}>Invite to squad</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Challenges Section */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardLabel}>Challenges</Text>
          <Text style={styles.cardCount}>{challenges.length}</Text>
        </View>
        {challenges.length === 0 ? (
          <Text style={styles.emptyText}>No challenges yet</Text>
        ) : (
          <View style={styles.challengesList}>
            {challenges.map((challenge) => (
              <TouchableOpacity
                key={challenge.id}
                style={styles.challengeRow}
                onPress={() => onChallengePress(challenge)}
              >
                <View style={styles.challengeIcon}>
                  <Ionicons
                    name={challenge.type === 'elimination' ? 'skull' : 'trophy'}
                    size={18}
                    color="#FF6B35"
                  />
                </View>
                <View style={styles.challengeInfo}>
                  <Text style={styles.challengeName}>{challenge.title}</Text>
                  <Text style={styles.challengeType}>
                    {challenge.cadence?.unit === 'daily'
                      ? 'Daily'
                      : `${challenge.cadence?.requiredCount || 1}x/week`}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#999" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="people" size={24} color="#FF6B35" />
          <Text style={styles.statNumber}>{members.length}</Text>
          <Text style={styles.statLabel}>Members</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="trophy" size={24} color="#FF6B35" />
          <Text style={styles.statNumber}>{challenges.length}</Text>
          <Text style={styles.statLabel}>Challenges</Text>
        </View>
      </View>
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
    backgroundColor: '#FFF',
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
    color: '#333',
    marginBottom: 8,
  },
  cardCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  descriptionText: {
    fontSize: 14,
    color: '#333',
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
    color: '#333',
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
    backgroundColor: '#FFF5F0',
    borderWidth: 1,
    borderColor: '#FF6B35',
    borderStyle: 'dashed',
  },
  inviteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF6B35',
  },
  challengesList: {
    gap: 8,
  },
  challengeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    gap: 12,
  },
  challengeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF5F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  challengeInfo: {
    flex: 1,
  },
  challengeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  challengeType: {
    fontSize: 13,
    color: '#666',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
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
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});
