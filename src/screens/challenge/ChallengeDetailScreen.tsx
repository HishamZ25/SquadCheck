import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Alert } from 'react-native';
import { CircleLoader } from '../../components/common/CircleLoader';
import { ChallengeHeader } from '../../components/challenge/ChallengeHeader';
import { RuleCard } from '../../components/challenge/RuleCard';
import { StatusCard } from '../../components/challenge/StatusCard';
import { CheckInComposer, type CheckInDraft } from '../../components/challenge/CheckInComposer';
import { MemberStatusList } from '../../components/challenge/MemberStatusList';
import { HistoryStrip } from '../../components/challenge/HistoryStrip';
import { challengeEval, type UserStatus } from '../../utils/challengeEval';
import { dateKeys } from '../../utils/dateKeys';
import { CheckInService } from '../../services/checkInService';
import { MessageService } from '../../services/messageService';
import { ChallengeService } from '../../services/challengeService';
import { useColorMode } from '../../theme/ColorModeContext';

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

export const ChallengeDetailScreen = ({
  navigation,
  route,
}: any) => {
  const { colors } = useColorMode();
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
    if (challenge?.cadence?.unit === 'daily') {
      return dateKeys.getCurrentCheckInPeriod(challenge.due?.dueTimeLocal || '23:59');
    } else {
      return dateKeys.getWeekKey(new Date(), challenge?.cadence?.weekStartsOn || 0);
    }
  };
  
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(() => {
    if (initialData.challenge) {
      const c = initialData.challenge;
      return c.cadence?.unit === 'daily'
        ? dateKeys.getCurrentCheckInPeriod(c.due?.dueTimeLocal || '23:59')
        : dateKeys.getWeekKey(new Date(), c.cadence?.weekStartsOn || 0);
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
        const currentPeriodKey = details.challenge?.cadence?.unit === 'daily'
          ? dateKeys.getCurrentCheckInPeriod(details.challenge.due?.dueTimeLocal || '23:59')
          : dateKeys.getWeekKey(new Date(), details.challenge?.cadence?.weekStartsOn || 0);
        setSelectedDayKey(currentPeriodKey);
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
            const currentPeriodKey = challenge.cadence?.unit === 'daily'
              ? dateKeys.getCurrentCheckInPeriod(challenge.due?.dueTimeLocal || '23:59')
              : dateKeys.getWeekKey(new Date(), challenge.cadence?.weekStartsOn || 0);
            setSelectedDayKey(currentPeriodKey);
          }
        } catch (error) {
          console.error('Error loading full check-in data:', error);
        }
      }
    };
    loadFullData();
  }, []);

  useEffect(() => {
    if (!challenge || !currentUserId) return;
    
    const status = challengeEval.getUserStatus(
      challenge,
      currentUserId,
      checkInsForCurrentPeriod,
      challengeMembers,
      selectedDayKey || undefined // Pass selected day to determine if it's historical
    );
    console.log('Computed user status:', status, 'for day:', selectedDayKey || 'current');
    setUserStatus(status);
  }, [challenge, currentUserId, checkInsForCurrentPeriod, challengeMembers, selectedDayKey]);
  
  // Function to reload challenge data
  const reloadChallengeData = async () => {
    try {
      console.log('Reloading challenge data after submission...');
      const challengeDetails = await ChallengeService.getChallengeDetails(
        challenge.id,
        currentUserId
      );
      console.log('Reloaded data - allRecentCheckIns:', challengeDetails.allRecentCheckIns?.length || 0);
      console.log('Reloaded data - checkInsForCurrentPeriod:', challengeDetails.checkInsForCurrentPeriod?.length || 0);
      
      setChallenge(challengeDetails.challenge);
      setAllRecentCheckIns(challengeDetails.allRecentCheckIns || []);
      setMyRecentCheckIns(challengeDetails.myRecentCheckIns);
      
      // After submission, always reset to current period (based on due time)
      const currentPeriodKey = getCurrentPeriodKey();
      
      console.log('Resetting to current period:', currentPeriodKey);
      setSelectedDayKey(currentPeriodKey);
      setCheckInsForCurrentPeriod(challengeDetails.checkInsForCurrentPeriod);
    } catch (error) {
      console.error('Error reloading challenge data:', error);
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
    console.log('Loading data for day:', dayKey);
    
    // Check if clicking on the current period (based on due time)
    const currentPeriodKey = getCurrentPeriodKey();
    const isSelectingCurrentPeriod = dayKey === currentPeriodKey;
    
    // If clicking on current period, reset to show current data
    if (isSelectingCurrentPeriod) {
      console.log('Clicking on current period - resetting to current data');
      setSelectedDayKey(currentPeriodKey);
      
      // Use allRecentCheckIns if available, otherwise use current state
      if (allRecentCheckIns.length > 0) {
        const filtered = filterCheckInsByPeriod(allRecentCheckIns, dayKey);
        console.log(`Filtered current period from allRecentCheckIns: ${filtered.length} check-ins`);
        setCheckInsForCurrentPeriod(filtered);
      } else {
        // allRecentCheckIns not loaded yet, keep current checkInsForCurrentPeriod as-is
        console.log('allRecentCheckIns not loaded, keeping current checkInsForCurrentPeriod state');
        // Don't change checkInsForCurrentPeriod - it already has the right data
      }
      return;
    }
    
    // Selecting a historical period
    setSelectedDayKey(dayKey);
    
    // If allRecentCheckIns is empty, we can't show historical data
    if (allRecentCheckIns.length === 0) {
      console.log('Historical period selected but allRecentCheckIns not loaded yet');
      setCheckInsForCurrentPeriod([]);
      return;
    }
    
    // Filter check-ins for the selected historical day
    const filteredCheckIns = filterCheckInsByPeriod(allRecentCheckIns, dayKey);
    console.log(`Filtered to ${filteredCheckIns.length} check-ins for ${challenge.cadence.unit === 'daily' ? 'day' : 'week'} ${dayKey}`);
    console.log('Using check-ins from allRecentCheckIns:', allRecentCheckIns.length, 'filtered:', filteredCheckIns.length);
    setCheckInsForCurrentPeriod(filteredCheckIns);
  };
  
  // Format the selected day for display
  const getSelectedDayLabel = (): string => {
    if (!selectedDayKey) return '';
    
    // Parse as local date by adding time component
    const date = new Date(selectedDayKey + 'T12:00:00');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const isToday = dateKeys.getDayKey(date) === dateKeys.getDayKey(today);
    const isYesterday = dateKeys.getDayKey(date) === dateKeys.getDayKey(yesterday);
    const isTomorrow = dateKeys.getDayKey(date) === dateKeys.getDayKey(tomorrow);
    
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
    
    if (isToday) return `${formattedDate} - Today`;
    if (isTomorrow) return `${formattedDate} - Tomorrow`;
    if (isYesterday) return `${formattedDate} - Yesterday`;
    
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

  const handleSubmitCheckIn = async (draft: CheckInDraft) => {
    console.log('Check-in submitted:', draft);
    console.log('Current status:', userStatus);
    console.log('Challenge due time:', challenge.due?.dueTimeLocal);
    console.log('Current time:', new Date().toLocaleTimeString());
    
    try {
      // Optimistic update
      setOptimisticComplete(true);
      
      // Build payload with only defined values
      const payload: any = {};
      if (draft.booleanValue !== undefined) payload.booleanValue = draft.booleanValue;
      if (draft.numberValue !== undefined) payload.numberValue = draft.numberValue;
      if (draft.textValue !== undefined) payload.textValue = draft.textValue;
      if (draft.timerSeconds !== undefined) payload.timerSeconds = draft.timerSeconds;
      
      // Upload attachments to Firebase Storage first
      let uploadedAttachments = draft.attachments || [];
      if (draft.attachments && draft.attachments.length > 0) {
        console.log('Uploading attachments to Firebase Storage...');
        try {
          uploadedAttachments = await Promise.all(
            draft.attachments.map(async (attachment) => {
              const uploadedUrl = await MessageService.uploadImage(attachment.uri);
              console.log('Attachment uploaded:', uploadedUrl);
              return { type: attachment.type, uri: uploadedUrl };
            })
          );
        } catch (uploadError) {
          console.error('Error uploading attachment:', uploadError);
          setOptimisticComplete(false);
          Alert.alert(
            'Upload Failed',
            'Failed to upload image. Please check your Firebase Storage permissions and try again.',
            [{ text: 'OK' }]
          );
          return; // Stop submission if upload fails
        }
      }
      
      // Save check-in to Firebase with uploaded URLs
      const checkInId = await CheckInService.submitChallengeCheckIn(
        challenge.id,
        currentUserId,
        challenge.groupId || null,
        challenge.cadence.unit,
        payload,
        uploadedAttachments
      );
      console.log('Check-in saved to Firebase:', checkInId);
      
      // If it's a group challenge, send a message to the group chat
      console.log('Check groupId:', challenge.groupId, 'group:', group);
      if (challenge.groupId && group && group.id) {
        console.log('Sending check-in message to group:', group.id);
        const userName = memberProfiles[currentUserId]?.name || 'Unknown';
        const caption = draft.textValue || 'Completed check-in';
        const imageUrl = uploadedAttachments.length > 0 ? uploadedAttachments[0].uri : null;
          
        console.log('Sending message with:', { groupId: group.id, userName, caption, imageUrl, challengeTitle: challenge.title });
        const messageId = await MessageService.sendCheckInMessage(
          group.id,
          currentUserId,
          userName,
          caption,
          imageUrl,
          challenge.title // Pass challenge title
        );
        console.log('Check-in message sent with ID:', messageId);
      }
      
      // Reload challenge data to update status
      console.log('Check-in submitted successfully, reloading data...');
      await reloadChallengeData();
      console.log('Data reloaded after submission');
      
      // Reset optimistic state
      setOptimisticComplete(false);
      
      Alert.alert(
        'Check-In Submitted',
        'Your check-in has been recorded successfully!',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error submitting check-in:', error);
      setOptimisticComplete(false); // Revert optimistic update
      Alert.alert(
        'Error',
        'Failed to submit check-in. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const buildCheckInRequirements = (c: typeof challenge): string[] => {
    const list: string[] = [];
    const legacy = (c as any).requirements;
    if (Array.isArray(legacy) && legacy.length > 0) {
      list.push(...legacy.filter((r: any) => typeof r === 'string' && r.trim()));
    }
    if (c.submission?.requireAttachment) list.push('Photo proof required');
    if (c.submission?.requireText) list.push('Note or caption required');
    if (c.submission?.minTextLength) list.push(`Minimum ${c.submission.minTextLength} characters for text`);
    if (c.submission?.minValue != null && c.submission?.inputType === 'number') {
      list.push(`Minimum value: ${c.submission.minValue}${c.submission.unitLabel ? ` ${c.submission.unitLabel}` : ''}`);
    }
    if (c.submission?.minValue != null && c.submission?.inputType === 'timer') {
      list.push(`Minimum time: ${Math.floor(c.submission.minValue / 60)} minutes`);
    }
    return list;
  };

  const shouldShowComposer = () => {
    if (!userStatus) return false;
    if (optimisticComplete) return false;
    if (userStatus.type === 'completed') return false;
    if (userStatus.type === 'eliminated') return false;
    
    // For pending status, ALWAYS show composer if we're viewing today
    // The "pending" status means it's NOT completed yet, so we should allow submission
    if (userStatus.type === 'pending') {
      // Only check if we're viewing today (not a historical day)
      const today = dateKeys.getDayKey(new Date());
      return selectedDayKey === today;
    }
    
    // For missed status, don't allow submission
    if (userStatus.type === 'missed') return false;
    
    return true;
  };

  const displayStatus: UserStatus | null = optimisticComplete && userStatus
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
                    challenge.due?.deadlineDate,
                    challenge.type
                  )
                : undefined
            }
          />
        )}

        {/* Check-In Composer */}
        {shouldShowComposer() && (
          <CheckInComposer
            inputType={challenge.submission.inputType}
            unitLabel={challenge.submission.unitLabel}
            minValue={challenge.submission.minValue}
            requireAttachment={challenge.submission.requireAttachment}
            requireText={challenge.submission.requireText}
            minTextLength={challenge.submission.minTextLength}
            onSubmit={handleSubmitCheckIn}
            disabled={!shouldShowComposer()}
            description={challenge.description}
            requirements={buildCheckInRequirements(challenge)}
          />
        )}

        {/* Group Status List */}
        <MemberStatusList
          currentUserId={currentUserId}
          memberIds={group.memberIds}
          memberProfiles={memberProfiles}
          challenge={challenge}
          checkInsForCurrentPeriod={checkInsForCurrentPeriod}
          challengeMembers={challengeMembers}
          selectedPeriodKey={selectedDayKey || undefined}
        />

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
        />
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
});
