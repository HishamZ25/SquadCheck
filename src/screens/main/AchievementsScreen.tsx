import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../constants/theme';
import { useColorMode } from '../../theme/ColorModeContext';
import { useCurrentUser } from '../../contexts/UserContext';
import {
  ACHIEVEMENTS,
  RARITY_COLORS,
  AchievementDefinition,
  AchievementRarity,
} from '../../constants/achievements';
import { Badge } from '../../types';

interface AchievementsScreenProps {
  navigation: any;
}

const RARITY_LABELS: Record<AchievementRarity, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

export const AchievementsScreen: React.FC<AchievementsScreenProps> = ({ navigation }) => {
  const { colors } = useColorMode();
  const { user } = useCurrentUser();

  const unlockedIds = new Set(
    (user?.badges || []).map((b: Badge) => b.id)
  );

  const unlockedCount = ACHIEVEMENTS.filter((a) => unlockedIds.has(a.id)).length;

  const getUnlockDate = (achievementId: string): Date | null => {
    const badge = (user?.badges || []).find((b: Badge) => b.id === achievementId);
    if (!badge) return null;
    const d = badge.unlockedAt;
    if (d instanceof Date) return d;
    if (typeof d === 'object' && 'toDate' in d) return (d as any).toDate();
    return new Date(d as any);
  };

  const renderAchievementCard = (achievement: AchievementDefinition) => {
    const isUnlocked = unlockedIds.has(achievement.id);
    const rarityColor = RARITY_COLORS[achievement.rarity];
    const unlockDate = getUnlockDate(achievement.id);

    return (
      <View
        key={achievement.id}
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: isUnlocked ? rarityColor + '60' : colors.dividerLineTodo + '30',
            opacity: isUnlocked ? 1 : 0.55,
          },
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: (isUnlocked ? achievement.color : colors.textSecondary) + '20' }]}>
          <Ionicons
            name={(isUnlocked ? achievement.icon : 'lock-closed') as any}
            size={28}
            color={isUnlocked ? achievement.color : colors.textSecondary}
          />
          {isUnlocked && (
            <View style={[styles.checkBadge, { backgroundColor: '#4CAF50' }]}>
              <Ionicons name="checkmark" size={10} color="#FFF" />
            </View>
          )}
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
              {achievement.name}
            </Text>
            <View style={[styles.rarityBadge, { backgroundColor: rarityColor + '20' }]}>
              <Text style={[styles.rarityText, { color: rarityColor }]}>
                {RARITY_LABELS[achievement.rarity]}
              </Text>
            </View>
          </View>

          <Text style={[styles.cardDescription, { color: colors.textSecondary }]} numberOfLines={2}>
            {achievement.description}
          </Text>

          <View style={styles.rewardsRow}>
            <View style={styles.rewardChip}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={[styles.rewardText, { color: colors.textSecondary }]}>
                {achievement.xpReward} XP
              </Text>
            </View>
            <View style={styles.rewardChip}>
              <Ionicons name="ribbon" size={12} color={rarityColor} />
              <Text style={[styles.rewardText, { color: colors.textSecondary }]} numberOfLines={1}>
                "{achievement.titleReward}"
              </Text>
            </View>
          </View>

          {isUnlocked && unlockDate && (
            <Text style={[styles.unlockDate, { color: colors.textSecondary }]}>
              Unlocked {unlockDate.toLocaleDateString()}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Achievements</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.dividerLineTodo + '50' }]}>
          <Ionicons name="trophy" size={32} color="#F59E0B" />
          <View style={styles.summaryText}>
            <Text style={[styles.summaryCount, { color: colors.text }]}>
              {unlockedCount}/{ACHIEVEMENTS.length}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Achievements Unlocked
            </Text>
          </View>
          <View style={[styles.progressBarBg, { backgroundColor: colors.surface }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: '#F59E0B',
                  width: `${(unlockedCount / ACHIEVEMENTS.length) * 100}%`,
                },
              ]}
            />
          </View>
        </View>

        {ACHIEVEMENTS.map(renderAchievementCard)}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  headerTitle: { fontSize: 28, fontWeight: '700', flex: 1, textAlign: 'center' },
  headerSpacer: { width: 48 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 24 },

  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryText: { flex: 1 },
  summaryCount: { fontSize: 22, fontWeight: '700' },
  summaryLabel: { fontSize: 13, marginTop: 2 },
  progressBarBg: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  card: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: { flex: 1 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  cardName: { fontSize: 16, fontWeight: '600', flex: 1 },
  rarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Theme.borderRadius.full,
  },
  rarityText: { fontSize: 11, fontWeight: '600' },
  cardDescription: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  rewardsRow: { flexDirection: 'row', gap: 12 },
  rewardChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rewardText: { fontSize: 12 },
  unlockDate: { fontSize: 11, marginTop: 6 },
});
