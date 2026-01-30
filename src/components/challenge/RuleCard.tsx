import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { challengeEval } from '../../utils/challengeEval';

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
  const progressTarget = type === 'progress' && challenge 
    ? challengeEval.computeProgressTarget(challenge) 
    : null;

  if (!description && !progressTarget) return null;

  return (
    <View style={styles.container}>
      {description && (
        <Text style={styles.description}>{description}</Text>
      )}

      {type === 'progress' && progressTarget !== null && (
        <Text style={styles.target}>
          Target: {progressTarget} {submission.unitLabel || 'units'}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },

  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },

  target: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
  },
});
