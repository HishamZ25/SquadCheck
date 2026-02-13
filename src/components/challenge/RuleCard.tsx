import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { challengeEval } from '../../utils/challengeEval';
import { useColorMode } from '../../theme/ColorModeContext';

type ChallengeType = "standard" | "progress" | "elimination" | "deadline";
type InputType = "boolean" | "number" | "text" | "timer";

interface RuleCardProps {
  description?: string;
  type: ChallengeType;
  submission: {
    inputType: InputType;
    unitLabel?: string;
    minValue?: number;
    requireAttachment?: boolean;
    requireText?: boolean;
    minTextLength?: number;
  };
  due: {
    deadlineDate?: string;
  };
  rules?: {
    progress?: {
      startsAt: number;
      increaseBy: number;
      comparison: "gte" | "lte";
    };
    elimination?: {
      strikesAllowed: number;
      eliminateOn: "miss" | "failedRequirement";
    };
    deadline?: {
      targetValue?: number;
      comparison?: "gte" | "lte";
    };
  };
  challenge: any; // Full challenge object for progress target computation
}

export const RuleCard: React.FC<RuleCardProps> = ({
  description,
  type,
  submission,
  challenge,
}) => {
  const { colors } = useColorMode();
  const progressTarget = type === 'progress' && challenge 
    ? challengeEval.computeProgressTarget(challenge) 
    : null;

  if (!description && !progressTarget) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.dividerLineTodo + '99' }]}>
      {description && (
        <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
      )}

      {type === 'progress' && progressTarget !== null && (
        <Text style={[styles.target, { color: colors.accent }]}>
          Target: {progressTarget} {submission.unitLabel || 'units'}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  target: {
    fontSize: 14,
    fontWeight: '600',
  },
});
