import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { CheckInModal } from '../../components/common/CheckInModal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { GroupHeader } from '../../components/group/GroupHeader';
import { Theme } from '../../constants/theme';
import { GroupService } from '../../services/groupService';
import { AuthService } from '../../services/authService';
import { MessageService, GroupChatMessage } from '../../services/messageService';
import { ChallengeService } from '../../services/challengeService';
import { Group, User, Challenge } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

type GroupChatScreenProps = StackScreenProps<any, 'GroupChat'>;

export const GroupChatScreen: React.FC<GroupChatScreenProps> = ({ navigation, route }) => {
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
        console.log('Real-time update - messages:', newMessages.length);
        const checkIns = newMessages.filter(m => m.type === 'checkin');
        console.log('Check-in messages in real-time update:', checkIns.length);
        setMessages(newMessages);
      });
      
      // Cleanup subscription on unmount
      return () => unsubscribe();
    }
  }, [groupId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel for better performance
      const [groupData, currentUser, realMessages] = await Promise.all([
        GroupService.getGroup(groupId),
        AuthService.getCurrentUser(),
        MessageService.getGroupMessages(groupId)
      ]);
      
      setGroup(groupData);
      setUser(currentUser);
      setMessages(realMessages);
      
      console.log('Loaded messages for group:', groupId, 'count:', realMessages.length);
      const checkInMessages = realMessages.filter(m => m.type === 'checkin');
      console.log('Check-in messages:', checkInMessages.length, checkInMessages);
      
      // Load group members and challenges in parallel
      if (groupData) {
        await Promise.all([
          loadGroupMembers(groupData),
          loadGroupChallenges(groupId)
        ]);
      }
    } catch (error) {
      console.error('Error loading group data:', error);
      Alert.alert('Error', 'Failed to load group data');
    } finally {
      setLoading(false);
    }
  };

  const loadGroupMembers = async (groupData: Group) => {
    try {
      // Fetch all member documents in parallel instead of sequentially
      const memberPromises = groupData.memberIds.map(memberId => 
        getDoc(doc(db, 'users', memberId))
          .then(userDoc => userDoc.exists() ? userDoc.data() as User : null)
          .catch(error => {
            console.error('Error loading member:', error);
            return null;
          })
      );
      
      const members = (await Promise.all(memberPromises)).filter((m): m is User => m !== null);
      setGroupMembers(members);
    } catch (error) {
      console.error('Error loading group members:', error);
    }
  };

  const loadGroupChallenges = async (groupId: string) => {
    try {
      const challenges = await ChallengeService.getGroupChallenges(groupId);
      setGroupChallenges(challenges as Challenge[]);
    } catch (error) {
      console.error('Error loading group challenges:', error);
    }
  };

  const handleCheckInSubmit = async (caption: string, imageUri: string | null) => {
    if (!user || !groupId) return;
    
    try {
      // Upload image to Firebase Storage if provided
      let imageUrl = null;
      if (imageUri) {
        imageUrl = await MessageService.uploadImage(imageUri);
      }
      
      // Send check-in message to Firestore
      await MessageService.sendCheckInMessage(
        groupId,
        user.id,
        user.displayName,
        caption,
        imageUrl
      );
      
      // Close modal and show success
      setShowCheckInModal(false);
      Alert.alert('Success!', 'Check-in submitted successfully!');
    } catch (error) {
      console.error('Error submitting check-in:', error);
      Alert.alert('Error', 'Failed to submit check-in. Please try again.');
    }
  };

  const handleUpvote = async (messageId: string) => {
    try {
      // TODO: Implement upvote in Firebase
      // For now, just show a success message
      Alert.alert('Upvoted!', 'Upvote functionality will be implemented soon!');
    } catch (error) {
      console.error('Error upvoting:', error);
      Alert.alert('Error', 'Failed to upvote. Please try again.');
    }
  };

  const handleDownvote = async (messageId: string, reason: string) => {
    try {
      // TODO: Implement downvote in Firebase
      // For now, just show a success message
      Alert.alert('Disputed!', `Reason: ${reason}\n\nDownvote functionality will be implemented soon!`);
    } catch (error) {
      console.error('Error downvoting:', error);
      Alert.alert('Error', 'Failed to downvote. Please try again.');
    }
  };

  const handleAIJudge = async (messageId: string) => {
    try {
      // TODO: Implement AI judgment
      Alert.alert('AI Judge', 'AI judgment functionality will be implemented soon!');
    } catch (error) {
      console.error('Error with AI judgment:', error);
      Alert.alert('Error', 'Failed to get AI judgment. Please try again.');
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !user || !groupId) return;
    
    try {
      // Send message to Firestore
      await MessageService.sendTextMessage(
        groupId,
        user.id,
        user.displayName,
        messageText.trim()
      );
      
      // Clear input - message will appear via real-time listener
      setMessageText('');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };



  const renderMessage = ({ item }: { item: GroupChatMessage }) => {
    const isOwnMessage = item.userId === user?.id;
    const isCheckIn = item.type === 'checkin';
    
    if (isCheckIn) {
      console.log('Rendering check-in message:', item.id, 'challengeTitle:', (item as any).challengeTitle, 'imageUrl:', item.imageUrl);
    }
    
    return (
      <View style={[styles.messageContainer, isOwnMessage && styles.ownMessage]}>
        {!isOwnMessage && (
          <Avatar
            source={undefined}
            initials={item.userName.charAt(0)}
            size="sm"
            style={styles.messageAvatar}
          />
        )}
        
        <View style={[
          styles.messageBubble, 
          isOwnMessage && styles.ownMessageBubble,
          isCheckIn && styles.checkInMessageBubble
        ]}>
          {!isOwnMessage && (
            <Text style={styles.messageUserName}>{item.userName}</Text>
          )}
          
          {isCheckIn ? (
            // Check-In Message
            <View style={styles.checkInContent}>
              {/* Challenge Title */}
              {(item as any).challengeTitle && (
                <View style={styles.challengeTitleContainer}>
                  <Ionicons name="trophy" size={16} color="#FF6B35" />
                  <Text style={styles.challengeTitle}>{(item as any).challengeTitle}</Text>
                </View>
              )}
              
              {/* Check-In Image */}
              {item.imageUrl && (
                <Image source={{ uri: item.imageUrl }} style={styles.checkInImage} />
              )}
              
              {/* Check-In Caption / Note */}
              {item.text && (
                <Text style={styles.checkInNote}>
                  {item.text}
                </Text>
              )}
              
              {/* Voting Buttons for Check-Ins */}
              <View style={styles.votingSection}>
                <TouchableOpacity 
                  style={styles.voteButton}
                  onPress={() => handleUpvote(item.id)}
                >
                  <Ionicons 
                    name="thumbs-up" 
                    size={18} 
                    color={(item.upvotes || 0) > 0 ? '#4CAF50' : Theme.colors.textSecondary} 
                  />
                  <Text style={styles.voteCount}>
                    {item.upvotes || 0}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.aiJudgeButton}
                  onPress={() => handleAIJudge(item.id)}
                >
                  <Text style={styles.aiJudgeButtonText}>
                    Judge with AI
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.voteButton}
                  onPress={() => handleDownvote(item.id, '')}
                >
                  <Ionicons 
                    name="thumbs-down" 
                    size={18} 
                    color={(item.downvotes || 0) > 0 ? '#F44336' : Theme.colors.textSecondary} 
                  />
                  <Text style={styles.voteCount}>
                    {item.downvotes || 0}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // Regular Message
            <>
              {item.type === 'text' ? (
                <Text style={[styles.messageText, isOwnMessage && styles.ownMessageText]}>
                  {item.text}
                </Text>
              ) : (
                <Image source={{ uri: item.imageUrl }} style={styles.messageImage} />
              )}
            </>
          )}
          
          <Text style={[styles.messageTime, isOwnMessage && styles.ownMessageTime]}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'chat':
        return (
          <>
            <FlatList
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={false}
              inverted
            />
            
            <View style={styles.chatInputContainer}>
              <TouchableOpacity 
                style={styles.cameraButton}
                onPress={() => setShowCheckInModal(true)}
              >
                <Ionicons name="camera" size={22} color="#FF6B35" />
              </TouchableOpacity>
              
              <TextInput
                style={styles.messageInput}
                placeholder="Type a message..."
                placeholderTextColor="#999"
                value={messageText}
                onChangeText={setMessageText}
                multiline
                maxLength={500}
              />
              
              <TouchableOpacity 
                style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
                onPress={handleSendMessage}
                disabled={!messageText.trim()}
              >
                <Ionicons 
                  name="arrow-forward" 
                  size={20} 
                  color="#FFF" 
                />
              </TouchableOpacity>
            </View>
          </>
        );
        
      case 'leaderboard':
        // Calculate leaderboard from messages (check-ins)
        const leaderboardData = groupMembers.map((member, index) => {
          const memberCheckIns = messages.filter(m => 
            m.userId === member.id && m.type === 'checkin'
          );
          const points = memberCheckIns.length * 10; // 10 points per check-in
          const streak = memberCheckIns.length; // Simple streak calculation
          
          return {
            id: member.id,
            rank: index + 1,
            name: member.displayName,
            points: points,
            streak: streak,
            avatar: member.photoURL || null,
          };
        }).sort((a, b) => b.points - a.points).map((item, index) => ({
          ...item,
          rank: index + 1
        }));
        
        return (
          <View style={styles.leaderboardContainer}>
            <Text style={styles.leaderboardTitle}>Group Leaderboard</Text>
            <Text style={styles.leaderboardSubtitle}>Ranked by check-in points</Text>
            
            {leaderboardData.length === 0 ? (
              <View style={styles.emptyLeaderboard}>
                <Ionicons name="trophy-outline" size={48} color={Theme.colors.textSecondary} />
                <Text style={styles.emptyLeaderboardText}>No check-ins yet</Text>
                <Text style={styles.emptyLeaderboardSubtext}>Check-ins will appear here</Text>
              </View>
            ) : (
              <FlatList
                data={leaderboardData}
                renderItem={({ item }) => (
                  <View style={styles.leaderboardItem}>
                    <View style={styles.rankContainer}>
                      <Text style={styles.rankText}>{item.rank}</Text>
                    </View>
                    
                    <Avatar
                      source={item.avatar}
                      initials={item.name.charAt(0)}
                      size="md"
                      style={styles.leaderboardAvatar}
                    />
                    
                    <View style={styles.leaderboardInfo}>
                      <Text style={styles.leaderboardName}>{item.name}</Text>
                      <Text style={styles.leaderboardStreak}>{item.streak} check-in{item.streak !== 1 ? 's' : ''}</Text>
                    </View>
                    
                    <View style={styles.pointsContainer}>
                      <Text style={styles.pointsText}>{item.points}</Text>
                      <Text style={styles.pointsLabel}>pts</Text>
                    </View>
                  </View>
                )}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        );
        
      case 'settings':
        return (
          <ScrollView 
            style={styles.settingsContainer} 
            contentContainerStyle={styles.settingsContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Group Description Card */}
            <View style={styles.settingsCard}>
              <Text style={styles.cardLabel}>About</Text>
              <Text style={styles.descriptionText}>{(group as any)?.description || 'No description'}</Text>
            </View>
            
            {/* Members List */}
            <View style={styles.settingsCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardLabel}>Members</Text>
                <Text style={styles.cardCount}>{groupMembers.length}</Text>
              </View>
              <View style={styles.membersList}>
                {groupMembers.map((member) => (
                  <View key={member.id} style={styles.memberRow}>
                    <Avatar
                      source={member.photoURL}
                      initials={member.displayName.charAt(0)}
                      size="sm"
                    />
                    <Text style={styles.memberNameText}>{member.displayName}</Text>
                  </View>
                ))}
              </View>
            </View>
            
            {/* Challenges List */}
            <View style={styles.settingsCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardLabel}>Challenges</Text>
                <Text style={styles.cardCount}>{groupChallenges.length}</Text>
              </View>
              {groupChallenges.length === 0 ? (
                <Text style={styles.emptyText}>No challenges yet</Text>
              ) : (
                <View style={styles.challengesList}>
                  {groupChallenges.map((challenge) => (
                    <TouchableOpacity 
                      key={challenge.id} 
                      style={styles.challengeRow}
                      onPress={async () => {
                        try {
                          const challengeDetails = await ChallengeService.getChallengeDetails(
                            challenge.id,
                            user?.id || ''
                          );
                          navigation.navigate('ChallengeDetail', challengeDetails);
                        } catch (error) {
                          console.error('Error loading challenge:', error);
                          Alert.alert('Error', 'Failed to load challenge');
                        }
                      }}
                    >
                      <View style={styles.challengeIconContainer}>
                        <Ionicons 
                          name={challenge.type === 'elimination' ? 'skull' : 'trophy'} 
                          size={18} 
                          color="#FF6B35" 
                        />
                      </View>
                      <View style={styles.challengeInfo}>
                        <Text style={styles.challengeNameText}>{challenge.title}</Text>
                        <Text style={styles.challengeTypeText}>
                          {challenge.cadence?.unit === 'daily' ? 'Daily' : `${challenge.cadence?.requiredCount || 1}x/week`}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#999" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            
            {/* Quick Stats */}
            <View style={styles.statsGrid}>
              <View style={styles.statsCardSmall}>
                <Ionicons name="people" size={24} color="#FF6B35" />
                <Text style={styles.statsNumber}>{groupMembers.length}</Text>
                <Text style={styles.statsLabel}>Members</Text>
              </View>
              <View style={styles.statsCardSmall}>
                <Ionicons name="calendar" size={24} color="#4CAF50" />
                <Text style={styles.statsNumber}>
                  {group?.createdAt ? Math.floor((Date.now() - new Date(group.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0}
                </Text>
                <Text style={styles.statsLabel}>Days Active</Text>
              </View>
            </View>
            
            {/* Invite Button */}
            <TouchableOpacity 
              style={styles.inviteButton}
              onPress={() => {
                Alert.alert(
                  'Invite Friends',
                  'Share this group with your friends. Coming soon!',
                  [{ text: 'OK' }]
                );
              }}
            >
              <Ionicons name="person-add" size={18} color="#FFF" />
              <Text style={styles.inviteButtonText}>Invite Friends</Text>
            </TouchableOpacity>
          </ScrollView>
        );
        
      default:
        return null;
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading group..." />;
  }

  if (!group) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Theme.colors.error} />
          <Text style={styles.errorText}>Group not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <GroupHeader
        name={group.name}
        onBack={() => navigation.goBack()}
      />

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'settings' && styles.activeTabButton]}
          onPress={() => setActiveTab('settings')}
        >
          <Ionicons 
            name="settings-outline" 
            size={20} 
            color={activeTab === 'settings' ? '#FFF' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'settings' && styles.activeTabText]}>
            Settings
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'chat' && styles.activeTabButton]}
          onPress={() => setActiveTab('chat')}
        >
          <Ionicons 
            name="chatbubbles-outline" 
            size={20} 
            color={activeTab === 'chat' ? '#FFF' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'chat' && styles.activeTabText]}>
            Chat
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'leaderboard' && styles.activeTabButton]}
          onPress={() => setActiveTab('leaderboard')}
        >
          <Ionicons 
            name="trophy-outline" 
            size={20} 
            color={activeTab === 'leaderboard' ? '#FFF' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'leaderboard' && styles.activeTabText]}>
            Leaderboard
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {renderTabContent()}
      </KeyboardAvoidingView>
      
      {/* Check-In Modal */}
      <CheckInModal
        visible={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
        onSubmit={handleCheckInSubmit}
        group={group}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F0ED',
  },
  
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F0ED',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 4,
  },
  
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#FFF',
    marginHorizontal: 4,
    borderRadius: 12,
    gap: 4,
    ...Theme.shadows.sm,
    shadowOpacity: 0.06,
    elevation: 1,
  },
  
  activeTabButton: {
    backgroundColor: '#FF6B35',
  },
  
  tabText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  
  activeTabText: {
    color: '#FFF',
    fontWeight: '700',
  },
  
  content: {
    flex: 1,
  },
  
  messagesList: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
  },
  
  messageContainer: {
    flexDirection: 'row',
    marginBottom: Theme.spacing.md,
    alignItems: 'flex-end',
  },
  
  ownMessage: {
    flexDirection: 'row-reverse',
  },
  
  messageAvatar: {
    marginHorizontal: Theme.spacing.xs,
    width: 28,
    height: 28,
  },
  
  messageBubble: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '75%',
    ...Theme.shadows.sm,
    shadowOpacity: 0.08,
    elevation: 1,
  },
  
  ownMessageBubble: {
    backgroundColor: '#FF6B35',
  },
  
  messageUserName: {
    ...Theme.typography.caption,
    color: '#666666', // Dark grey text
    marginBottom: Theme.spacing.xs,
    fontWeight: '600',
    fontSize: 11,
  },
  
  messageText: {
    ...Theme.typography.body,
    color: '#000000', // Black text
    lineHeight: 16,
    fontSize: 14,
  },
  
  ownMessageText: {
    color: Theme.colors.white,
  },
  
  messageImage: {
    width: 180,
    height: 120,
    borderRadius: Theme.borderRadius.md,
    marginBottom: Theme.spacing.xs,
  },
  
  messageTime: {
    ...Theme.typography.caption,
    color: '#999999', // Grey text
    marginTop: Theme.spacing.xs,
    alignSelf: 'flex-end',
    fontSize: 10,
  },
  
  ownMessageTime: {
    color: Theme.colors.white,
    opacity: 0.8,
  },
  
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F1F0ED',
  },
  
  cameraButton: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadows.sm,
    shadowOpacity: 0.06,
    elevation: 1,
  },
  
  messageInput: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 13,
    maxHeight: 100,
    height: 44,
    color: '#000',
    fontSize: 15,
    textAlignVertical: 'center',
    ...Theme.shadows.sm,
    shadowOpacity: 0.06,
    elevation: 1,
  },
  
  sendButton: {
    backgroundColor: '#FF6B35',
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadows.sm,
    shadowOpacity: 0.1,
    elevation: 2,
  },
  
  sendButtonDisabled: {
    backgroundColor: '#CCC',
    opacity: 0.5,
  },
  
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  errorText: {
    ...Theme.typography.body,
    color: Theme.colors.error,
  },
  
  // Leaderboard Styles
  leaderboardContainer: {
    flex: 1,
    padding: 16,
  },
  
  leaderboardTitle: {
    fontSize: 20,
    color: '#FF6B35',
    textAlign: 'center',
    marginBottom: 4,
    fontWeight: '700',
  },
  
  leaderboardSubtitle: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  
  emptyLeaderboard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  
  emptyLeaderboardText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    fontWeight: '600',
  },
  
  emptyLeaderboardSubtext: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
    ...Theme.shadows.sm,
    shadowOpacity: 0.06,
    elevation: 1,
  },
  
  rankContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  
  rankText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '700',
  },
  
  leaderboardAvatar: {
    marginRight: Theme.spacing.md,
  },
  
  leaderboardInfo: {
    flex: 1,
  },
  
  leaderboardName: {
    ...Theme.typography.body,
    color: '#000000',
    fontWeight: '600',
    marginBottom: Theme.spacing.xs,
  },
  
  leaderboardStreak: {
    ...Theme.typography.caption,
    color: '#666666',
  },
  
  pointsContainer: {
    alignItems: 'center',
  },
  
  pointsText: {
    ...Theme.typography.h3,
    color: '#FF6B35',
    fontWeight: 'bold',
  },
  
  pointsLabel: {
    ...Theme.typography.caption,
    color: '#666666',
    textTransform: 'uppercase',
  },
  
  // Settings Styles
  settingsContainer: {
    flex: 1,
  },
  
  settingsContent: {
    padding: 16,
    paddingBottom: 40,
  },
  
  settingsCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...Theme.shadows.sm,
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  
  cardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  
  cardCount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6B35',
  },
  
  membersList: {
    gap: 12,
  },
  
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  
  memberNameText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  
  challengesList: {
    gap: 10,
  },
  
  challengeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  
  challengeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  challengeInfo: {
    flex: 1,
  },
  
  challengeNameText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  
  challengeTypeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  
  statsCardSmall: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    ...Theme.shadows.sm,
    shadowOpacity: 0.06,
    elevation: 1,
  },
  
  statsNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginTop: 6,
  },
  
  statsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginTop: 2,
  },
  
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  
  rewardText: {
    ...Theme.typography.body,
    color: '#000000',
    marginLeft: Theme.spacing.sm,
  },
  
  penaltyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  
  penaltyText: {
    ...Theme.typography.body,
    color: '#000000',
    marginLeft: Theme.spacing.sm,
  },
  
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    ...Theme.shadows.sm,
    shadowOpacity: 0.1,
    gap: 8,
  },
  
  inviteButtonText: {
    fontSize: 15,
    color: '#FFF',
    fontWeight: '700',
  },
  
  infoLabel: {
    fontSize: 13,
    color: '#888888',
    fontWeight: '500',
    marginBottom: 2,
  },
  
  infoValue: {
    fontSize: 15,
    color: '#000000',
    fontWeight: '700',
  },
  
  // Check-In Message Styles
  checkInContent: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  
  challengeTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFF3E0',
  },
  
  challengeTitle: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '700',
    flex: 1,
  },
  
  checkInImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  
  checkInNote: {
    fontSize: 14,
    color: '#333',
    padding: 12,
    lineHeight: 20,
    fontWeight: '500',
  },
  
  checkInMessageBubble: {
    width: '90%',
    maxWidth: 400,
  },
  
  votingSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F8F8F8',
  },
  
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#FFF',
  },
  
  aiJudgeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FF6B35',
  },
  
  aiJudgeButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 11,
  },
  
  voteCount: {
    color: '#666',
    marginLeft: 6,
    fontWeight: '600',
    fontSize: 12,
  },
  
  voteCountActive: {
    color: Theme.colors.white,
  },
  
  // Requirements Styles
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  
  requirementText: {
    ...Theme.typography.body,
    color: '#000000',
    marginLeft: Theme.spacing.sm,
  },
  
  noRequirementsText: {
    ...Theme.typography.body,
    color: '#666666',
    fontStyle: 'italic',
  },
  
  descriptionText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    fontWeight: '400',
  },
  
  infoText: {
    fontSize: 15,
    color: '#000000',
    marginBottom: Theme.spacing.xs,
    fontWeight: '500',
  },
  
  infoSubtext: {
    fontSize: 13,
    color: '#888888',
    lineHeight: 18,
    marginTop: Theme.spacing.xs,
  },
}); 