import React, { useMemo } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Avatar } from '../common/Avatar';
import { User } from '../../types';
import { GroupChatMessage } from '../../services/messageService';
import { Ionicons } from '@expo/vector-icons';

interface LeaderboardTabProps {
  members: User[];
  messages: GroupChatMessage[];
}

interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  points: number;
  streak: number;
  avatar: string | null;
}

export const LeaderboardTab: React.FC<LeaderboardTabProps> = ({ members, messages }) => {
  const leaderboardData = useMemo<LeaderboardEntry[]>(() => {
    return members
      .map((member) => {
        const memberCheckIns = messages.filter(
          (m) => m.userId === member.id && m.type === 'checkin'
        );
        const points = memberCheckIns.length * 10;
        const streak = memberCheckIns.length;

        return {
          id: member.id,
          rank: 0,
          name: member.displayName,
          points,
          streak,
          avatar: member.photoURL || null,
        };
      })
      .sort((a, b) => b.points - a.points)
      .map((item, index) => ({ ...item, rank: index + 1 }));
  }, [members, messages]);

  if (leaderboardData.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="trophy-outline" size={48} color="#666" />
        <Text style={styles.emptyText}>No check-ins yet</Text>
        <Text style={styles.emptySubtext}>Check-ins will appear here</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Group Leaderboard</Text>
      <Text style={styles.subtitle}>Ranked by check-in points</Text>

      <FlatList
        data={leaderboardData}
        renderItem={({ item }) => (
          <View style={styles.leaderboardItem}>
            <View style={styles.rankContainer}>
              <Text style={styles.rankText}>{item.rank}</Text>
            </View>

            <Avatar
              source={item.avatar}
              initials={item.name.charAt(0)}
              size="md"
              style={styles.avatar}
            />

            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.streak}>
                {item.streak} check-in{item.streak !== 1 ? 's' : ''}
              </Text>
            </View>

            <View style={styles.pointsContainer}>
              <Text style={styles.pointsText}>{item.points}</Text>
              <Text style={styles.pointsLabel}>pts</Text>
            </View>
          </View>
        )}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  rankContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  avatar: {
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  streak: {
    fontSize: 13,
    color: '#666',
  },
  pointsContainer: {
    alignItems: 'flex-end',
  },
  pointsText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B35',
  },
  pointsLabel: {
    fontSize: 12,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});
