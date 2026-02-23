import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { CircleLoader } from '../../components/common/CircleLoader';
import { ChallengeHeader } from '../../components/challenge/ChallengeHeader';
import { RuleCard } from '../../components/challenge/RuleCard';
import { StatusCard } from '../../components/challenge/StatusCard';
import { MemberStatusList } from '../../components/challenge/MemberStatusList';
import { HistoryStrip } from '../../components/challenge/HistoryStrip';
import { challengeEval, type UserStatus } from '../../utils/challengeEval';
import { dateKeys } from '../../utils/dateKeys';
import { resolveAdminTimeZone, getAdminZoneDayKey, getCurrentPeriodDayKey, getCurrentPeriodWeekKey, computeDeadlineMomentUtc } from '../../utils/dueTime';
import { ChallengeService } from '../../services/challengeService';
import { useColorMode } from '../../theme/ColorModeContext';
import { useCurrentUser } from '../../contexts/UserContext';

type ChallengeType = "standard" | "progress" | "elimination" | "deadline";
type CadenceUnit = "daily" | "weekly";
type InputType = "boolean" | "number" | "text" | "timer";

type Challenge = {
  id: string;
  groupId: string;
  title: string;
  description?: string;
  type: ChallengeType;
  cadence: {
    unit: CadenceUnit;
    requiredCount?: number;
    weekStartsOn?: 0|1|2|3|4|5|6;
  };
  submission: {
    inputType: InputType;
    unitLabel?: string;
    minValue?: number;
    requireAttachment?: boolean;
    requireText?: boolean;
    minTextLength?: number;
  };
  due: {
    dueTimeLocal?: string;
    timezoneMode: "userLocal" | "groupLocal";
    deadlineDate?: string;
  };
  rules?: {
    progress?: {
      startsAt: number;
      increaseBy: number;
      increaseUnit: "week";
      comparison: "gte" | "lte";
    };
    elimination?: {
      strikesAllowed: number;
      eliminateOn: "miss" | "failedRequirement";
    };
    deadline?: {
      targetValue?: number;
      comparison?: "gte" | "lte";
      progressMode: "accumulate" | "latest";
    };
  };
  createdAt: number;
};

type Group = {
  id: string;
  name: string;
  memberIds: string[];
};

type CheckIn = {
  id: string;
  challengeId: string;
  groupId: string;
  userId: string;
  period: {
    unit: CadenceUnit;
    dayKey?: string;
    weekKey?: string;
  };
  payload: {
    booleanValue?: boolean;
    numberValue?: number;
    textValue?: string;
    timerSeconds?: number;
  };
  attachments?: Array<{ type: "photo"|"screenshot"; uri: string }>;
  status: "completed" | "pending" | "missed" | "failed";
  computed?: { targetValue?: number; metRequirement?: boolean };
  createdAt: number;
};

type ChallengeMember = {
  challengeId: string;
  userId: string;
  state: "active" | "eliminated";
  strikes: number;
  eliminatedAt?: number;
};

/** Compute the current period key using IANA timezone from the challenge. */
const computeCurrentPeriodKey = (c: any): string => {
  const adminTz = resolveAdminTimeZone(c);
  const dueTimeLocal = c.due?.dueTimeLocal || '23:59';
  if (c.cadence?.unit === 'daily') {
    // Deadline challenges: use plain calendar date, no due-time rollover
    if (c.type === 'deadline') {
      return getAdminZoneDayKey(adminTz);
    }
    return getCurrentPeriodDayKey(adminTz, dueTimeLocal);
  }
  return getCurrentPeriodWeekKey(adminTz, c.cadence?.weekStartsOn || 0);
};

export const ChallengeDetailScreen = ({
  navigation,
  route,
}: any) => {
  const { colors } = useColorMode();
  const { user: currentUser } = useCurrentUser();
  const initialData = route?.params || {};
  const challengeIdParam = initialData.challengeId;
  const currentUserIdParam = initialData.currentUserId;

  // State for challenge data (may be loaded from challengeId on mount)
  const [challenge, setChallenge] = useState(initialData.challenge);
  const [group, setGroup] = useState(initialData.group);
  const [currentUserId, setCurrentUserId] = useState(initialData.currentUserId ?? currentUserIdParam);
  const [checkInsForCurrentPeriod, setCheckInsForCurrentPeriod] = useState(initialData.checkInsForCurrentPeriod || []);
  const [myRecentCheckIns, setMyRecentCheckIns] = useState(initialData.myRecentCheckIns || []);
  const [allRecentCheckIns, setAllRecentCheckIns] = useState<any[]>(initialData.allRecentCheckIns || []);
  const [challengeMembers, setChallengeMembers] = useState(initialData.challengeMembers || []);
  const [memberProfiles, setMemberProfiles] = useState(initialData.memberProfiles || {});
  const [loadingDetails, setLoadingDetails] = useState(!!(challengeIdParam && currentUserIdParam && !initialData.challenge));
  
  // Get current period key for default selection
  const getCurrentPeriodKey = () => {
    if (!challenge) return dateKeys.getDayKey();
    return computeCurrentPeriodKey(challenge);
  };
  
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(() => {
    if (initialData.challenge) {
      return computeCurrentPeriodKey(initialData.challenge);
    }
    return null;
  });

  // Compute current user status
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [optimisticComplete, setOptimisticComplete] = useState(false);

  // When navigated with only challengeId + currentUserId, load full details immediately
  useEffect(() => {
    if (!challengeIdParam || !currentUserIdParam || initialData.challenge) return;
    let cancelled = false;
    const load = async () => {
      try {
        const details = await ChallengeService.getChallengeDetails(challengeIdParam, currentUserIdParam);
        if (cancelled) return;
        setChallenge(details.challenge);
        setGroup(details.group);
        setCurrentUserId(currentUserIdParam);
        setCheckInsForCurrentPeriod(details.checkInsForCurrentPeriod || []);
        setMyRecentCheckIns(details.myRecentCheckIns || []);
        setAllRecentCheckIns(details.allRecentCheckIns || []);
        setChallengeMembers(details.challengeMembers || []);
        setMemberProfiles(details.memberProfiles || {});
        setSelectedDayKey(computeCurrentPeriodKey(details.challenge));
      } catch (e) {
        if (!cancelled) Alert.alert('Error', 'Failed to load challenge');
      } finally {
        if (!cancelled) setLoadingDetails(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [challengeIdParam, currentUserIdParam]);

  // Load full historical data on mount if not provided (when we already had challenge from params)
  useEffect(() => {
    const loadFullData = async () => {
      if (!initialData.allRecentCheckIns && challenge?.id && currentUserId && !challengeIdParam) {
        try {
          const challengeDetails = await ChallengeService.getChallengeDetails(challenge.id, currentUserId);
          setAllRecentCheckIns((prev: any[]) => (prev.length === 0 ? (challengeDetails.allRecentCheckIns || []) : prev));
          if (!selectedDayKey) {
            setCheckInsForCurrentPeriod((prev: any[]) =>
              prev.length === challengeDetails.checkInsForCurrentPeriod?.length ? prev : challengeDetails.checkInsForCurrentPeriod || []);
            setSelectedDayKey(computeCurrentPeriodKey(challenge));
          }
        } catch (error) {
          if (__DEV__) { console.error('Error loading full check-in data:', error); }
        }
      }
    };
    loadFullData();
  }, []);

  // Reload data when screen regains focus (e.g., returning from CheckInScreen)
  useFocusEffect(
    useCallback(() => {
      if (challenge?.id && currentUserId) {
        reloadChallengeData();
      }
    }, [challenge?.id, currentUserId])
  );

  useEffect(() => {
    if (!challenge || !currentUserId) return;
    
    const status = challengeEval.getUserStatus(
      challenge,
      currentUserId,
      checkInsForCurrentPeriod,
      challengeMembers,
      selectedDayKey || undefined // Pass selected day to determine if it's historical
    );
    setUserStatus(status);
  }, [challenge, currentUserId, checkInsForCurrentPeriod, challengeMembers, selectedDayKey]);
  
  // Function to reload challenge data
  const reloadChallengeData = async () => {
    try {
      const challengeDetails = await ChallengeService.getChallengeDetails(
        challenge.id,
        currentUserId
      );
      
      setChallenge(challengeDetails.challenge);
      setAllRecentCheckIns(challengeDetails.allRecentCheckIns || []);
      setMyRecentCheckIns(challengeDetails.myRecentCheckIns);
      
      // After submission, always reset to current period (based on due time)
      const currentPeriodKey = getCurrentPeriodKey();
      
      setSelectedDayKey(currentPeriodKey);
      setCheckInsForCurrentPeriod(challengeDetails.checkInsForCurrentPeriod);
    } catch (error) {
      if (__DEV__) console.error('Error reloading challenge data:', error);
    }
  };
  
  // Helper function to filter check-ins by period
  const filterCheckInsByPeriod = (checkIns: any[], periodKey: string) => {
    if (challenge.cadence.unit === 'daily') {
      return checkIns.filter((ci: any) => ci.period?.dayKey === periodKey);
    } else if (challenge.cadence.unit === 'weekly') {
      return checkIns.filter((ci: any) => ci.period?.weekKey === periodKey);
    }
    return checkIns;
  };
  
  // Function to handle day selection in history
  const handleDaySelected = (dayKey: string) => {
    
    // Check if clicking on the current period (based on due time)
    const currentPeriodKey = getCurrentPeriodKey();
    const isSelectingCurrentPeriod = dayKey === currentPeriodKey;
    
    // If clicking on current period, reset to show current data
    if (isSelectingCurrentPeriod) {
      setSelectedDayKey(currentPeriodKey);
      
      // Use allRecentCheckIns if available, otherwise use current state
      if (allRecentCheckIns.length > 0) {
        const filtered = filterCheckInsByPeriod(allRecentCheckIns, dayKey);
        setCheckInsForCurrentPeriod(filtered);
      } else {
        // allRecentCheckIns not loaded yet, keep current checkInsForCurrentPeriod as-is
        // Don't change checkInsForCurrentPeriod - it already has the right data
      }
      return;
    }
    
    // Selecting a historical period
    setSelectedDayKey(dayKey);
    
    // If allRecentCheckIns is empty, we can't show historical data
    if (allRecentCheckIns.length === 0) {
      setCheckInsForCurrentPeriod([]);
      return;
    }
    
    // Filter check-ins for the selected historical day
    const filteredCheckIns = filterCheckInsByPeriod(allRecentCheckIns, dayKey);
    setCheckInsForCurrentPeriod(filteredCheckIns);
  };
  
  // Format the selected day for display
  const getSelectedDayLabel = (): string => {
    if (!selectedDayKey) return '';

    // Parse as local date by adding time component
    const date = new Date(selectedDayKey + 'T12:00:00');

    // Use IANA-aware current period key to determine "Today" label
    // This ensures consistency with the rest of the screen
    const currentPeriodKey = getCurrentPeriodKey();
    const isCurrentPeriod = selectedDayKey === currentPeriodKey;

    // For yesterday, check one day before current period key
    const currentPeriodDate = new Date(currentPeriodKey + 'T12:00:00');
    const prevDate = new Date(currentPeriodDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDayKey = dateKeys.getDayKey(prevDate);
    const isPreviousPeriod = selectedDayKey === prevDayKey;

    // Format date (Feb 2nd, 2026)
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();

    // Get ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
    const getOrdinal = (n: number) => {
      if (n > 3 && n < 21) return 'th';
      switch (n % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };

    const formattedDate = `${month} ${day}${getOrdinal(day)}, ${year}`;

    if (isCurrentPeriod) return `${formattedDate} - Today`;
    if (isPreviousPeriod) return `${formattedDate} - Yesterday`;

    return formattedDate;
  };

  if (loadingDetails) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <CircleLoader dotColor={colors.accent} size="large" />
          <Text style={{ fontSize: 16, color: colors.textSecondary, marginTop: 12 }}>Loading challenge...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!challenge || !group || !currentUserId) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center' }}>
            Challenge data not available
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isChallengeEnded = (challenge as any).state === 'ended';

  const shouldShowComposer = () => {
    if (isChallengeEnded) return false;
    if (!userStatus) return false;
    if (optimisticComplete) return false;
    if (userStatus.type === 'completed') return false;
    if (userStatus.type === 'eliminated') return false;

    // Deadline passed — block check-in
    if (challenge.type === 'deadline' && challenge.due?.deadlineDate) {
      const adminTz = resolveAdminTimeZone(challenge);
      const dueTimeLocal = challenge.due?.dueTimeLocal || '23:59';
      const deadlineMoment = computeDeadlineMomentUtc(adminTz, challenge.due.deadlineDate, dueTimeLocal);
      if (Date.now() >= deadlineMoment.getTime()) return false;
    }

    // For pending status, ALWAYS show composer if we're viewing the current period
    // Use IANA-aware period key to match what the rest of the screen uses
    if (userStatus.type === 'pending') {
      const currentPeriod = getCurrentPeriodKey();
      return selectedDayKey === currentPeriod;
    }

    // For missed status, don't allow submission
    if (userStatus.type === 'missed') return false;

    return true;
  };

  const isDeadlinePassed = challenge.type === 'deadline' && challenge.due?.deadlineDate && (() => {
    const adminTz = resolveAdminTimeZone(challenge);
    const dueTimeLocal = challenge.due?.dueTimeLocal || '23:59';
    const deadlineMoment = computeDeadlineMomentUtc(adminTz, challenge.due.deadlineDate, dueTimeLocal);
    return Date.now() >= deadlineMoment.getTime();
  })();

  const displayStatus: UserStatus | null = isChallengeEnded
    ? { type: 'missed', missedAt: 'Challenge ended' }
    : isDeadlinePassed && userStatus?.type !== 'completed'
      ? { type: 'missed', missedAt: 'Deadline passed' }
      : optimisticComplete && userStatus
        ? { type: 'completed', timestamp: Date.now(), checkIn: {} as any }
        : userStatus;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <ChallengeHeader
          title={challenge.title || (challenge as any).name || 'Untitled Challenge'}
          groupName={group.name}
          groupId={group.id}
          cadence={challenge.cadence}
          type={challenge.type}
          onBack={() => navigation.goBack()}
          navigation={navigation}
        />

        {/* Selected Day Indicator */}
        {selectedDayKey && (
          <View style={[styles.dayIndicator, { backgroundColor: colors.surface, borderColor: colors.dividerLineTodo + '80' }]}>
            <Text style={[styles.dayIndicatorText, { color: colors.accent }]}>{getSelectedDayLabel()}</Text>
          </View>
        )}

        {/* Rule Card */}
        <RuleCard
          description={challenge.description}
          type={challenge.type}
          submission={challenge.submission}
          due={challenge.due}
          rules={challenge.rules}
          challenge={challenge}
        />

        {/* Status Card - Most Prominent */}
        {displayStatus && (
          <StatusCard 
            status={displayStatus} 
            currentCheckIn={checkInsForCurrentPeriod.find((ci: any) => ci.userId === currentUserId)}
            countdownTargetDate={
              displayStatus.type === 'pending' && selectedDayKey === getCurrentPeriodKey()
                ? dateKeys.getNextDueDate(
                    challenge.due?.dueTimeLocal || '23:59',
                    undefined,
                    undefined,
                    challenge.adminTimeZone
                  )
                : undefined
            }
          />
        )}

        {/* Check-In Button — navigates to dedicated CheckInScreen */}
        {/* Group Status List - merge current user from context so "You" shows actual avatar */}
        <MemberStatusList
          currentUserId={currentUserId}
          memberIds={group.memberIds}
          memberProfiles={
            currentUser?.id
              ? {
                  ...memberProfiles,
                  [currentUser.id]: {
                    name: currentUser.displayName || memberProfiles[currentUser.id]?.name || 'You',
                    avatarUri: currentUser.photoURL ?? memberProfiles[currentUser.id]?.avatarUri ?? undefined,
                  },
                }
              : memberProfiles
          }
          challenge={challenge}
          checkInsForCurrentPeriod={checkInsForCurrentPeriod}
          challengeMembers={challengeMembers}
          selectedPeriodKey={selectedDayKey || undefined}
        />

        {/* Check-In Button — between group status and history */}
        {shouldShowComposer() && (
          <View style={styles.checkInButtonWrap}>
            <TouchableOpacity
              style={[styles.checkInButton, { backgroundColor: colors.accent }]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('CheckIn', {
                challengeId: challenge.id,
                details: {
                  challenge,
                  group,
                  checkInsForCurrentPeriod,
                  challengeMembers,
                  allRecentCheckIns,
                  myRecentCheckIns,
                  memberProfiles,
                },
              })}
            >
              <Text style={styles.checkInButtonText}>Check In</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* History Strip */}
        <HistoryStrip
          cadenceUnit={challenge.cadence.unit}
          weekStartsOn={challenge.cadence.weekStartsOn}
          requiredCount={challenge.cadence.requiredCount}
          myRecentCheckIns={myRecentCheckIns}
          unitLabel={challenge.submission.unitLabel}
          navigation={navigation}
          onDaySelected={handleDaySelected}
          challengeCreatedAt={challenge.createdAt}
          selectedDayKey={selectedDayKey}
          dueTimeLocal={challenge.due?.dueTimeLocal}
          currentPeriodKey={getCurrentPeriodKey()}
        />

        {/* Gallery Button — full-width below history */}
        <TouchableOpacity
          style={[styles.galleryButtonFull, { backgroundColor: colors.surface, borderColor: colors.accent }]}
          activeOpacity={0.7}
          onPress={() =>
            navigation.navigate('ChallengeGallery', {
              challengeId: challenge.id,
              memberIds: group?.memberIds || [currentUserId],
              memberProfiles,
            })
          }
        >
          <Ionicons name="images-outline" size={16} color={colors.accent} />
          <Text style={[styles.galleryButtonText, { color: colors.accent }]}>Gallery</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  dayIndicator: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  dayIndicatorText: {
    fontSize: 14,
    fontWeight: '600',
  },
  checkInButtonWrap: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  checkInButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  checkInButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  galleryButtonFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  galleryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
