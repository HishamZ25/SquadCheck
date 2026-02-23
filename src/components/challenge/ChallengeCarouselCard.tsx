import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Challenge } from '../../types';
import { dateKeys } from '../../utils/dateKeys';
import { CountdownTimer } from '../common/CountdownTimer';
import { Avatar } from '../common/Avatar';
import { useColorMode } from '../../theme/ColorModeContext';
import { Flame, Star } from 'lucide-react-native';

export interface GroupMemberAvatar {
  id: string;
  photoURL?: string | null;
  displayName?: string;
}

interface ChallengeCarouselCardProps {
  challenge: Challenge;
  groupName?: string;
  groupMembers?: GroupMemberAvatar[];
  isCompleted: boolean;
  status: string;
  isEliminated?: boolean;
  streak?: number;
  onPress: () => void;
  onCheckInPress: (e: any) => void;
}

const MAX_AVATARS = 4;
const AVATAR_OVERLAP = -12;

export const ChallengeCarouselCard: React.FC<ChallengeCarouselCardProps> = ({
  challenge,
  groupName,
  groupMembers = [],
  isCompleted,
  status,
  isEliminated = false,
  streak = 0,
  onPress,
  onCheckInPress,
}) => {
  const { colors } = useColorMode();
  const dueTimeLocal = challenge.due?.dueTimeLocal || '23:59';
  const isDaily = challenge.cadence?.unit === 'daily';
  // Always show countdown to the DAILY due time, not the deadline date.
  // Deadline challenges still require daily submissions — the deadline is just when the challenge ends.
  const countdownTarget = isDaily && !isCompleted && !isEliminated
    ? dateKeys.getNextDueDate(dueTimeLocal, undefined, undefined, (challenge as any).adminTimeZone)
    : null;
  const showLiveCountdown = countdownTarget && countdownTarget.getTime() > Date.now();

  const dueLabel = (() => {
    if (isEliminated) return 'Eliminated';
    if (isCompleted) return null;
    if (challenge.cadence?.unit === 'weekly' && challenge.cadence.requiredCount) {
      return `${challenge.cadence.requiredCount}x per week`;
    }
    if (!isDaily) return 'No due time';
    return dateKeys.format12Hour(dueTimeLocal);
  })();

  const displayMembers = groupMembers.slice(0, MAX_AVATARS);
  const accentColor = isEliminated ? '#6B7280' : isCompleted ? '#22C55E' : colors.accent;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isCompleted && styles.cardCompleted,
        { borderColor: accentColor, backgroundColor: colors.card },
      ]}
      onPress={onPress}
      activeOpacity={0.92}
    >
      {/* Top row: title + group (left), avatars (right) */}
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {challenge.title || (challenge as any).name || 'Untitled Challenge'}
          </Text>
          {groupName ? (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {groupName}
            </Text>
          ) : null}
        </View>
        {displayMembers.length > 0 ? (
          <View style={styles.avatarsRow}>
            {displayMembers.map((member, i) => (
              <View
                key={member.id}
                style={[
                  styles.avatarWrap,
                  {
                    marginLeft: i > 0 ? AVATAR_OVERLAP : 0,
                    zIndex: displayMembers.length - i,
                    backgroundColor: colors.card,
                    borderColor: colors.card,
                  },
                ]}
              >
                <Avatar
                  source={member.photoURL ?? undefined}
                  initials={member.displayName?.charAt(0)?.toUpperCase() || '?'}
                  size="sm"
                />
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {/* Streak indicator */}
      {streak > 0 && (
        <View style={styles.streakRow}>
          {streak >= 3 ? (
            <Flame
              size={streak >= 30 ? 18 : streak >= 7 ? 16 : 14}
              color={streak >= 30 ? '#FF4500' : streak >= 7 ? '#FF6B35' : '#FFA500'}
              fill={streak >= 30 ? '#FF4500' : streak >= 7 ? '#FF6B35' : '#FFA500'}
            />
          ) : (
            <Star size={14} color="#FFA500" fill="#FFA500" />
          )}
          <Text
            style={[
              styles.streakLabel,
              {
                color: streak >= 30 ? '#FF4500' : streak >= 7 ? '#FF6B35' : '#FFA500',
              },
            ]}
          >
            {streak} {isDaily ? 'day' : 'week'} streak
          </Text>
        </View>
      )}

      {/* Timer or due label */}
      <View style={[styles.middle, isCompleted && styles.middleCompleted]}>
        {showLiveCountdown ? (
          <CountdownTimer
            targetDate={countdownTarget}
            label=""
            numberColor={accentColor}
            labelColor="#6B6B6B"
            size="small"
            showLabels={false}
            finishText="Time's up!"
          />
        ) : dueLabel ? (
          <Text style={[styles.dueLabel, { color: accentColor }]}>{dueLabel}</Text>
        ) : null}
      </View>

      {/* Check-in button */}
      <TouchableOpacity
        style={[
          styles.checkInBtn,
          { backgroundColor: isEliminated ? '#6B7280' : isCompleted ? '#22C55E' : colors.accent },
        ]}
        onPress={onCheckInPress}
        disabled={isCompleted || isEliminated}
        activeOpacity={0.9}
      >
        {isEliminated ? (
          <Text style={styles.checkInBtnText}>Eliminated</Text>
        ) : isCompleted ? (
          <Text style={styles.checkInBtnText}>Done</Text>
        ) : (
          <Text style={styles.checkInBtnText}>Check In</Text>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const CARD_MIN_HEIGHT = 148;

const styles = StyleSheet.create({
  card: {
    width: '100%',
    minHeight: CARD_MIN_HEIGHT,
    backgroundColor: '#FFF9F5',
    borderRadius: 12,
    borderWidth: 2,
    padding: 13,
    justifyContent: 'space-between',
  },
  cardCompleted: {
    minHeight: 114,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B6B6B',
    marginTop: 2,
    fontWeight: '500',
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFF9F5',
    borderWidth: 2,
    borderColor: '#FFF9F5',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  streakLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  middle: {
    marginBottom: 8,
    minHeight: 26,
    justifyContent: 'center',
  },
  middleCompleted: {
    marginBottom: 3,
    minHeight: 0,
  },
  dueLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  checkInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  checkInBtnDone: {
    backgroundColor: '#22C55E',
  },
  checkInBtnOut: {
    backgroundColor: '#6B7280',
  },
  checkInBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
