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
import { Theme } from '../../constants/theme';
import { GroupService } from '../../services/groupService';
import { AuthService } from '../../services/authService';
import { MessageService, GroupChatMessage } from '../../services/messageService';
import { Group, User } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';

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

  useEffect(() => {
    if (groupId) {
      loadData();
      
      // Set up real-time listener for messages
      const unsubscribe = MessageService.subscribeToGroupMessages(groupId, (newMessages) => {
        setMessages(newMessages);
      });
      
      // Cleanup subscription on unmount
      return () => unsubscribe();
    }
  }, [groupId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load group data
      const groupData = await GroupService.getGroup(groupId);
      setGroup(groupData);
      
      // Load current user
      const currentUser = await AuthService.getCurrentUser();
      setUser(currentUser);
      
      // Load real messages from Firestore
      if (groupId) {
        const realMessages = await MessageService.getGroupMessages(groupId);
        setMessages(realMessages);
      }
    } catch (error) {
      console.error('Error loading group data:', error);
      Alert.alert('Error', 'Failed to load group data');
    } finally {
      setLoading(false);
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
              {/* Check-In Header */}
              <View style={styles.checkInHeader}>
                <Text style={styles.checkInTitle}>{item.userName}'s Check-In</Text>
                <Text style={styles.checkInDate}>
                  {item.timestamp.toLocaleDateString([], { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Text>
              </View>
              
              {/* Check-In Image */}
              {item.imageUrl && (
                <Image source={{ uri: item.imageUrl }} style={styles.checkInImage} />
              )}
              
              {/* Check-In Caption */}
              <Text style={[styles.checkInCaption, isOwnMessage && styles.ownMessageText]}>
                {item.text}
              </Text>
              
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
                <Ionicons name="camera" size={24} color={Theme.colors.secondary} />
              </TouchableOpacity>
              
              <TextInput
                style={styles.messageInput}
                placeholder="Type a message..."
                placeholderTextColor={Theme.colors.textTertiary}
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
                  name="send" 
                  size={20} 
                  color={messageText.trim() ? Theme.colors.white : Theme.colors.textTertiary} 
                />
              </TouchableOpacity>
            </View>
          </>
        );
        
      case 'leaderboard':
        return (
          <View style={styles.leaderboardContainer}>
            <Text style={styles.leaderboardTitle}>Group Leaderboard</Text>
            <Text style={styles.leaderboardSubtitle}>Ranked by check-in points</Text>
            
            {/* Sample leaderboard data - will be replaced with real data */}
            <FlatList
              data={[
                { id: '1', rank: 1, name: 'HishamZ', points: 15, streak: 3, avatar: null },
                { id: '2', rank: 2, name: 'ImaRando', points: 12, streak: 2, avatar: null },
                { id: '3', rank: 3, name: 'User3', points: 8, streak: 1, avatar: null },
              ]}
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
                    <Text style={styles.leaderboardStreak}>{item.streak} day streak</Text>
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
          </View>
        );
        
      case 'settings':
        return (
          <ScrollView style={styles.settingsContainer} showsVerticalScrollIndicator={false}>
            <Text style={styles.settingsTitle}>Group Settings</Text>
            
            {/* Requirements Section */}
            <View style={styles.settingsSection}>
              <Text style={styles.sectionTitle}>Requirements</Text>
              {group?.requirements?.map((requirement, index) => (
                <View key={index} style={styles.requirementItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.requirementText}>{requirement}</Text>
                </View>
              )) || (
                <Text style={styles.noRequirementsText}>No requirements set</Text>
              )}
            </View>
            
            {/* Rewards Section */}
            <View style={styles.settingsSection}>
              <Text style={styles.sectionTitle}>Rewards</Text>
              {group?.rewards ? (
                <>
                  {group.rewards.points && (
                    <View style={styles.rewardItem}>
                      <Ionicons name="trophy" size={20} color="#FF6B35" />
                      <Text style={styles.rewardText}>Points: {group.rewards.points}</Text>
                    </View>
                  )}
                  {group.rewards.title && (
                    <View style={styles.rewardItem}>
                      <Ionicons name="star" size={20} color="#FFD700" />
                      <Text style={styles.rewardText}>Title: {group.rewards.title}</Text>
                    </View>
                  )}
                  {group.rewards.picture && (
                    <View style={styles.rewardItem}>
                      <Ionicons name="image" size={20} color="#4CAF50" />
                      <Text style={styles.rewardText}>Picture: {group.rewards.picture}</Text>
                    </View>
                  )}
                  {group.rewards.badge && (
                    <View style={styles.rewardItem}>
                      <Ionicons name="ribbon" size={20} color="#9C27B0" />
                      <Text style={styles.rewardText}>Badge: {group.rewards.badge}</Text>
                    </View>
                  )}
                  {!group.rewards.points && !group.rewards.title && !group.rewards.picture && !group.rewards.badge && (
                    <Text style={styles.noRewardsText}>No rewards set</Text>
                  )}
                </>
              ) : (
                <Text style={styles.noRewardsText}>No rewards set</Text>
              )}
            </View>
            
            {/* Penalties Section */}
            <View style={styles.settingsSection}>
              <Text style={styles.sectionTitle}>Penalties</Text>
              {group?.penalty ? (
                <View style={styles.penaltyItem}>
                  <Ionicons name="warning" size={20} color="#FF4444" />
                  <Text style={styles.penaltyText}>Penalty: {group.penalty} points</Text>
                </View>
              ) : (
                <View style={styles.penaltyItem}>
                  <Ionicons name="warning" size={20} color="#FF4444" />
                  <Text style={styles.penaltyText}>No penalty set</Text>
                </View>
              )}
            </View>
            
            {/* Invite Section */}
            <View style={styles.settingsSection}>
              <Text style={styles.sectionTitle}>Invite Friends</Text>
              <TouchableOpacity 
                style={styles.inviteButton}
                onPress={() => {
                  Alert.alert(
                    'Invite Friends',
                    'This will generate a deep link to invite friends to the group. Coming soon!',
                    [{ text: 'OK' }]
                  );
                }}
              >
                <Ionicons name="person-add" size={20} color={Theme.colors.white} />
                <Text style={styles.inviteButtonText}>Invite More Friends</Text>
              </TouchableOpacity>
            </View>
            
            {/* Group Info */}
            <View style={styles.settingsSection}>
              <Text style={styles.sectionTitle}>Group Info</Text>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Created:</Text>
                <Text style={styles.infoValue}>
                  {group?.createdAt ? 'Recently' : 'Unknown'}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Members:</Text>
                <Text style={styles.infoValue}>{group?.memberIds?.length || 0}</Text>
              </View>
            </View>
          </ScrollView>
        );
        
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="refresh" size={32} color={Theme.colors.gray400} />
          <Text style={styles.loadingText}>Loading group...</Text>
        </View>
      </SafeAreaView>
    );
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.groupName}>{group.name}</Text>
          <Text style={styles.groupGoal}>{group.goal}</Text>
        </View>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'settings' && styles.activeTabButton]}
          onPress={() => setActiveTab('settings')}
        >
          <Ionicons 
            name="settings-outline" 
            size={22} 
            color={activeTab === 'settings' ? '#FF6B35' : Theme.colors.textSecondary} 
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
            size={22} 
            color={activeTab === 'chat' ? '#FF6B35' : Theme.colors.textSecondary} 
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
            size={22} 
            color={activeTab === 'leaderboard' ? '#FF6B35' : Theme.colors.textSecondary} 
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
    backgroundColor: '#212529', // Dark theme background
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.layout.screenPadding,
    borderBottomWidth: 1,
    borderBottomColor: '#374151', // Darker border
    backgroundColor: '#374151', // Dark header background
  },
  
  headerInfo: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: Theme.spacing.md,
  },
  
  groupName: {
    ...Theme.typography.h4,
    marginBottom: Theme.spacing.xs,
    textAlign: 'center',
    fontWeight: '700',
    color: Theme.colors.white, // White text
  },
  
  groupGoal: {
    ...Theme.typography.bodySmall,
    color: '#9CA3AF', // Light grey text
    textAlign: 'center',
    lineHeight: 18,
  },
  
  headerPlaceholder: {
    width: 24,
  },
  
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#374151', // Dark tab background
    borderBottomWidth: 1,
    borderBottomColor: '#4B5563', // Darker border
    paddingHorizontal: Theme.spacing.md,
  },
  
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    marginHorizontal: Theme.spacing.xs,
  },
  
  activeTabButton: {
    borderBottomColor: '#FF6B35', // Orange accent
  },
  
  tabText: {
    ...Theme.typography.bodySmall,
    color: '#9CA3AF', // Light grey text
    fontWeight: '500',
    fontSize: 14,
  },
  
  activeTabText: {
    color: '#FF6B35', // Orange accent
    fontWeight: '600',
  },
  
  content: {
    flex: 1,
  },
  
  messagesList: {
    paddingHorizontal: Theme.spacing.md,
    paddingBottom: Theme.spacing.md,
  },
  
  messageContainer: {
    flexDirection: 'row',
    marginBottom: Theme.spacing.sm,
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
    backgroundColor: '#374151', // Dark card background
    borderRadius: 16,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    maxWidth: '75%',
    minHeight: 32,
    ...Theme.shadows.sm,
  },
  
  ownMessageBubble: {
    backgroundColor: '#FF6B35', // Orange accent
  },
  
  messageUserName: {
    ...Theme.typography.caption,
    color: '#9CA3AF', // Light grey text
    marginBottom: Theme.spacing.xs,
    fontWeight: '600',
    fontSize: 11,
  },
  
  messageText: {
    ...Theme.typography.body,
    color: Theme.colors.white, // White text
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
    color: '#6B7280', // Darker grey text
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
    alignItems: 'flex-end',
    padding: Theme.spacing.md,
    backgroundColor: '#374151', // Dark input background
    borderTopWidth: 1,
    borderTopColor: '#4B5563', // Darker border
  },
  
  cameraButton: {
    padding: Theme.spacing.sm,
    marginRight: Theme.spacing.sm,
    backgroundColor: '#FFF3E0', // Light orange background
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  messageInput: {
    flex: 1,
    backgroundColor: '#4B5563', // Darker input field
    borderRadius: 20,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    maxHeight: 80,
    minHeight: 40,
    color: Theme.colors.white, // White text
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#6B7280', // Dark border
  },
  
  sendButton: {
    backgroundColor: '#FF6B35', // Orange accent
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Theme.spacing.sm,
    ...Theme.shadows.sm,
  },
  
  sendButtonDisabled: {
    backgroundColor: '#4B5563', // Dark grey when disabled
  },
  
  placeholderContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.layout.screenPadding,
  },
  
  placeholderTitle: {
    ...Theme.typography.h3,
    marginTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.sm,
    color: '#9CA3AF', // Light grey text
  },
  
  placeholderSubtitle: {
    ...Theme.typography.bodySmall,
    color: '#6B7280', // Darker grey text
    textAlign: 'center',
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  loadingText: {
    ...Theme.typography.bodySmall,
    color: '#9CA3AF', // Light grey text
    marginTop: Theme.spacing.md,
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
    padding: Theme.spacing.md,
  },
  
  leaderboardTitle: {
    ...Theme.typography.h2,
    color: Theme.colors.white,
    textAlign: 'center',
    marginBottom: Theme.spacing.xs,
  },
  
  leaderboardSubtitle: {
    ...Theme.typography.bodySmall,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: Theme.spacing.lg,
  },
  
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  
  rankContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Theme.spacing.md,
  },
  
  rankText: {
    ...Theme.typography.h3,
    color: Theme.colors.white,
    fontWeight: 'bold',
  },
  
  leaderboardAvatar: {
    marginRight: Theme.spacing.md,
  },
  
  leaderboardInfo: {
    flex: 1,
  },
  
  leaderboardName: {
    ...Theme.typography.body,
    color: Theme.colors.white,
    fontWeight: '600',
    marginBottom: Theme.spacing.xs,
  },
  
  leaderboardStreak: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
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
    color: Theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  
  // Settings Styles
  settingsContainer: {
    flex: 1,
    padding: Theme.spacing.md,
  },
  
  settingsTitle: {
    ...Theme.typography.h2,
    color: Theme.colors.white,
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
  },
  
  settingsSection: {
    backgroundColor: '#374151',
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    marginBottom: Theme.spacing.lg,
  },
  
  sectionTitle: {
    ...Theme.typography.h4,
    color: Theme.colors.white,
    marginBottom: Theme.spacing.md,
    fontWeight: '600',
  },
  
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  
  rewardText: {
    ...Theme.typography.body,
    color: Theme.colors.white,
    marginLeft: Theme.spacing.sm,
  },
  
  penaltyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  
  penaltyText: {
    ...Theme.typography.body,
    color: Theme.colors.white,
    marginLeft: Theme.spacing.sm,
  },
  
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.md,
    ...Theme.shadows.sm,
  },
  
  inviteButtonText: {
    ...Theme.typography.button,
    color: Theme.colors.white,
    marginLeft: Theme.spacing.sm,
    fontWeight: '600',
  },
  
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  
  infoLabel: {
    ...Theme.typography.body,
    color: Theme.colors.textSecondary,
  },
  
  infoValue: {
    ...Theme.typography.body,
    color: Theme.colors.white,
    fontWeight: '600',
  },
  
  // Check-In Message Styles
  checkInContent: {
    marginBottom: Theme.spacing.sm,
    backgroundColor: '#374151',
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  
  checkInHeader: {
    marginBottom: Theme.spacing.sm,
    paddingBottom: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#4B5563',
  },
  
  checkInTitle: {
    ...Theme.typography.h4,
    color: '#FF6B35',
    fontWeight: 'bold',
    marginBottom: Theme.spacing.xs,
  },
  
  checkInDate: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
    fontSize: 12,
  },
  
  checkInImage: {
    width: '100%',
    height: 180,
    borderRadius: Theme.borderRadius.md,
    marginBottom: Theme.spacing.sm,
    resizeMode: 'cover',
  },
  
  checkInCaption: {
    ...Theme.typography.body,
    color: Theme.colors.white,
    marginBottom: Theme.spacing.sm,
    lineHeight: 18,
  },
  
  checkInMessageBubble: {
    width: '90%',
    maxWidth: 400,
  },
  
  votingSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: Theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#4B5563',
    marginTop: Theme.spacing.sm,
  },
  
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: 'transparent',
  },
  
  aiJudgeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  
  aiJudgeButtonText: {
    ...Theme.typography.caption,
    color: '#FF6B35',
    marginLeft: Theme.spacing.xs,
    fontWeight: '600',
    fontSize: 12,
  },
  
  voteCount: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
    marginLeft: Theme.spacing.xs,
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
    color: Theme.colors.white,
    marginLeft: Theme.spacing.sm,
  },
  
  noRequirementsText: {
    ...Theme.typography.body,
    color: Theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  
  noRewardsText: {
    ...Theme.typography.body,
    color: Theme.colors.textSecondary,
    fontStyle: 'italic',
  },
}); 