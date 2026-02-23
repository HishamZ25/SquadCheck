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
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { GroupHeader, ChatTab, LeaderboardTab, SettingsTab } from '../../components/group';
import { GroupService } from '../../services/groupService';
import { MessageService, GroupChatMessage } from '../../services/messageService';
import { ChallengeService } from '../../services/challengeService';
import { Group, User, Challenge } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import { useColorMode } from '../../theme/ColorModeContext';
import { useCurrentUser } from '../../contexts/UserContext';
import { userCache } from '../../services/userCache';

type GroupChatScreenProps = StackScreenProps<any, 'GroupChat'>;

export const GroupChatScreen: React.FC<GroupChatScreenProps> = ({ navigation, route }) => {
  const { colors } = useColorMode();
  const { user } = useCurrentUser();
  const { groupId } = route.params || {};
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'leaderboard' | 'settings'>('chat');
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<GroupChatMessage[]>([]);
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

      const groupData = await GroupService.getGroup(groupId);
      setGroup(groupData);

      // Load group members and challenges in parallel
      if (groupData) {
        const [members, challenges] = await Promise.all([
          loadGroupMembers(groupData),
          loadGroupChallenges(groupId, groupData),
        ]);
        setGroupMembers(members);
        setGroupChallenges(challenges);
      }
      // Messages are provided by the onSnapshot listener — no need for a separate fetch
    } catch (error) {
      if (__DEV__) console.error('Error loading group data:', error);
      Alert.alert('Error', 'Failed to load group data');
    } finally {
      setLoading(false);
    }
  };

  const loadGroupMembers = async (groupData: Group): Promise<User[]> => {
    try {
      const memberMap = await userCache.getUsers(groupData.memberIds);
      return Array.from(memberMap.values());
    } catch (error) {
      if (__DEV__) console.error('Error loading group members:', error);
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
        const extra = (
          await Promise.all(missingIds.map((id) => ChallengeService.getChallenge(id)))
        ).filter((ch): ch is Challenge => ch !== null);
        const merged = [...byGroupId];
        for (const ch of extra) {
          if (!merged.some((c) => c.id === ch.id)) merged.push(ch);
        }
        merged.sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
        return merged;
      }
      return byGroupId;
    } catch (error) {
      if (__DEV__) console.error('Error loading group challenges:', error);
      return [];
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !user || !groupId) return;

    try {
      await MessageService.sendTextMessage(groupId, user.id, user.displayName, messageText.trim());
      setMessageText('');
    } catch (error) {
      if (__DEV__) console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  const handleUpvote = async (messageId: string) => {
    if (!user?.id) return;
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return;
    try {
      await MessageService.toggleUpvote(messageId, user.id, msg.userId);
    } catch (e) {
      if (__DEV__) console.error('Upvote error:', e);
    }
  };

  const handleDownvote = async (messageId: string, _reason: string) => {
    if (!user?.id) return;
    try {
      await MessageService.toggleDownvote(messageId, user.id);
    } catch (e) {
      if (__DEV__) console.error('Downvote error:', e);
    }
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

  const handleLeaveGroup = () => {
    if (!group || !user?.id) return;
    Alert.alert(
      'Leave Group',
      'Are you sure you want to leave this group? You will be removed from all active challenges in this group.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await GroupService.removeMember(group.id, user.id);
              navigation.goBack();
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to leave group');
            }
          },
        },
      ],
    );
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
        return <LeaderboardTab members={groupMembers} messages={messages} currentUserId={user?.id} groupId={groupId} />;
      case 'settings':
        return (
          <SettingsTab
            description={(group as any)?.description || null}
            members={groupMembers}
            groupMembers={groupMembers}
            challenges={groupChallenges}
            onChallengePress={handleChallengePress}
            onInvitePress={() =>
              navigation.navigate('InviteToGroup', {
                groupId: group.id,
                groupName: group.name,
              })
            }
            onLeaveGroup={handleLeaveGroup}
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
