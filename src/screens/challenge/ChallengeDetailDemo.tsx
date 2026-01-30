/**
 * Demo/Example of how to use ChallengeDetailScreen with mock data
 * Use this as a reference for wiring up real data
 */

import React from 'react';
import { View, Button, StyleSheet } from 'react-native';
import { dateKeys } from '../../utils/dateKeys';

// Mock data generator
export const generateMockChallengeData = (challengeType: 'standard' | 'progress' | 'elimination' | 'deadline' = 'standard') => {
  const currentUserId = 'user1';
  const currentDayKey = dateKeys.getDayKey();
  const currentWeekKey = dateKeys.getWeekKey();

  // Mock challenge based on type
  const challenges = {
    standard: {
      id: 'challenge1',
      groupId: 'group1',
      title: 'Daily Workout',
      description: 'Complete a 30-minute workout every day',
      type: 'standard' as const,
      cadence: {
        unit: 'daily' as const,
      },
      submission: {
        inputType: 'boolean' as const,
        requireAttachment: true,
      },
      due: {
        dueTimeLocal: '23:59',
        timezoneMode: 'userLocal' as const,
      },
      createdAt: Date.now() - (30 * 24 * 60 * 60 * 1000), // 30 days ago
    },
    progress: {
      id: 'challenge2',
      groupId: 'group1',
      title: 'Progressive Pushups',
      description: 'Increase your pushups weekly',
      type: 'progress' as const,
      cadence: {
        unit: 'weekly' as const,
        requiredCount: 3,
        weekStartsOn: 1 as const, // Monday
      },
      submission: {
        inputType: 'number' as const,
        unitLabel: 'pushups',
        minValue: 10,
      },
      due: {
        dueTimeLocal: '23:59',
        timezoneMode: 'userLocal' as const,
      },
      rules: {
        progress: {
          startsAt: 20,
          increaseBy: 5,
          increaseUnit: 'week' as const,
          comparison: 'gte' as const,
        },
      },
      createdAt: Date.now() - (14 * 24 * 60 * 60 * 1000), // 2 weeks ago
    },
    elimination: {
      id: 'challenge3',
      groupId: 'group1',
      title: 'Code Streak',
      description: 'Code for at least 1 hour daily - one miss and you\'re out!',
      type: 'elimination' as const,
      cadence: {
        unit: 'daily' as const,
      },
      submission: {
        inputType: 'timer' as const,
        minValue: 3600, // 60 minutes in seconds
        requireAttachment: true,
      },
      due: {
        dueTimeLocal: '23:59',
        timezoneMode: 'userLocal' as const,
      },
      rules: {
        elimination: {
          strikesAllowed: 0,
          eliminateOn: 'miss' as const,
        },
      },
      createdAt: Date.now() - (7 * 24 * 60 * 60 * 1000), // 1 week ago
    },
    deadline: {
      id: 'challenge4',
      groupId: 'group1',
      title: 'Marathon Training',
      description: 'Run 100 miles by month end',
      type: 'deadline' as const,
      cadence: {
        unit: 'weekly' as const,
        requiredCount: 1,
      },
      submission: {
        inputType: 'number' as const,
        unitLabel: 'miles',
        minValue: 1,
      },
      due: {
        dueTimeLocal: '23:59',
        timezoneMode: 'userLocal' as const,
        deadlineDate: '2026-02-28', // End of Feb
      },
      rules: {
        deadline: {
          targetValue: 100,
          comparison: 'gte' as const,
          progressMode: 'accumulate' as const,
        },
      },
      createdAt: Date.now() - (10 * 24 * 60 * 60 * 1000), // 10 days ago
    },
  };

  const challenge = challenges[challengeType];

  const group = {
    id: 'group1',
    name: 'Fitness Squad',
    memberIds: ['user1', 'user2', 'user3'],
  };

  // Mock check-ins for current period
  const checkInsForCurrentPeriod = [
    {
      id: 'checkin2',
      challengeId: challenge.id,
      groupId: 'group1',
      userId: 'user2',
      period: {
        unit: challenge.cadence.unit,
        dayKey: challenge.cadence.unit === 'daily' ? currentDayKey : undefined,
        weekKey: challenge.cadence.unit === 'weekly' ? currentWeekKey : undefined,
      },
      payload: {
        booleanValue: true,
      },
      status: 'completed' as const,
      createdAt: Date.now() - (2 * 60 * 60 * 1000), // 2 hours ago
    },
  ];

  // Mock recent check-ins for history
  const myRecentCheckIns = [];
  if (challenge.cadence.unit === 'daily') {
    // Last 7 days
    const last7Days = dateKeys.getLastNDays(7);
    for (let i = 0; i < 5; i++) { // Mock 5 completions
      myRecentCheckIns.push({
        id: `checkin-history-${i}`,
        challengeId: challenge.id,
        groupId: 'group1',
        userId: currentUserId,
        period: {
          unit: 'daily' as const,
          dayKey: last7Days[i],
        },
        payload: {
          booleanValue: true,
          numberValue: i % 2 === 0 ? 30 : undefined,
        },
        status: 'completed' as const,
        createdAt: Date.now() - ((7 - i) * 24 * 60 * 60 * 1000),
      });
    }
  } else {
    // Last 4 weeks
    const last4Weeks = dateKeys.getLastNWeeks(4);
    for (let i = 0; i < 3; i++) { // Mock 3 weeks
      // Add 2-3 check-ins per week
      const count = i === 0 ? 2 : 3;
      for (let j = 0; j < count; j++) {
        myRecentCheckIns.push({
          id: `checkin-history-${i}-${j}`,
          challengeId: challenge.id,
          groupId: 'group1',
          userId: currentUserId,
          period: {
            unit: 'weekly' as const,
            weekKey: last4Weeks[i],
          },
          payload: {
            numberValue: 20 + (i * 5) + j,
          },
          status: 'completed' as const,
          createdAt: Date.now() - ((4 - i) * 7 * 24 * 60 * 60 * 1000) + (j * 24 * 60 * 60 * 1000),
        });
      }
    }
  }

  const challengeMembers = [
    {
      challengeId: challenge.id,
      userId: 'user1',
      state: 'active' as const,
      strikes: 0,
    },
    {
      challengeId: challenge.id,
      userId: 'user2',
      state: 'active' as const,
      strikes: 0,
    },
    {
      challengeId: challenge.id,
      userId: 'user3',
      state: 'active' as const,
      strikes: 1,
    },
  ];

  const memberProfiles = {
    user1: { name: 'You (Alice)', avatarUri: undefined },
    user2: { name: 'Bob Smith', avatarUri: undefined },
    user3: { name: 'Charlie Brown', avatarUri: undefined },
  };

  return {
    challenge,
    group,
    currentUserId,
    checkInsForCurrentPeriod,
    myRecentCheckIns,
    challengeMembers,
    memberProfiles,
  };
};

// Demo screen to test navigation
interface ChallengeDetailDemoNavigatorProps {
  navigation: any;
}

export const ChallengeDetailDemoNavigator: React.FC<ChallengeDetailDemoNavigatorProps> = ({ navigation }) => {
  const testNavigation = (type: 'standard' | 'progress' | 'elimination' | 'deadline') => {
    const mockData = generateMockChallengeData(type);
    navigation.navigate('ChallengeDetail', mockData);
  };

  return (
    <View style={styles.container}>
      <Button title="Test Standard Challenge" onPress={() => testNavigation('standard')} />
      <Button title="Test Progress Challenge" onPress={() => testNavigation('progress')} />
      <Button title="Test Elimination Challenge" onPress={() => testNavigation('elimination')} />
      <Button title="Test Deadline Challenge" onPress={() => testNavigation('deadline')} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 20,
  },
});
