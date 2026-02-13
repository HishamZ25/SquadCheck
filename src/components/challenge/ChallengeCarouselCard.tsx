import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Challenge } from '../../types';
import { dateKeys } from '../../utils/dateKeys';
import { CountdownTimer } from '../common/CountdownTimer';
import { Avatar } from '../common/Avatar';
import { Check } from 'lucide-react-native';
import { useColorMode } from '../../theme/ColorModeContext';

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
  onPress,
  onCheckInPress,
}) => {
  const { colors } = useColorMode();
  const dueTimeLocal = challenge.due?.dueTimeLocal || '23:59';
  const isDaily = challenge.cadence?.unit === 'daily';
  const countdownTarget = isDaily && !isCompleted && !isEliminated
    ? dateKeys.getNextDueDate(dueTimeLocal, challenge.due?.deadlineDate, (challenge as any).type)
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

const CARD_MIN_HEIGHT = 160;

const styles = StyleSheet.create({
  card: {
    width: '100%',
    minHeight: CARD_MIN_HEIGHT,
    backgroundColor: '#FFF9F5',
    borderRadius: 12,
    borderWidth: 2,
    padding: 14,
    justifyContent: 'space-between',
  },
  cardCompleted: {
    minHeight: 120,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
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
  middle: {
    marginBottom: 10,
    minHeight: 28,
    justifyContent: 'center',
  },
  middleCompleted: {
    marginBottom: 4,
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
    paddingVertical: 12,
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
