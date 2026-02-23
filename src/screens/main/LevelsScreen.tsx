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
import { useColorMode } from '../../theme/ColorModeContext';
import { useCurrentUser } from '../../contexts/UserContext';
import { LEVEL_THRESHOLDS } from '../../constants/gamification';
import { GamificationService } from '../../services/gamificationService';

interface LevelsScreenProps {
  navigation: any;
}

export const LevelsScreen: React.FC<LevelsScreenProps> = ({ navigation }) => {
  const { colors } = useColorMode();
  const { user } = useCurrentUser();

  const userLevel = user?.level || 1;
  const userXP = user?.xp || 0;
  const nextLevelXP = GamificationService.getNextLevelXP(userLevel);
  const currentEntry = LEVEL_THRESHOLDS.find((t) => t.level === userLevel);
  const progressPct = Math.min(100, (userXP / nextLevelXP) * 100);

  // Group levels by title tier for section headers
  let lastTitle = '';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Levels</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Current level highlight card */}
        <View style={[styles.currentCard, { backgroundColor: colors.accent + '15', borderColor: colors.accent + '40' }]}>
          <View style={styles.currentCardTop}>
            <View style={[styles.currentLevelBadge, { backgroundColor: colors.accent }]}>
              <Text style={styles.currentLevelNum}>{userLevel}</Text>
            </View>
            <View style={styles.currentCardInfo}>
              <Text style={[styles.currentTitle, { color: colors.text }]}>
                {currentEntry?.title || 'Rookie'}
              </Text>
              <Text style={[styles.currentXP, { color: colors.textSecondary }]}>
                {userXP} / {nextLevelXP} XP
              </Text>
            </View>
          </View>
          <View style={[styles.progressBg, { backgroundColor: colors.accent + '25' }]}>
            <View style={[styles.progressFill, { backgroundColor: colors.accent, width: `${progressPct}%` }]} />
          </View>
        </View>

        {/* All levels list */}
        {LEVEL_THRESHOLDS.map((entry) => {
          const isUnlocked = userLevel >= entry.level;
          const isCurrent = userLevel === entry.level;
          const showTierHeader = entry.title !== lastTitle;
          lastTitle = entry.title;

          return (
            <React.Fragment key={entry.level}>
              {showTierHeader && (
                <Text style={[styles.tierHeader, { color: colors.textSecondary }]}>
                  {entry.title}
                </Text>
              )}
              <View
                style={[
                  styles.levelRow,
                  {
                    backgroundColor: isCurrent ? colors.accent + '18' : colors.card,
                    borderColor: isCurrent ? colors.accent + '50' : colors.dividerLineTodo + '30',
                  },
                ]}
              >
                <View
                  style={[
                    styles.levelNumCircle,
                    {
                      backgroundColor: isUnlocked ? colors.accent : colors.dividerLineTodo + '40',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.levelNumText,
                      { color: isUnlocked ? '#FFFFFF' : colors.textSecondary },
                    ]}
                  >
                    {entry.level}
                  </Text>
                </View>

                <View style={styles.levelInfo}>
                  <Text
                    style={[
                      styles.levelTitle,
                      { color: isUnlocked ? colors.text : colors.textSecondary + '90' },
                    ]}
                  >
                    {entry.title}
                  </Text>
                  <Text
                    style={[
                      styles.levelXP,
                      { color: isUnlocked ? colors.textSecondary : colors.textSecondary + '70' },
                    ]}
                  >
                    {entry.xp.toLocaleString()} XP
                  </Text>
                </View>

                {isCurrent ? (
                  <View style={[styles.currentTag, { backgroundColor: colors.accent }]}>
                    <Text style={styles.currentTagText}>Current</Text>
                  </View>
                ) : isUnlocked ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
                ) : (
                  <Ionicons name="lock-closed" size={18} color={colors.textSecondary + '60'} />
                )}
              </View>
            </React.Fragment>
          );
        })}

        <View style={styles.bottomSpacer} />
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
  content: { paddingHorizontal: 20, paddingBottom: 40 },

  // Current level card
  currentCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 24,
  },
  currentCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 14,
  },
  currentLevelBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentLevelNum: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  currentCardInfo: {
    flex: 1,
  },
  currentTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  currentXP: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Tier header
  tierHeader: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 8,
    marginLeft: 4,
  },

  // Level row
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  levelNumCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNumText: {
    fontSize: 14,
    fontWeight: '700',
  },
  levelInfo: {
    flex: 1,
  },
  levelTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  levelXP: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  currentTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  currentTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bottomSpacer: { height: 20 },
});
