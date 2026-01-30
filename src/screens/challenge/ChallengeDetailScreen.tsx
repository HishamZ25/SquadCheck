import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Alert } from 'react-native';
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
  const initialData = route?.params || {};
  
  // State for challenge data
  const [challenge, setChallenge] = useState(initialData.challenge);
  const [group, setGroup] = useState(initialData.group);
  const [currentUserId] = useState(initialData.currentUserId);
  const [checkInsForCurrentPeriod, setCheckInsForCurrentPeriod] = useState(initialData.checkInsForCurrentPeriod || []);
  const [myRecentCheckIns, setMyRecentCheckIns] = useState(initialData.myRecentCheckIns || []); // Current user's check-ins from last 30 days
  // Initialize allRecentCheckIns - use checkInsForCurrentPeriod as fallback to show today's data immediately
  const [allRecentCheckIns, setAllRecentCheckIns] = useState<any[]>(initialData.allRecentCheckIns || []); 
  const [challengeMembers] = useState(initialData.challengeMembers || []);
  const [memberProfiles] = useState(initialData.memberProfiles || {});
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  // Compute current user status
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [optimisticComplete, setOptimisticComplete] = useState(false);

  // Load full historical data on mount if not provided
  useEffect(() => {
    const loadFullData = async () => {
      if (!initialData.allRecentCheckIns && challenge?.id && currentUserId) {
        console.log('Loading full check-in history...');
        try {
          const challengeDetails = await ChallengeService.getChallengeDetails(
            challenge.id,
            currentUserId
          );
          // Update allRecentCheckIns with full data
          setAllRecentCheckIns(challengeDetails.allRecentCheckIns || []);
          // Only update checkInsForCurrentPeriod if we're not viewing a historical day
          if (!selectedDayKey) {
            setCheckInsForCurrentPeriod(challengeDetails.checkInsForCurrentPeriod);
          }
        } catch (error) {
          console.error('Error loading full check-in data:', error);
        }
      }
    };
    
    loadFullData();
  }, []); // Only run once on mount

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
      
      // If a day is selected, re-apply the filter with new data
      if (selectedDayKey) {
        const filtered = filterCheckInsByPeriod(challengeDetails.allRecentCheckIns || [], selectedDayKey);
        setCheckInsForCurrentPeriod(filtered);
      } else {
        setCheckInsForCurrentPeriod(challengeDetails.checkInsForCurrentPeriod);
      }
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
    setSelectedDayKey(dayKey);
    
    // If allRecentCheckIns is empty (still loading), use initialData as fallback for current period
    const checkInsToFilter = allRecentCheckIns.length > 0 ? allRecentCheckIns : initialData.checkInsForCurrentPeriod || [];
    
    // Filter check-ins for the selected day
    const filteredCheckIns = filterCheckInsByPeriod(checkInsToFilter, dayKey);
    console.log(`Filtered to ${filteredCheckIns.length} check-ins for ${challenge.cadence.unit === 'daily' ? 'day' : 'week'} ${dayKey}`);
    console.log('Using check-ins:', checkInsToFilter.length, 'filtered:', filteredCheckIns);
    setCheckInsForCurrentPeriod(filteredCheckIns);
  };

  // If required data is missing, show error
  if (!challenge || !group || !currentUserId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 16, color: '#666', textAlign: 'center' }}>
            Challenge data not available
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleSubmitCheckIn = async (draft: CheckInDraft) => {
    console.log('Check-in submitted:', draft);
    
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
        uploadedAttachments = await Promise.all(
          draft.attachments.map(async (attachment) => {
            try {
              const uploadedUrl = await MessageService.uploadImage(attachment.uri);
              console.log('Attachment uploaded:', uploadedUrl);
              return { type: attachment.type, uri: uploadedUrl };
            } catch (error) {
              console.error('Error uploading attachment:', error);
              return attachment; // Keep original if upload fails
            }
          })
        );
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
      await reloadChallengeData();
      
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

  const shouldShowComposer = () => {
    if (!userStatus) return false;
    if (optimisticComplete) return false;
    if (userStatus.type === 'completed') return false;
    if (userStatus.type === 'eliminated') return false;
    if (userStatus.type === 'missed') return false; // Can't submit for missed periods
    
    // Don't show composer if viewing a historical day (not today/this week)
    if (selectedDayKey) {
      const currentDayKey = dateKeys.getDayKey();
      const currentWeekKey = dateKeys.getWeekKey(new Date(), challenge.cadence.weekStartsOn);
      const currentPeriodKey = challenge.cadence.unit === 'daily' ? currentDayKey : currentWeekKey;
      
      if (selectedDayKey !== currentPeriodKey) {
        return false; // Don't allow submission for past periods
      }
    }
    
    return true;
  };

  const displayStatus: UserStatus | null = optimisticComplete && userStatus
    ? { type: 'completed', timestamp: Date.now(), checkIn: {} as any }
    : userStatus;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <ChallengeHeader
          title={challenge.title}
          groupName={group.name}
          groupId={group.id}
          cadence={challenge.cadence}
          type={challenge.type}
          onBack={() => navigation.goBack()}
          navigation={navigation}
        />

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
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F0ED',
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 40,
  },
});
