import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Avatar } from '../common/Avatar';
import { User } from '../../types';
import { GroupChatMessage } from '../../services/messageService';
import { Ionicons } from '@expo/vector-icons';
import { useColorMode } from '../../theme/ColorModeContext';
import { NotificationService } from '../../services/notificationService';

interface LeaderboardTabProps {
  members: User[];
  messages: GroupChatMessage[];
  currentUserId?: string;
  groupId?: string;
}

interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  xp: number;
  level: number;
  levelTitle: string;
  streak: number;
  longestStreak: number;
  avatar: string | null;
}

type FilterMode = 'all_time' | 'this_week';

export const LeaderboardTab: React.FC<LeaderboardTabProps> = ({ members, messages, currentUserId, groupId }) => {
  const { colors } = useColorMode();
  const [filter, setFilter] = useState<FilterMode>('all_time');
  const [nudgedUsers, setNudgedUsers] = useState<Set<string>>(new Set());

  const leaderboardData = useMemo<LeaderboardEntry[]>(() => {
    return members
      .map((member) => {
        return {
          id: member.id,
          rank: 0,
          name: member.displayName,
          xp: member.xp || 0,
          level: member.level || 1,
          levelTitle: member.levelTitle || 'Rookie',
          streak: member.longestStreak || 0,
          longestStreak: member.longestStreak || 0,
          avatar: member.photoURL || null,
        };
      })
      .sort((a, b) => b.xp - a.xp)
      .map((item, index) => ({ ...item, rank: index + 1 }));
  }, [members, filter]);

  const handleNudge = async (targetUserId: string, targetName: string) => {
    if (nudgedUsers.has(targetUserId)) {
      Alert.alert('Already Nudged', `You already nudged ${targetName} today!`);
      return;
    }
    try {
      await NotificationService.sendNudge(targetUserId, currentUserId || '', groupId || '');
      setNudgedUsers(prev => new Set(prev).add(targetUserId));
      Alert.alert('Nudged!', `${targetName} has been nudged!`);
    } catch (e) {
      if (__DEV__) console.error('Nudge error:', e);
      Alert.alert('Error', 'Failed to send nudge');
    }
  };

  const getRankColor = (rank: number): string => {
    if (rank === 1) return '#FFD700';
    if (rank === 2) return '#C0C0C0';
    if (rank === 3) return '#CD7F32';
    return colors.accent;
  };

  if (leaderboardData.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="trophy-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: colors.text }]}>No members yet</Text>
        <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Check-ins will appear here</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>Group Leaderboard</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Ranked by XP</Text>

      {/* Filter Toggle */}
      <View style={[styles.filterRow, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'all_time' && { backgroundColor: colors.accent }]}
          onPress={() => setFilter('all_time')}
        >
          <Text style={[styles.filterText, { color: filter === 'all_time' ? '#FFF' : colors.textSecondary }]}>All Time</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, filter === 'this_week' && { backgroundColor: colors.accent }]}
          onPress={() => setFilter('this_week')}
        >
          <Text style={[styles.filterText, { color: filter === 'this_week' ? '#FFF' : colors.textSecondary }]}>This Week</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={leaderboardData}
        renderItem={({ item }) => {
          const rankColor = getRankColor(item.rank);
          const isTop3 = item.rank <= 3;
          const isSelf = item.id === currentUserId;

          return (
            <View style={[
              styles.leaderboardItem,
              { backgroundColor: colors.surface },
              isTop3 && { borderWidth: 1.5, borderColor: rankColor + '40' },
            ]}>
              <View style={[styles.rankContainer, { backgroundColor: rankColor }]}>
                {isTop3 ? (
                  <Ionicons name="trophy" size={14} color="#FFF" />
                ) : (
                  <Text style={styles.rankText}>{item.rank}</Text>
                )}
              </View>

              <Avatar
                source={item.avatar}
                initials={item.name.charAt(0)}
                size="md"
                style={styles.avatar}
              />

              <View style={styles.info}>
                <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.levelLabel, { color: colors.textSecondary }]}>
                  Lv. {item.level} {item.levelTitle}
                </Text>
              </View>

              <View style={styles.rightSection}>
                <View style={styles.pointsContainer}>
                  <Text style={[styles.pointsText, { color: colors.accent }]}>{item.xp}</Text>
                  <Text style={[styles.pointsLabel, { color: colors.textSecondary }]}>XP</Text>
                </View>
                {!isSelf && (
                  <TouchableOpacity
                    style={[
                      styles.nudgeBtn,
                      {
                        borderColor: nudgedUsers.has(item.id) ? colors.textSecondary : colors.accent,
                        opacity: nudgedUsers.has(item.id) ? 0.5 : 1,
                      },
                    ]}
                    onPress={() => handleNudge(item.id, item.name)}
                    disabled={nudgedUsers.has(item.id)}
                  >
                    <Ionicons
                      name="hand-right-outline"
                      size={14}
                      color={nudgedUsers.has(item.id) ? colors.textSecondary : colors.accent}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
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
    marginBottom: 2,
  },
  levelLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pointsContainer: {
    alignItems: 'flex-end',
  },
  pointsText: {
    fontSize: 18,
    fontWeight: '700',
  },
  pointsLabel: {
    fontSize: 12,
  },
  nudgeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
  },
});
