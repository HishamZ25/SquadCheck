import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
} from 'react-native';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { CheckInComposer, type CheckInDraft } from '../../components/challenge/CheckInComposer';
import { Theme } from '../../constants/theme';
import { GroupService } from '../../services/groupService';
import { ChallengeService } from '../../services/challengeService';
import { CheckInService } from '../../services/checkInService';
import { MessageService } from '../../services/messageService';
import { AuthService } from '../../services/authService';
import { Group, User, Challenge } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { DicebearService } from '../../services/dicebearService';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { dateKeys } from '../../utils/dateKeys';
import { challengeEval } from '../../utils/challengeEval';


interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [user, setUser] = useState<User | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [challengeDetailsCache, setChallengeDetailsCache] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [groupMembers, setGroupMembers] = useState<Record<string, User[]>>({});
  
  // Section collapse states
  const [toDoCollapsed, setToDoCollapsed] = useState(false);
  const [finishedCollapsed, setFinishedCollapsed] = useState(false);
  
  // Check-in modal state
  const [checkInModalVisible, setCheckInModalVisible] = useState(false);
  const [selectedChallengeForCheckIn, setSelectedChallengeForCheckIn] = useState<Challenge | null>(null);
  const [checkInSubmitting, setCheckInSubmitting] = useState(false);

  useEffect(() => {
    loadUserData();
    
    // Test Dicebear service
    console.log('Testing Dicebear service...');
    const testAvatar = DicebearService.testDicebear();
    console.log('Test avatar result:', testAvatar ? 'Success' : 'Failed');
  }, []);

  useEffect(() => {
    if (user) {
      loadGroups();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      console.log('Loading user data...');
      const currentUser = await AuthService.getCurrentUser();
      console.log('Loaded user data:', currentUser);
      setUser(currentUser);
    } catch (error) {
      console.error('Error loading user data:', error);
      setError('Failed to load user data');
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Load groups and challenges in parallel
      const [userGroups, userChallenges] = await Promise.all([
        GroupService.getUserGroups(user.id),
        ChallengeService.getUserChallenges(user.id)
      ]);
      
      setGroups(userGroups);
      setChallenges(userChallenges);
      
      // Load members for each group and prefetch challenge details in parallel
      await Promise.all([
        loadGroupMembers(userGroups),
        prefetchChallengeDetails(userChallenges, user.id)
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const prefetchChallengeDetails = async (challenges: Challenge[], userId: string) => {
    try {
      console.log('Prefetching challenge details for', challenges.length, 'challenges...');
      
      // Fetch details for all challenges in parallel
      const detailsPromises = challenges.map(async (challenge) => {
        try {
          const details = await ChallengeService.getChallengeDetails(challenge.id, userId);
          return { id: challenge.id, details };
        } catch (error) {
          console.error(`Error prefetching challenge ${challenge.id}:`, error);
          return null;
        }
      });
      
      const results = await Promise.all(detailsPromises);
      
      // Build cache object
      const cache: Record<string, any> = {};
      results.forEach(result => {
        if (result) {
          cache[result.id] = result.details;
        }
      });
      
      setChallengeDetailsCache(cache);
      console.log('Prefetched details for', Object.keys(cache).length, 'challenges');
    } catch (error) {
      console.error('Error prefetching challenge details:', error);
      // Don't throw - prefetch is an optimization, not critical
    }
  };

  const loadGroupMembers = async (groups: Group[]) => {
    try {
      // Collect all unique member IDs across all groups
      const allMemberIds = new Set<string>();
      groups.forEach(group => {
        group.memberIds.forEach(id => allMemberIds.add(id));
      });
      
      // Fetch all members in parallel
      const memberPromises = Array.from(allMemberIds).map(async (memberId) => {
        try {
          const userDoc = await getDoc(doc(db, 'users', memberId));
          if (userDoc.exists()) {
            return { id: memberId, data: userDoc.data() as User };
          }
        } catch (error) {
          console.error('Error loading member:', memberId, error);
        }
        return null;
      });
      
      const memberResults = await Promise.all(memberPromises);
      
      // Build a member lookup map
      const memberLookup: Record<string, User> = {};
      memberResults.forEach(result => {
        if (result) {
          memberLookup[result.id] = result.data;
        }
      });
      
      // Build the members map for each group
      const membersMap: Record<string, User[]> = {};
      groups.forEach(group => {
        membersMap[group.id] = group.memberIds
          .map(id => memberLookup[id])
          .filter(Boolean);
      });
      
      setGroupMembers(membersMap);
    } catch (error) {
      console.error('Error loading group members:', error);
    }
  };

  const handleAvatarPress = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to change your profile picture.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const selectedImage = result.assets[0];
        console.log('Selected image:', selectedImage.uri);
        
        // TODO: Upload image to Firebase Storage and update user profile
        // For now, just show a success message
        Alert.alert(
          'Image Selected',
          'Profile picture updated successfully! (Upload to Firebase coming soon)',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const handleRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      // Don't clear cache immediately - keep old data visible during refresh
      const [userGroups, userChallenges] = await Promise.all([
        GroupService.getUserGroups(user.id),
        ChallengeService.getUserChallenges(user.id)
      ]);
      setGroups(userGroups);
      setChallenges(userChallenges);
      
      // Refresh members and challenge details in parallel
      // This will update the cache with fresh data
      await Promise.all([
        loadGroupMembers(userGroups),
        prefetchChallengeDetails(userChallenges, user.id)
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleNewChallenge = () => {
    console.log('New Challenge pressed');
    setShowActionMenu(false);
    navigation.navigate('GroupType', { isSolo: false });
  };

  const handleNewSoloChallenge = () => {
    console.log('New Solo Challenge pressed');
    setShowActionMenu(false);
    navigation.navigate('GroupType', { isSolo: true });
  };

  const handleNewReminder = () => {
    console.log('New Reminder pressed');
    setShowActionMenu(false);
    navigation.navigate('CreateReminder');
  };

  const renderSectionHeader = (title: string, count: number, collapsed: boolean, onToggle: () => void) => (
    <View style={styles.sectionHeader}>
      <View style={styles.collapseButtonSpacer} />
      <View style={styles.sectionHeaderContent}>
        <View style={styles.sectionDividerLeft} />
        <View style={styles.sectionLabelContainer}>
          <Text style={styles.sectionLabel}>{title}</Text>
          <View style={styles.sectionCount}>
            <Text style={styles.sectionCountText}>{count}</Text>
          </View>
        </View>
        <View style={styles.sectionDividerRight} />
      </View>
      <TouchableOpacity onPress={onToggle} style={styles.collapseButton}>
        <Ionicons 
          name={collapsed ? 'chevron-down' : 'chevron-up'} 
          size={18} 
          color="#666" 
        />
      </TouchableOpacity>
    </View>
  );

  const renderGroupItem = (item: Group) => {
    const maxAvatars = 5;
    const members = groupMembers[item.id] || [];
    const displayMembers = members.slice(0, maxAvatars);
    const extraCount = Math.max(0, item.memberIds.length - maxAvatars);

    return (
      <TouchableOpacity
        style={styles.groupCard}
        onPress={() => navigation.navigate('GroupChat', { groupId: item.id })}
      >
        {/* Top Row: Overlapping Avatars on Left, Challenge Badge on Right */}
        <View style={styles.topRow}>
          <View style={styles.overlappingAvatars}>
            {displayMembers.map((member, index) => (
              <View 
                key={member.id} 
                style={[
                  styles.avatarCircle,
                  { 
                    zIndex: maxAvatars - index,
                    marginLeft: index > 0 ? -10 : 0 
                  }
                ]}
              >
                <Avatar
                  source={member.photoURL}
                  initials={member.displayName?.charAt(0)?.toUpperCase() || '?'}
                  size="sm"
                />
              </View>
            ))}
            {extraCount > 0 && (
              <View 
                style={[
                  styles.avatarCircle,
                  styles.extraAvatarBadge,
                  { marginLeft: -10 }
                ]}
              >
                <Text style={styles.extraAvatarText}>+{extraCount}</Text>
              </View>
            )}
          </View>
          
          {/* Challenge Badge - Note: challengeIds removed from new schema */}
          <View style={styles.challengeBadge}>
            <Ionicons name="trophy" size={16} color="#FFB800" />
            <Text style={styles.challengeCount}>0</Text>
          </View>
        </View>

        {/* Middle: Group Info */}
        <View style={styles.groupContent}>
          <Text style={styles.groupName}>{item.name}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const isChallengeCompleted = (challenge: Challenge): boolean => {
    // Check if challenge is completed today/this week
    if (!challengeDetailsCache[challenge.id]) return false;
    const details = challengeDetailsCache[challenge.id];
    return details.checkInsForCurrentPeriod?.some((ci: any) => ci.userId === user?.id && ci.status === 'completed') || false;
  };
  
  const handleCheckInPress = async (challenge: Challenge, e: any) => {
    e.stopPropagation(); // Prevent card navigation
    
    // Load challenge details if not cached
    if (!challengeDetailsCache[challenge.id]) {
      try {
        const details = await ChallengeService.getChallengeDetails(challenge.id, auth.currentUser?.uid || '');
        setChallengeDetailsCache(prev => ({ ...prev, [challenge.id]: details }));
      } catch (error) {
        console.error('Error loading challenge:', error);
        Alert.alert('Error', 'Failed to load challenge details');
        return;
      }
    }
    
    setSelectedChallengeForCheckIn(challenge);
    setCheckInModalVisible(true);
  };
  
  const handleCheckInSubmit = async (draft: CheckInDraft) => {
    if (!selectedChallengeForCheckIn || !user) return;
    
    try {
      setCheckInSubmitting(true);
      const challenge = challengeDetailsCache[selectedChallengeForCheckIn.id]?.challenge || selectedChallengeForCheckIn;
      
      // Build payload with only defined values
      const payload: any = {};
      if (draft.booleanValue !== undefined) payload.booleanValue = draft.booleanValue;
      if (draft.numberValue !== undefined) payload.numberValue = draft.numberValue;
      if (draft.textValue !== undefined) payload.textValue = draft.textValue;
      if (draft.timerSeconds !== undefined) payload.timerSeconds = draft.timerSeconds;
      
      // Upload attachments to Firebase Storage first
      let uploadedAttachments = draft.attachments || [];
      if (draft.attachments && draft.attachments.length > 0) {
        uploadedAttachments = await Promise.all(
          draft.attachments.map(async (attachment) => {
            try {
              const uploadedUrl = await MessageService.uploadImage(attachment.uri);
              return { type: attachment.type, uri: uploadedUrl };
            } catch (error) {
              console.error('Error uploading attachment:', error);
              return attachment;
            }
          })
        );
      }
      
      // Save check-in to Firebase
      await CheckInService.submitChallengeCheckIn(
        challenge.id,
        user.id,
        challenge.groupId || null,
        challenge.cadence?.unit || 'daily',
        payload,
        uploadedAttachments
      );
      
      // If it's a group challenge, send message to group chat
      if (challenge.groupId) {
        const caption = draft.textValue || 'Completed check-in';
        const imageUrl = uploadedAttachments.length > 0 ? uploadedAttachments[0].uri : null;
        
        await MessageService.sendCheckInMessage(
          challenge.groupId,
          user.id,
          user.displayName || 'User',
          caption,
          imageUrl,
          challenge.title
        );
      }
      
      // Refresh challenges
      await loadGroups();
      
      setCheckInModalVisible(false);
      setSelectedChallengeForCheckIn(null);
      Alert.alert('Success', 'Check-in submitted successfully!');
    } catch (error) {
      console.error('Error submitting check-in:', error);
      Alert.alert('Error', 'Failed to submit check-in');
    } finally {
      setCheckInSubmitting(false);
    }
  };

  const getChallengeStatus = (challenge: Challenge): string => {
    // Safety check for old schema challenges
    if (!challenge.cadence || !challenge.due) {
      return 'In progress';
    }
    
    // This is a placeholder - you'll need to query CheckIns to get real status
    // For now, return sample statuses based on challenge type
    const now = new Date();
    const hour = now.getHours();
    
    if (challenge.type === 'deadline' && challenge.due.deadlineDate) {
      const deadline = new Date(challenge.due.deadlineDate);
      const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysLeft > 0) {
        return `Due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`;
      } else if (daysLeft === 0) {
        return 'Due today';
      }
      return 'Deadline passed';
    }
    
    if (challenge.cadence.unit === 'daily') {
      // Show completed if it's marked as completed
      if (isChallengeCompleted(challenge)) {
        const details = challengeDetailsCache[challenge.id];
        if (details?.checkInsForCurrentPeriod) {
          const myCheckIn = details.checkInsForCurrentPeriod.find((ci: any) => ci.userId === user?.id);
          if (myCheckIn?.createdAt) {
            const timestamp = typeof myCheckIn.createdAt === 'number' ? myCheckIn.createdAt : myCheckIn.createdAt.toMillis?.() || Date.now();
            return 'Completed ' + challengeEval.formatTimestamp(timestamp);
          }
        }
        return 'Completed today';
      }
      if (hour < 6) {
        const dueTime = challenge.due?.dueTimeLocal ? dateKeys.format12Hour(challenge.due.dueTimeLocal) : '11:59 PM';
        return 'Due today at ' + dueTime;
      } else if (hour >= 18) {
        return 'Due in 5h 42min';
      }
      return 'Due today';
    }
    
    if (challenge.cadence.unit === 'weekly' && challenge.cadence.requiredCount) {
      if (isChallengeCompleted(challenge)) {
        return `${challenge.cadence.requiredCount}/${challenge.cadence.requiredCount} done this week`;
      }
      return `${Math.min(2, challenge.cadence.requiredCount)}/${challenge.cadence.requiredCount} done this week`;
    }
    
    return 'In progress';
  };

  const renderChallengeItem = (item: Challenge) => {
    // Check if it's a group challenge (has groupId) or solo (no groupId)
    const isSolo = !item.groupId;
    const status = getChallengeStatus(item);
    const isCompleted = isChallengeCompleted(item);
    
    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.challengeCard,
          { borderColor: isCompleted ? '#4CAF50' : '#FF6B35' }
        ]}
        onPress={async () => {
          try {
            // Use cached data if available, otherwise fetch
            let challengeDetails = challengeDetailsCache[item.id];
            
            if (!challengeDetails) {
              console.log('Cache miss for challenge', item.id, '- fetching...');
              challengeDetails = await ChallengeService.getChallengeDetails(item.id, auth.currentUser?.uid || '');
              // Update cache
              setChallengeDetailsCache(prev => ({ ...prev, [item.id]: challengeDetails }));
            } else {
              console.log('Cache hit for challenge', item.id);
            }
            
            navigation.navigate('ChallengeDetail', challengeDetails);
          } catch (error) {
            console.error('Error loading challenge details:', error);
            Alert.alert('Error', 'Failed to load challenge details');
          }
        }}
      >
        {/* Top Row: Challenge Name and Icon */}
        <View style={styles.challengeTopRow}>
          <Text style={styles.challengeTitle} numberOfLines={1}>
            {item.title || 'Untitled Challenge'}
          </Text>
          <View style={styles.challengeIcon}>
            <Ionicons 
              name={isSolo ? 'person' : 'people'} 
              size={20} 
              color="#666" 
            />
          </View>
        </View>

        {/* Description */}
        {item.description && (
          <Text style={styles.challengeDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        {/* Status Line and Check-in Button */}
        <View style={styles.challengeFooter}>
          <View style={styles.challengeStatusContainer}>
            <View style={styles.challengeStatusDot} />
            <Text style={styles.challengeStatusText}>{status}</Text>
          </View>
          
          {/* Check-in Button */}
          <TouchableOpacity
            style={[
              styles.checkInButton,
              isCompleted && styles.checkInButtonCompleted
            ]}
            onPress={(e) => handleCheckInPress(item, e)}
            disabled={isCompleted}
          >
            <Ionicons 
              name={isCompleted ? 'checkmark-circle' : 'add-circle'} 
              size={20} 
              color="#FFF" 
            />
            <Text style={styles.checkInButtonText}>
              {isCompleted ? 'Done' : 'Check In'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = (message: string) => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>{message}</Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorState}>
      <Ionicons name="alert-circle-outline" size={64} color={Theme.colors.error} />
      <Text style={styles.errorStateTitle}>Something went wrong</Text>
      <Text style={styles.errorStateSubtitle}>{error}</Text>
      <Button
        title="Try Again"
        onPress={loadGroups}
        variant="outline"
        style={styles.errorStateButton}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* User Profile Section - Centered */}
      <View style={styles.userSection}>
        <Avatar
          source={user?.photoURL}
          initials={user?.displayName?.charAt(0)}
          size="xl"
          onPress={() => {
            console.log('Avatar pressed in HomeScreen!');
            handleAvatarPress();
          }}
        />
        <TouchableOpacity onPress={() => navigation.navigate('Settings', { user })}>
          <Text style={styles.userName}>{user?.displayName || 'Loading...'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Settings', { user })}>
          <Text style={styles.userTitle}>{user?.title || 'Accountability Seeker'}</Text>
        </TouchableOpacity>
        
      </View>

      {/* Content Sections */}
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        renderErrorState()
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#FF6B35"
              colors={['#FF6B35']}
            />
          }
        >
          {/* To Do Section */}
          {(() => {
            const incompleteChallenges = challenges.filter(c => !isChallengeCompleted(c));
            const toDoCount = incompleteChallenges.length; // Only challenges + reminders, no groups
            
            return (
              <View style={styles.section}>
                {renderSectionHeader('To Do', toDoCount, toDoCollapsed, () => setToDoCollapsed(!toDoCollapsed))}
                {!toDoCollapsed && (
                  <View style={styles.cardsContainer}>
                    {/* Incomplete Challenges */}
                    {incompleteChallenges.map(challenge => (
                      <View key={`challenge-${challenge.id}`}>
                        {renderChallengeItem(challenge)}
                      </View>
                    ))}
                    
                    {/* TODO: Add incomplete reminders here when implemented */}
                    
                    {toDoCount === 0 && renderEmptyState('Nothing to do - great job!')}
                  </View>
                )}
              </View>
            );
          })()}

          {/* Finished Section */}
          {(() => {
            const completedChallenges = challenges.filter(c => isChallengeCompleted(c));
            const finishedCount = completedChallenges.length;
            
            return (
              <View style={styles.section}>
                {renderSectionHeader('Finished', finishedCount, finishedCollapsed, () => setFinishedCollapsed(!finishedCollapsed))}
                {!finishedCollapsed && (
                  <View style={styles.cardsContainer}>
                    {/* Completed Challenges */}
                    {completedChallenges.map(challenge => (
                      <View key={`challenge-${challenge.id}`}>
                        {renderChallengeItem(challenge)}
                      </View>
                    ))}
                    
                    {/* TODO: Add completed reminders here when implemented */}
                    
                    {finishedCount === 0 && renderEmptyState('No completed items yet')}
                  </View>
                )}
              </View>
            );
          })()}
          
          {/* Empty state if no content at all */}
          {challenges.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="planet-outline" size={64} color="#CCC" />
              <Text style={styles.emptyStateTitle}>Get Started</Text>
              <Text style={styles.emptyStateSubtitle}>Create a challenge or reminder to begin</Text>
            </View>
          )}
          
          <View style={{ height: 120 }} />
        </ScrollView>
      )}

      {/* Floating Action Button with Circular Speed Dial */}
      {showActionMenu && (
        <TouchableOpacity
          style={styles.fabOverlay}
          activeOpacity={1}
          onPress={() => setShowActionMenu(false)}
        />
      )}
      <View style={styles.fabContainer}>
        {/* Action Buttons - Circular pattern around FAB */}
        {showActionMenu && (
          <>
            {/* Group Challenge Button - 12 o'clock (above FAB) */}
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonTopRight]}
              onPress={handleNewChallenge}
              activeOpacity={0.8}
            >
              <Ionicons name="trophy-outline" size={24} color="#FF6B35" />
            </TouchableOpacity>

            {/* Solo Challenge Button - 4 o'clock (bottom right) */}
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonBottomRight]}
              onPress={handleNewSoloChallenge}
              activeOpacity={0.8}
            >
              <Ionicons name="person-outline" size={24} color="#FF6B35" />
            </TouchableOpacity>

            {/* Reminder Button - 8 o'clock (bottom left) */}
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonBottomLeft]}
              onPress={handleNewReminder}
              activeOpacity={0.8}
            >
              <Ionicons name="alert-circle-outline" size={24} color="#FF6B35" />
            </TouchableOpacity>
          </>
        )}

        {/* Main FAB Button */}
        <TouchableOpacity
          style={[styles.fab, showActionMenu && styles.fabActive]}
          onPress={() => setShowActionMenu(!showActionMenu)}
          activeOpacity={0.8}
        >
          <Ionicons 
            name={showActionMenu ? "close" : "add"} 
            size={24} 
            color="#FF6B35" 
          />
        </TouchableOpacity>
      </View>
      
      {/* Check-In Modal */}
      {selectedChallengeForCheckIn && (
        <Modal
          visible={checkInModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => {
            if (!checkInSubmitting) {
              setCheckInModalVisible(false);
              setSelectedChallengeForCheckIn(null);
            }
          }}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => {
                  if (!checkInSubmitting) {
                    setCheckInModalVisible(false);
                    setSelectedChallengeForCheckIn(null);
                  }
                }}
                disabled={checkInSubmitting}
              >
                <Ionicons name="close" size={28} color="#000" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{selectedChallengeForCheckIn.title}</Text>
              <View style={{ width: 28 }} />
            </View>
            
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <CheckInComposer
                inputType={selectedChallengeForCheckIn.submission?.inputType || 'boolean'}
                unitLabel={selectedChallengeForCheckIn.submission?.unitLabel}
                minValue={selectedChallengeForCheckIn.submission?.minValue}
                requireAttachment={selectedChallengeForCheckIn.submission?.requireAttachment || false}
                onSubmit={handleCheckInSubmit}
                disabled={checkInSubmitting}
              />
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F0ED',
    position: 'relative',
  },
  
  userSection: {
    flex: 0,
    alignItems: 'center',
    padding: Theme.layout.screenPadding,
    paddingTop: Theme.spacing.lg,
  },
  
  
  userName: {
    ...Theme.typography.h2,
    marginTop: Theme.spacing.sm,
    marginBottom: Theme.spacing.xs,
    textAlign: 'center',
    color: '#000000',
  },
  
  userTitle: {
    ...Theme.typography.body,
    marginBottom: Theme.spacing.md,
    textAlign: 'center',
    color: '#666666',
  },
  
  scrollContent: {
    paddingHorizontal: Theme.layout.screenPadding,
    paddingBottom: 20,
  },
  
  section: {
    marginBottom: Theme.spacing.lg,
  },
  
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  
  collapseButtonSpacer: {
    width: 26,
  },
  
  sectionHeaderContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  sectionDividerLeft: {
    flex: 1,
    height: 1,
    backgroundColor: '#DDD',
    marginRight: 12,
  },
  
  sectionDividerRight: {
    flex: 1,
    height: 1,
    backgroundColor: '#DDD',
    marginLeft: 12,
  },
  
  sectionLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  sectionCount: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 22,
    alignItems: 'center',
  },
  
  sectionCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  
  collapseButton: {
    padding: 4,
    width: 26,
    alignItems: 'center',
  },
  
  cardsContainer: {
    gap: 10,
  },
  
  userStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: Theme.spacing.xl,
    marginTop: Theme.spacing.sm,
  },
  
  badgesContainer: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    flex: 1,
    justifyContent: 'flex-start',
  },
  
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.xs,
    flex: 1,
  },
  
  streakText: {
    ...Theme.typography.h4,
    color: Theme.colors.streak,
    fontWeight: '600',
  },
  
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    flex: 1,
    justifyContent: 'flex-end',
  },
  
  pointsText: {
    ...Theme.typography.h4,
    color: Theme.colors.points,
    fontWeight: '600',
  },
  
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    ...Theme.shadows.sm,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  
  overlappingAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  avatarCircle: {
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    borderRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  
  extraAvatarBadge: {
    width: 36,
    height: 36,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  extraAvatarText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  
  challengeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FFE8B3',
  },
  
  challengeCount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#333',
  },
  
  groupContent: {
    marginTop: 2,
  },
  
  groupName: {
    fontSize: 17,
    color: '#000000',
    fontWeight: '700',
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  
  groupDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  
  arrowIcon: {
    marginLeft: 8,
  },
  
  // Challenge Card Styles
  challengeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 2,
    // borderColor is set dynamically based on completion status
    ...Theme.shadows.sm,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  
  challengeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  
  challengeTitle: {
    flex: 1,
    fontSize: 17,
    color: '#000000',
    fontWeight: '700',
    letterSpacing: -0.2,
    marginRight: 12,
  },
  
  challengeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  challengeDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 10,
  },
  
  challengeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  
  challengeStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  
  challengeStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  
  challengeStatusText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
  },
  
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  
  checkInButtonCompleted: {
    backgroundColor: '#4CAF50',
    opacity: 0.7,
  },
  
  checkInButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  
  modalContainer: {
    flex: 1,
    backgroundColor: '#F1F0ED',
  },
  
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFF',
  },
  
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  
  modalContent: {
    flex: 1,
    padding: 16,
  },
  
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.lg,
    minHeight: 80,
  },
  
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: Theme.spacing.md,
    textAlign: 'center',
    color: '#333',
  },
  
  emptyStateSubtitle: {
    fontSize: 14,
    marginTop: Theme.spacing.xs,
    textAlign: 'center',
    color: '#999',
  },
  
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  

  
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.xl,
  },
  
  errorStateTitle: {
    ...Theme.typography.h3,
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
    color: Theme.colors.error,
  },
  
  errorStateSubtitle: {
    ...Theme.typography.bodySmall,
    textAlign: 'center',
    color: '#666666',
    marginBottom: Theme.spacing.xl,
  },
  
  errorStateButton: {
    marginTop: Theme.spacing.md,
  },
  
  fabOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 999,
  },
  
  fabContainer: {
    position: 'absolute',
    bottom: 90, // Account for tab bar height (~70px) + padding
    right: Theme.layout.screenPadding,
    width: 56,
    height: 56,
    zIndex: 1000,
  },
  
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF6B35',
    ...Theme.shadows.lg,
    zIndex: 1000,
  },
  
  fabActive: {
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
  },
  

  
  actionButton: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FF6B35',
    ...Theme.shadows.lg,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  
  actionButtonTopRight: {
    bottom: 100,
    right: 1,
    transform: [{ translateX: 0 }],
  },
  
  actionButtonBottomLeft: {
    bottom: 70,
    left: 45,
    transform: [{ translateX: -100 }],
  },
  
  actionButtonBottomRight: {
    bottom: 0,
    right: 100,
    transform: [{ translateX: 0 }],
  },
  

}); 