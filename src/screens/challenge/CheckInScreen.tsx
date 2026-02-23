import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { CircleLoader } from '../../components/common/CircleLoader';
import { ChallengeHeader } from '../../components/challenge/ChallengeHeader';
import { StatusCard } from '../../components/challenge/StatusCard';
import { CheckInComposer, type CheckInDraft } from '../../components/challenge/CheckInComposer';
import { CheckInSuccessModal } from '../../components/common/CheckInSuccessModal';
import { useColorMode } from '../../theme/ColorModeContext';
import { ChallengeService } from '../../services/challengeService';
import { CheckInService, CheckInResult } from '../../services/checkInService';
import { MessageService } from '../../services/messageService';
import { dateKeys } from '../../utils/dateKeys';
import { challengeEval } from '../../utils/challengeEval';
import { resolveAdminTimeZone, getAdminZoneDayKey, getCurrentPeriodDayKey, getCurrentPeriodWeekKey } from '../../utils/dueTime';
import { buildCheckInRequirements } from '../../utils/challengeHelpers';
import { ENCOURAGEMENT_MESSAGES } from '../../constants/gamification';
import { auth } from '../../services/firebase';

export const CheckInScreen = ({ navigation, route }: any) => {
  const { colors } = useColorMode();
  const challengeId = route?.params?.challengeId;
  const initialDetails = route?.params?.details;

  const [details, setDetails] = useState<any>(initialDetails ?? null);
  const [loading, setLoading] = useState(!initialDetails);
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<CheckInResult | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const submitInProgress = useRef(false);

  const userId = auth.currentUser?.uid || '';

  useEffect(() => {
    if (!challengeId) {
      navigation.goBack();
      return;
    }
    if (initialDetails) {
      setDetails(initialDetails);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const d = await ChallengeService.getChallengeDetails(challengeId, userId);
        if (!cancelled) setDetails(d);
      } catch (e) {
        if (!cancelled) {
          if (__DEV__) console.error('CheckInScreen load error:', e);
          Alert.alert('Error', 'Failed to load challenge');
          navigation.goBack();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [challengeId, userId, initialDetails]);

  const challenge = details?.challenge;
  const group = details?.group;
  const checkInsForCurrentPeriod = details?.checkInsForCurrentPeriod ?? [];
  const challengeMembers = details?.challengeMembers ?? [];

  // Wrap render-time computations in try/catch to prevent silent native crashes
  let submissionPeriodKey = '';
  let selectedPeriodKey = '';
  let myPeriodCheckIns: any[] = [];
  let alreadySubmitted = false;
  let userStatus: ReturnType<typeof challengeEval.getUserStatus> | null = null;
  let countdownTargetDate: Date | undefined;
  const dueTimeLocal = challenge?.due?.dueTimeLocal || '23:59';
  const adminTz = challenge ? resolveAdminTimeZone(challenge) : 'UTC';
  const isDaily = challenge?.cadence?.unit === 'daily';
  const isDeadline = challenge?.type === 'deadline';

  try {
    submissionPeriodKey = isDaily
      ? (isDeadline ? getAdminZoneDayKey(adminTz) : getCurrentPeriodDayKey(adminTz, dueTimeLocal))
      : getCurrentPeriodWeekKey(adminTz, challenge?.cadence?.weekStartsOn ?? 0, new Date());
    selectedPeriodKey = submissionPeriodKey;

    myPeriodCheckIns = details?.allRecentCheckIns?.filter(
      (ci: any) =>
        ci.userId === userId && ci.status === 'completed' &&
        (isDaily ? ci.period?.dayKey === submissionPeriodKey : ci.period?.weekKey === selectedPeriodKey)
    ) || [];
    const requiredForPeriod = isDaily ? 1 : (challenge?.cadence?.requiredCount || 1);
    alreadySubmitted = myPeriodCheckIns.length >= requiredForPeriod;

    if (challenge && group) {
      userStatus = challengeEval.getUserStatus(challenge, userId, checkInsForCurrentPeriod, challengeMembers, selectedPeriodKey);
    }

    // Always count down to the daily due time, not the deadline date
    if (isDaily && challenge && !alreadySubmitted && userStatus?.type === 'pending') {
      countdownTargetDate = dateKeys.getNextDueDate(dueTimeLocal, undefined, undefined, challenge.adminTimeZone);
    }
  } catch (e) {
    if (__DEV__) console.error('CheckInScreen render computation error:', e);
  }


  const handleSubmitCheckIn = async (draft: CheckInDraft) => {
    if (!challenge || !userId || submitInProgress.current) return;
    if (alreadySubmitted) return;
    submitInProgress.current = true;
    setSubmitting(true);

    try {
      let uploadedAttachments = draft.attachments || [];
      if (draft.attachments?.length) {
        // Upload sequentially to avoid concurrent blob fetch crashes on RN
        const uploaded: Array<{ type: 'photo' | 'screenshot'; uri: string }> = [];
        for (const a of draft.attachments) {
          const uri = await MessageService.uploadImage(a.uri);
          uploaded.push({ type: a.type, uri });
        }
        uploadedAttachments = uploaded;
      }

      const payload: any = {};
      if (draft.booleanValue !== undefined) payload.booleanValue = draft.booleanValue;
      if (draft.numberValue !== undefined) payload.numberValue = draft.numberValue;
      if (draft.textValue !== undefined) payload.textValue = draft.textValue;
      if (draft.timerSeconds !== undefined) payload.timerSeconds = draft.timerSeconds;

      const challengeDueTime = challenge.due?.dueTimeLocal || '23:59';
      const challengeTimezoneOffset = challenge.due?.timezoneOffset ?? new Date().getTimezoneOffset();
      const caption = draft.textValue || 'Completed check-in';
      const imageUrl = uploadedAttachments.length > 0 ? uploadedAttachments[0].uri : null;

      const checkInResult = await CheckInService.submitChallengeCheckIn(
        challenge.id,
        userId,
        challenge.groupId || null,
        challenge.cadence?.unit || 'daily',
        payload,
        uploadedAttachments,
        challengeDueTime,
        challengeTimezoneOffset
      );

      // Send chat message (non-blocking — don't let messaging failure block success)
      if (challenge.groupId) {
        MessageService.sendCheckInMessage(
          challenge.groupId,
          userId,
          auth.currentUser?.displayName || 'User',
          caption,
          imageUrl,
          challenge.title,
          checkInResult?.streakResult?.currentStreak ?? 0,
        ).catch((e) => {
          if (__DEV__) console.error('Chat message error (non-blocking):', e);
        });
      }

      setSuccessData(checkInResult);
      setShowSuccessModal(true);
    } catch (error) {
      if (__DEV__) console.error('Check-in submit error:', error);
      Alert.alert('Error', 'Failed to submit check-in');
    } finally {
      submitInProgress.current = false;
      setSubmitting(false);
    }
  };

  if (loading || !challenge || !group) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingWrap}>
          <CircleLoader dotColor={colors.accent} size="large" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentCheckIn = checkInsForCurrentPeriod.find((ci: any) => ci.userId === userId);

  return (
    <SafeAreaView style={[styles.container, styles.noScroll, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Top: Header ("Check In" + challenge name), Pending, Rules box */}
          <View style={styles.topSection}>
            <ChallengeHeader
              title="Check In"
              challengeName={challenge.title || (challenge as any).name || 'Untitled Challenge'}
              groupName={group.name}
              groupId={group.id}
              cadence={challenge.cadence}
              type={challenge.type}
              onBack={() => navigation.goBack()}
              navigation={navigation}
            />
            {userStatus && (
              <StatusCard
                status={userStatus}
                currentCheckIn={currentCheckIn}
                countdownTargetDate={countdownTargetDate}
              />
            )}
            {/* Rules & requirements */}
            {!alreadySubmitted && !submitting && (challenge.description || buildCheckInRequirements(challenge).length > 0) && (
              <View style={[styles.rulesBox, { backgroundColor: colors.card, borderColor: colors.accent + '60' }]}>
                <Text style={[styles.rulesTitle, { color: colors.text }]}>Rules & requirements</Text>
                {challenge.description ? (
                  <Text style={[styles.rulesDescription, { color: colors.textSecondary }]}>{challenge.description}</Text>
                ) : null}
                {buildCheckInRequirements(challenge).length > 0 ? (
                  <View style={styles.requirementsList}>
                    {buildCheckInRequirements(challenge).filter(Boolean).map((req: string, idx: number) => (
                      <Text key={idx} style={[styles.requirementItem, { color: colors.textSecondary }]}>
                        • {req}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </View>
            )}
          </View>

          {/* Submitting loader */}
          {submitting && (
            <View style={styles.submittingWrap}>
              <CircleLoader dotColor={colors.accent} size="large" />
              <Text style={[styles.submittingText, { color: colors.textSecondary }]}>Submitting check-in...</Text>
            </View>
          )}

          {/* Bottom: form (Add Photo, notes, submit) */}
          {!alreadySubmitted && !submitting && (
            <View style={styles.formWrap}>
              <CheckInComposer
                inputType={challenge.submission?.inputType || 'boolean'}
                unitLabel={challenge.submission?.unitLabel}
                minValue={challenge.submission?.minValue}
                requireAttachment={challenge.submission?.requireAttachment ?? false}
                requireText={challenge.submission?.requireText}
                minTextLength={challenge.submission?.minTextLength}
                onSubmit={handleSubmitCheckIn}
                disabled={alreadySubmitted || submitting}
                showNotesField={true}
                isModal={true}
                compact={true}
                showPhotoPicker={true}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Modal */}
      <CheckInSuccessModal
        visible={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          navigation.goBack();
        }}
        xpEarned={successData?.xpResult.xpEarned ?? 0}
        streak={successData?.streakResult.currentStreak ?? 0}
        leveledUp={successData?.xpResult.leveledUp ?? false}
        newLevel={successData?.xpResult.newLevel ?? 1}
        newTitle={successData?.xpResult.newTitle ?? 'Rookie'}
        isNewMilestone={successData?.streakResult.isNewMilestone ?? false}
        milestoneValue={successData?.streakResult.milestoneValue ?? 0}
        shieldEarned={successData?.streakResult.shieldEarned ?? false}
        dailyBonusAwarded={successData?.dailyBonusAwarded ?? false}
        dailyBonusXP={successData?.dailyBonusXP ?? 0}
        encouragement={ENCOURAGEMENT_MESSAGES[Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.length)]}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F0ED',
  },
  noScroll: {
    flex: 1,
  },
  flex: { flex: 1 },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 16 },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  topSection: {
  },
  rulesBox: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  rulesTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  rulesDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  requirementsList: {
    gap: 2,
  },
  requirementItem: {
    fontSize: 14,
    lineHeight: 20,
  },
  submittingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  submittingText: {
    fontSize: 16,
  },
  formWrap: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 16,
  },
});
