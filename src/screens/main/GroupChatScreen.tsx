import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { CheckInModal } from '../../components/common/CheckInModal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { GroupHeader, ChatTab, LeaderboardTab, SettingsTab } from '../../components/group';
import { GroupService } from '../../services/groupService';
import { AuthService } from '../../services/authService';
import { MessageService, GroupChatMessage } from '../../services/messageService';
import { ChallengeService } from '../../services/challengeService';
import { processMissedCheckIns, processProgressionIntervals } from '../../services/missedCheckInService';
import { Group, User, Challenge } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useColorMode } from '../../theme/ColorModeContext';

type GroupChatScreenProps = StackScreenProps<any, 'GroupChat'>;

export const GroupChatScreen: React.FC<GroupChatScreenProps> = ({ navigation, route }) => {
  const { colors } = useColorMode();
  const { groupId } = route.params || {};
  const [group, setGroup] = useState<Group | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'leaderboard' | 'settings'>('chat');
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<GroupChatMessage[]>([]);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [groupMembers, setGroupMembers] = useState<User[]>([]);
  const [groupChallenges, setGroupChallenges] = useState<Challenge[]>([]);

  useEffect(() => {
    if (groupId) {
      loadData();

      // Set up real-time listener for messages
      const unsubscribe = MessageService.subscribeToGroupMessages(groupId, (newMessages) => {
        setMessages(newMessages);
      });

      return () => unsubscribe();
    }
  }, [groupId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load all data in parallel (messages are the single source for chat - we no longer merge check-ins to avoid duplicates)
      const [groupData, currentUser, realMessages] = await Promise.all([
        GroupService.getGroup(groupId),
        AuthService.getCurrentUser(),
        MessageService.getGroupMessages(groupId),
      ]);

      setGroup(groupData);
      setUser(currentUser);

      // Load group members and challenges (for leaderboard/settings; leaderboard uses messages with type 'checkin')
      if (groupData) {
        const [members, challenges] = await Promise.all([
          loadGroupMembers(groupData),
          loadGroupChallenges(groupId, groupData),
        ]);
        setGroupMembers(members);
        setGroupChallenges(challenges);
        // Defer automation so UI paints first; then run missed check-ins and progression
        const runAutomation = () => {
          processMissedCheckIns(groupId, challenges, members).catch((err) =>
            __DEV__ && console.warn('Missed check-in automation:', err)
          );
          processProgressionIntervals(groupId, challenges).catch((err) =>
            __DEV__ && console.warn('Progression interval automation:', err)
          );
        };
        if (typeof requestAnimationFrame !== 'undefined') {
          requestAnimationFrame(() => setTimeout(runAutomation, 0));
        } else {
          setTimeout(runAutomation, 0);
        }
      }

      // Chat shows only messages from Firestore (each group check-in already sends one message via sendCheckInMessage)
      const sortedMessages = [...realMessages].sort(
        (a, b) => (b.timestamp?.getTime?.() || 0) - (a.timestamp?.getTime?.() || 0)
      );
      setMessages(sortedMessages);
    } catch (error) {
      console.error('Error loading group data:', error);
      Alert.alert('Error', 'Failed to load group data');
    } finally {
      setLoading(false);
    }
  };

  const loadGroupMembers = async (groupData: Group): Promise<User[]> => {
    try {
      const memberPromises = groupData.memberIds.map((memberId) =>
        getDoc(doc(db, 'users', memberId))
          .then((userDoc) => (userDoc.exists() ? (userDoc.data() as User) : null))
          .catch(() => null)
      );

      const members = (await Promise.all(memberPromises)).filter((m): m is User => m !== null);
      return members;
    } catch (error) {
      console.error('Error loading group members:', error);
      return [];
    }
  };

  const loadGroupChallenges = async (
    groupId: string,
    groupData: Group | null
  ): Promise<Challenge[]> => {
    try {
      const challengeIdsFromGroup = (groupData as any)?.challengeIds as string[] | undefined;
      const byGroupId = await ChallengeService.getGroupChallenges(groupId);

      if (challengeIdsFromGroup?.length) {
        const existingIds = new Set(byGroupId.map((c) => c.id));
        const missingIds = challengeIdsFromGroup.filter((id) => id && !existingIds.has(id));
        const extra: Challenge[] = [];
        for (const id of missingIds) {
          const ch = await ChallengeService.getChallenge(id);
          if (ch) extra.push(ch);
        }
        const merged = [...byGroupId];
        for (const ch of extra) {
          if (!merged.some((c) => c.id === ch.id)) merged.push(ch);
        }
        merged.sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
        return merged;
      }
      return byGroupId;
    } catch (error) {
      console.error('Error loading group challenges:', error);
      return [];
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !user || !groupId) return;

    try {
      await MessageService.sendTextMessage(groupId, user.id, user.displayName, messageText.trim());
      setMessageText('');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  const handleUpvote = async (messageId: string) => {
    Alert.alert('Success!', 'Upvote functionality will be implemented soon!');
  };

  const handleDownvote = async (messageId: string, reason: string) => {
    Alert.alert('Disputed!', `Reason: ${reason}\n\nDownvote functionality will be implemented soon!`);
  };

  const handleAIJudge = async (messageId: string) => {
    Alert.alert('AI Judge', 'AI judgment functionality will be implemented soon!');
  };

  const handleChallengePress = (challenge: Challenge) => {
    navigation.navigate('ChallengeDetail', {
      challengeId: challenge.id,
      currentUserId: user?.id || '',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  if (!group) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#E53935" />
          <Text style={[styles.errorText, { color: colors.text }]}>Group not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'chat':
        return (
          <ChatTab
            messages={messages}
            messageText={messageText}
            onMessageTextChange={setMessageText}
            onSendMessage={handleSendMessage}
            onUpvote={handleUpvote}
            onDownvote={handleDownvote}
            onAIJudge={handleAIJudge}
            currentUserId={user?.id}
          />
        );
      case 'leaderboard':
        return <LeaderboardTab members={groupMembers} messages={messages} />;
      case 'settings':
        return (
          <SettingsTab
            description={(group as any)?.description || null}
            members={groupMembers}
            challenges={groupChallenges}
            onChallengePress={handleChallengePress}
            onInvitePress={() =>
              navigation.navigate('InviteToGroup', {
                groupId: group.id,
                groupName: group.name,
              })
            }
          />
        );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <GroupHeader
          group={group}
          onBack={() => navigation.goBack()}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        {renderTabContent()}
      </KeyboardAvoidingView>

      <CheckInModal
        visible={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
        group={group}
        onSubmit={async (caption: string, imageUri: string | null) => {
          // Handle check-in submission
          setShowCheckInModal(false);
          Alert.alert('Success', 'Check-in submitted!');
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    marginTop: 16,
    textAlign: 'center',
  },
});
