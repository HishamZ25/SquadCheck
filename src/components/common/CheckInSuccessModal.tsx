import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Flame, Star, Sparkles, Shield, PartyPopper } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useColorMode } from '../../theme/ColorModeContext';

interface CheckInSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  xpEarned: number;
  streak: number;
  leveledUp: boolean;
  newLevel: number;
  newTitle: string;
  isNewMilestone: boolean;
  milestoneValue: number;
  shieldEarned: boolean;
  encouragement: string;
  dailyBonusAwarded?: boolean;
  dailyBonusXP?: number;
}

export const CheckInSuccessModal: React.FC<CheckInSuccessModalProps> = ({
  visible,
  onClose,
  xpEarned,
  streak,
  leveledUp,
  newLevel,
  newTitle,
  isNewMilestone,
  milestoneValue,
  shieldEarned,
  encouragement,
  dailyBonusAwarded = false,
  dailyBonusXP = 0,
}) => {
  const { colors } = useColorMode();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const xpSlideAnim = useRef(new Animated.Value(30)).current;
  const xpOpacity = useRef(new Animated.Value(0)).current;
  const fireScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0);
      xpSlideAnim.setValue(30);
      xpOpacity.setValue(0);
      fireScale.setValue(0.5);

      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}

      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(xpSlideAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(xpOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.spring(fireScale, {
            toValue: 1,
            friction: 4,
            tension: 60,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      if (leveledUp) {
        setTimeout(() => {
          try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
        }, 600);
      }
    }
  }, [visible]);

  if (!visible) return null;

  const fireSize = isNewMilestone ? 48 : streak >= 30 ? 40 : streak >= 7 ? 32 : 24;
  const fireColor = streak >= 30 ? '#FF4500' : streak >= 7 ? '#FF6B35' : '#FFA500';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: colors.surface, transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* Checkmark */}
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={36} color="#FFF" />
          </View>

          {/* XP earned */}
          <Animated.View
            style={{
              transform: [{ translateY: xpSlideAnim }],
              opacity: xpOpacity,
              alignItems: 'center',
            }}
          >
            <Text style={styles.xpText}>
              +{xpEarned + dailyBonusXP} XP
            </Text>
            {dailyBonusAwarded && (
              <View style={styles.dailyBonusBadge}>
                <Sparkles size={14} color="#FF6B35" fill="#FF6B35" />
                <Text style={styles.dailyBonusText}>2x All Challenges Done!</Text>
                <Sparkles size={14} color="#FF6B35" fill="#FF6B35" />
              </View>
            )}
          </Animated.View>

          {/* Streak */}
          {streak > 0 && (
            <Animated.View
              style={[styles.streakRow, { transform: [{ scale: fireScale }] }]}
            >
              {streak >= 3 ? (
                <Flame size={fireSize} color={fireColor} fill={fireColor} />
              ) : (
                <Star size={fireSize} color={fireColor} fill={fireColor} />
              )}
              <Text style={[styles.streakText, { color: fireColor }]}>
                {streak} day streak
              </Text>
            </Animated.View>
          )}

          {/* Milestone */}
          {isNewMilestone && (
            <View style={styles.milestoneRow}>
              <Sparkles size={18} color={colors.accent} fill={colors.accent} />
              <Text style={[styles.milestoneText, { color: colors.accent }]}>
                {milestoneValue}-Day Streak!
              </Text>
              <Sparkles size={18} color={colors.accent} fill={colors.accent} />
            </View>
          )}

          {/* Shield earned */}
          {shieldEarned && (
            <View style={[styles.shieldBadge, { backgroundColor: '#3B82F620' }]}>
              <Shield size={20} color="#3B82F6" fill="#3B82F6" />
              <Text style={[styles.shieldText, { color: '#3B82F6' }]}>
                You earned a Streak Shield!
              </Text>
            </View>
          )}

          {/* Level up */}
          {leveledUp && (
            <View style={[styles.levelUpBanner, { backgroundColor: '#FFD70020' }]}>
              <PartyPopper size={24} color="#B8860B" />
              <View>
                <Text style={[styles.levelUpTitle, { color: '#B8860B' }]}>Level Up!</Text>
                <Text style={[styles.levelUpSubtitle, { color: colors.textSecondary }]}>
                  Lv. {newLevel} — {newTitle}
                </Text>
              </View>
            </View>
          )}

          {/* Encouragement */}
          <Text style={[styles.encouragement, { color: colors.textSecondary }]}>
            {encouragement}
          </Text>

          {/* Continue button */}
          <TouchableOpacity
            style={[styles.continueBtn, { backgroundColor: colors.accent }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.continueBtnText}>Continue</Text>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '85%',
    maxWidth: 360,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  checkCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  xpText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FF6B35',
    marginBottom: 12,
  },
  dailyBonusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FF6B3515',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 4,
  },
  dailyBonusText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF6B35',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  streakText: {
    fontSize: 18,
    fontWeight: '700',
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  milestoneText: {
    fontSize: 20,
    fontWeight: '800',
  },
  shieldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 8,
  },
  shieldText: {
    fontSize: 14,
    fontWeight: '600',
  },
  levelUpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 12,
    width: '100%',
  },
  levelUpTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  levelUpSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  encouragement: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  continueBtn: {
    paddingHorizontal: 40,
    paddingVertical: 13,
    borderRadius: 20,
  },
  continueBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
