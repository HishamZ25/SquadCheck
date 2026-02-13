import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { CircleLoader } from '../../components/common/CircleLoader';
import { ChallengeHeader } from '../../components/challenge/ChallengeHeader';
import { StatusCard } from '../../components/challenge/StatusCard';
import { CheckInComposer, type CheckInDraft } from '../../components/challenge/CheckInComposer';
import { useColorMode } from '../../theme/ColorModeContext';
import { ChallengeService } from '../../services/challengeService';
import { CheckInService } from '../../services/checkInService';
import { MessageService } from '../../services/messageService';
import { dateKeys } from '../../utils/dateKeys';
import { challengeEval } from '../../utils/challengeEval';
import { auth } from '../../services/firebase';

export const CheckInScreen = ({ navigation, route }: any) => {
  const { colors } = useColorMode();
  const challengeId = route?.params?.challengeId;
  const initialDetails = route?.params?.details;

  const [details, setDetails] = useState<any>(initialDetails ?? null);
  const [loading, setLoading] = useState(!initialDetails);
  const [submitting, setSubmitting] = useState(false);
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
          console.error('CheckInScreen load error:', e);
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

  const dueTimeLocal = challenge?.due?.dueTimeLocal || '23:59';
  const timezoneOffset = challenge?.due?.timezoneOffset ?? new Date().getTimezoneOffset();
  const submissionPeriodKey = dateKeys.getSubmissionPeriodDayKey(dueTimeLocal, timezoneOffset);
  const isDaily = challenge?.cadence?.unit === 'daily';
  const selectedPeriodKey = isDaily
    ? submissionPeriodKey
    : dateKeys.getWeekKey(new Date(), challenge?.cadence?.weekStartsOn ?? 0);

  const alreadySubmitted = details?.allRecentCheckIns?.some(
    (ci: any) =>
      ci.userId === userId &&
      (isDaily ? ci.period?.dayKey === submissionPeriodKey : ci.period?.weekKey === selectedPeriodKey)
  );

  const userStatus = challenge && group
    ? challengeEval.getUserStatus(challenge, userId, checkInsForCurrentPeriod, challengeMembers, selectedPeriodKey)
    : null;

  const countdownTargetDate =
    isDaily &&
    challenge &&
    !alreadySubmitted &&
    userStatus?.type === 'pending'
      ? dateKeys.getNextDueDate(dueTimeLocal, challenge.due?.deadlineDate, (challenge as any).type)
      : undefined;

  const buildCheckInRequirements = (c: any): string[] => {
    const list: string[] = [];
    const legacy = c?.requirements;
    if (Array.isArray(legacy) && legacy.length > 0) {
      list.push(...legacy.filter((r: any) => typeof r === 'string' && r.trim()));
    }
    if (c?.submission?.requireAttachment) list.push('Photo proof required');
    if (c?.submission?.requireText) list.push('Note or caption required');
    if (c?.submission?.minTextLength) list.push(`Minimum ${c.submission.minTextLength} characters for text`);
    if (c?.submission?.minValue != null && c?.submission?.inputType === 'number') {
      list.push(`Minimum value: ${c.submission.minValue}${c.submission.unitLabel ? ` ${c.submission.unitLabel}` : ''}`);
    }
    if (c?.submission?.minValue != null && c?.submission?.inputType === 'timer') {
      list.push(`Minimum time: ${Math.floor(c.submission.minValue / 60)} minutes`);
    }
    return list;
  };

  const handleSubmitCheckIn = async (draft: CheckInDraft) => {
    if (!challenge || !userId || submitInProgress.current) return;
    if (alreadySubmitted) return;
    submitInProgress.current = true;
    setSubmitting(true);

    try {
      let uploadedAttachments = draft.attachments || [];
      if (draft.attachments?.length) {
        uploadedAttachments = await Promise.all(
          draft.attachments.map(async (a: any) => ({
            type: a.type,
            uri: await MessageService.uploadImage(a.uri),
          }))
        );
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

      const checkInPromise = CheckInService.submitChallengeCheckIn(
        challenge.id,
        userId,
        challenge.groupId || null,
        challenge.cadence?.unit || 'daily',
        payload,
        uploadedAttachments,
        challengeDueTime,
        challengeTimezoneOffset
      );
      const messagePromise =
        challenge.groupId
          ? MessageService.sendCheckInMessage(
              challenge.groupId,
              userId,
              auth.currentUser?.displayName || 'User',
              caption,
              imageUrl,
              challenge.title
            )
          : Promise.resolve();

      await Promise.all([checkInPromise, messagePromise]);

      Alert.alert('Success', 'Check-in submitted!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error) {
      console.error('Check-in submit error:', error);
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
    <SafeAreaView style={[styles.container, styles.noScroll]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.flex}>
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
            {/* Rules & requirements - directly under pending, fills space until Add Photo */}
            {!alreadySubmitted && (challenge.description || buildCheckInRequirements(challenge).length > 0) && (
              <View style={[styles.rulesBox, { backgroundColor: colors.card, borderColor: colors.dividerLineTodo + '99' }]}>
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

          {/* Bottom: form (Add Photo, notes, submit) */}
          {!alreadySubmitted && (
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
        </View>
      </KeyboardAvoidingView>
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
  topSection: {
    flex: 1,
    minHeight: 0,
  },
  rulesBox: {
    marginHorizontal: 16,
    marginTop: 0,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    minHeight: 160,
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
  formWrap: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 16,
  },
});
