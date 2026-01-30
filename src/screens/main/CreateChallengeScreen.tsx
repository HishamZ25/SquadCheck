import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Modal,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Theme } from '../../constants/theme';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { ChallengeService } from '../../services/challengeService';
import { FriendshipService } from '../../services/friendshipService';
import { GroupService } from '../../services/groupService';
import { AuthService } from '../../services/authService';
import { auth } from '../../services/firebase';
import { Group } from '../../types';

type ChallengeType = 'elimination' | 'deadline' | 'progression';

interface CreateChallengeScreenProps {
  navigation: any;
  route?: {
    params?: {
      challengeType?: ChallengeType;
      isSolo?: boolean;
      groupId?: string; // If creating a challenge for a specific group
    };
  };
}

interface Friend {
  id: string;
  displayName: string;
  photoURL: string;
  selected: boolean;
}

export const CreateChallengeScreen: React.FC<CreateChallengeScreenProps> = ({ navigation, route }) => {
  const challengeType = route?.params?.challengeType || 'elimination';
  const isSolo = route?.params?.isSolo || false;
  const groupId = route?.params?.groupId;
  
  const [challengeTitle, setChallengeTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState(['']);
  
  // Configuration states based on challenge type
  const [eliminationRule, setEliminationRule] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [progressionDuration, setProgressionDuration] = useState<number>(7);
  const [intervalType, setIntervalType] = useState('');
  const [assessmentTime, setAssessmentTime] = useState<Date>(new Date(new Date().setHours(0, 0, 0, 0)));
  
  // Date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Mode selection: 'friends' or 'group'
  const [participantMode, setParticipantMode] = useState<'friends' | 'group'>('friends');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [userGroups, setUserGroups] = useState<Group[]>([]);

  // Load friends and groups when component mounts (only for group challenges)
  useEffect(() => {
    if (!isSolo && !groupId) {
      loadFriends();
      loadUserGroups();
    }
  }, [isSolo, groupId]);

  const loadFriends = async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userFriends = await FriendshipService.getUserFriends(currentUser.uid);
        
        const friendsWithSelection = userFriends.map(friend => ({
          id: friend.id,
          displayName: friend.displayName,
          photoURL: friend.photoURL || '',
          selected: false
        }));
        
        setFriends(friendsWithSelection);
      }
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const [friends, setFriends] = useState<Friend[]>([]);

  const loadUserGroups = async () => {
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (currentUser) {
        const groups = await GroupService.getUserGroups(currentUser.id);
        setUserGroups(groups);
      }
    } catch (error) {
      console.error('Error loading user groups:', error);
    }
  };

  const toggleFriendSelection = (friendId: string) => {
    setFriends(prevFriends => 
      prevFriends.map(friend => 
        friend.id === friendId 
          ? { ...friend, selected: !friend.selected }
          : friend
      )
    );
  };

  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroupId(selectedGroupId === groupId ? null : groupId);
  };

  const addRequirement = () => {
    setRequirements([...requirements, '']);
  };

  const updateRequirement = (index: number, text: string) => {
    const newRequirements = [...requirements];
    newRequirements[index] = text;
    setRequirements(newRequirements);
    
    if (text.endsWith('\n') && index === requirements.length - 1) {
      addRequirement();
    }
  };

  const removeRequirement = (index: number) => {
    if (requirements.length > 1) {
      const newRequirements = requirements.filter((_, i) => i !== index);
      setRequirements(newRequirements);
    }
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      if (startDate && selectedDate <= startDate) {
        Alert.alert('Invalid Date', 'End date must be after start date');
        return;
      }
      setEndDate(selectedDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setAssessmentTime(selectedTime);
    }
  };

  const handleCreateChallenge = async () => {
    if (!challengeTitle.trim() || !description.trim()) {
      Alert.alert('Missing Information', 'Please fill in the challenge title and description.');
      return;
    }

    // Validate required fields based on challenge type
    if (challengeType === 'elimination' && !eliminationRule.trim()) {
      Alert.alert('Error', 'Please enter an elimination rule');
      return;
    }

    if (challengeType === 'deadline' && (!startDate || !endDate)) {
      Alert.alert('Error', 'Please select both start and end dates');
      return;
    }

    if (challengeType === 'progression' && (!progressionDuration || !intervalType.trim())) {
      Alert.alert('Error', 'Please fill in all progression fields');
      return;
    }

    // For group challenges (not solo, not attached to existing group), need participants
    if (!isSolo && !groupId) {
      if (participantMode === 'friends') {
        const selectedFriends = friends.filter(friend => friend.selected);
        if (selectedFriends.length === 0) {
          Alert.alert('Error', 'Please select at least one friend for a group challenge');
          return;
        }
      } else {
        if (!selectedGroupId) {
          Alert.alert('Error', 'Please select a group for this challenge');
          return;
        }
      }
    }

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'You must be logged in to create a challenge.');
        return;
      }

      // Determine groupId and participant IDs
      let finalGroupId = groupId;
      let participantIds: string[] = [currentUser.uid];
      
      if (!isSolo && !groupId) {
        if (participantMode === 'group' && selectedGroupId) {
          finalGroupId = selectedGroupId;
          // Get group members
          const selectedGroup = userGroups.find(g => g.id === selectedGroupId);
          if (selectedGroup) {
            participantIds = selectedGroup.memberIds;
          }
        } else {
          const selectedFriends = friends.filter(friend => friend.selected);
          participantIds = [currentUser.uid, ...selectedFriends.map(f => f.id)];
        }
      }

      // Create the challenge in Firebase
      const challengeId = await ChallengeService.createChallenge(
        challengeTitle.trim(),
        description.trim(),
        challengeType,
        isSolo ? 'solo' : 'group',
        currentUser.uid,
        finalGroupId,
        requirements.filter(req => req.trim()),
        {
          points: 0, // Default points, rewards removed
        },
        0, // No penalty
        challengeType === 'elimination' ? eliminationRule : undefined,
        challengeType === 'deadline' ? startDate : undefined,
        challengeType === 'deadline' ? endDate : undefined,
        challengeType === 'progression' ? progressionDuration : undefined,
        challengeType === 'progression' ? intervalType : undefined,
        assessmentTime
      );

      // Add participants if it's a group challenge without a groupId
      if (!isSolo && !groupId) {
        if (participantMode === 'friends') {
          const selectedFriends = friends.filter(friend => friend.selected);
          for (const friend of selectedFriends) {
            await ChallengeService.addParticipant(challengeId, friend.id);
          }
        } else if (participantMode === 'group' && selectedGroupId) {
          // Add all group members as participants (creator is already included)
          const selectedGroup = userGroups.find(g => g.id === selectedGroupId);
          if (selectedGroup) {
            for (const memberId of selectedGroup.memberIds) {
              if (memberId !== currentUser.uid) {
                await ChallengeService.addParticipant(challengeId, memberId);
              }
            }
          }
        }
      }

      Alert.alert(
        'Challenge Created! 🎉', 
        `Your challenge "${challengeTitle}" has been created successfully!`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error creating challenge:', error);
      Alert.alert('Error', 'Failed to create challenge. Please try again.');
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={22} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            Configure Challenge
          </Text>
          <View style={styles.placeholder} />
        </View>

        {/* Challenge Title Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Challenge Title</Text>
          <TextInput
            style={styles.textInput}
            placeholder="What is This Challenge's Title?"
            placeholderTextColor={Theme.colors.textTertiary}
            value={challengeTitle}
            onChangeText={setChallengeTitle}
            multiline
            textAlign="center"
          />
        </View>

        {/* Description Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <TextInput
            style={styles.textInput}
            placeholder="What is this challenge about?"
            placeholderTextColor={Theme.colors.textTertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            textAlign="center"
          />
        </View>

        {/* Challenge Configuration Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Configure {challengeType.charAt(0).toUpperCase() + challengeType.slice(1)} Challenge
          </Text>

          {challengeType === 'elimination' && (
            <View>
              <Text style={styles.configSubtitle}>
                Define what happens when a user misses a requirement
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter elimination rule..."
                placeholderTextColor={Theme.colors.textTertiary}
                value={eliminationRule}
                onChangeText={setEliminationRule}
                multiline
                textAlign="center"
              />
            </View>
          )}

          {challengeType === 'deadline' && (
            <View>
              <Text style={styles.configSubtitle}>
                Set when the challenge starts and ends
              </Text>
              <View style={styles.dateRow}>
                <View style={styles.dateInput}>
                  <Text style={styles.dateLabel}>Start Date</Text>
                  <TouchableOpacity 
                    style={styles.dateButton}
                    onPress={() => setShowStartDatePicker(true)}
                  >
                    <Text style={styles.dateButtonText}>
                      {startDate ? startDate.toLocaleDateString() : 'Select start date'}
                    </Text>
                    <Ionicons name="calendar" size={20} color={Theme.colors.textTertiary} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.dateInput}>
                  <Text style={styles.dateLabel}>End Date</Text>
                  <TouchableOpacity 
                    style={styles.dateButton}
                    onPress={() => setShowEndDatePicker(true)}
                  >
                    <Text style={styles.dateButtonText}>
                      {endDate ? endDate.toLocaleDateString() : 'Select end date'}
                    </Text>
                    <Ionicons name="calendar" size={20} color={Theme.colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {challengeType === 'progression' && (
            <View>
              <View style={styles.progressionInput}>
                <Text style={styles.configSubtitle}>
                  Choose the amount of time between each interval progression
                </Text>
                <View style={styles.numberInputContainer}>
                  <TouchableOpacity 
                    style={styles.numberButton}
                    onPress={() => setProgressionDuration(Math.max(1, progressionDuration - 1))}
                  >
                    <Ionicons name="remove" size={20} color={Theme.colors.white} />
                  </TouchableOpacity>
                  <Text style={styles.numberValue}>{progressionDuration} days</Text>
                  <TouchableOpacity 
                    style={styles.numberButton}
                    onPress={() => setProgressionDuration(progressionDuration + 1)}
                  >
                    <Ionicons name="add" size={20} color={Theme.colors.white} />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.progressionInput}>
                <Text style={styles.configSubtitle}>
                  What needs to increase? Cardio done? Time spent coding?
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter interval type..."
                  placeholderTextColor={Theme.colors.textTertiary}
                  value={intervalType}
                  onChangeText={setIntervalType}
                  multiline
                  textAlign="center"
                />
              </View>
            </View>
          )}

          {/* AI Assessment Time */}
          <View style={styles.assessmentTimeContainer}>
            <Text style={styles.configSubtitle}>
              Choose when the AI will assess what users posted (default: midnight)
            </Text>
            <TouchableOpacity 
              style={styles.timeInputButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.timeInputButtonText}>
                {assessmentTime.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </Text>
              <Ionicons name="time" size={20} color={Theme.colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Requirements & Rules Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Requirements & Rules</Text>
          {requirements.map((requirement, index) => (
            <View key={index} style={styles.requirementRow}>
              <Text style={styles.bulletPoint}>*</Text>
              <TextInput
                style={styles.requirementInput}
                placeholder="Enter requirement or rule..."
                placeholderTextColor={Theme.colors.textTertiary}
                value={requirement}
                onChangeText={(text) => updateRequirement(index, text)}
                multiline
                textAlign="center"
              />
              {requirements.length > 1 && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeRequirement(index)}
                >
                  <Ionicons name="close-circle" size={20} color={Theme.colors.error} />
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TouchableOpacity style={styles.addRequirementButton} onPress={addRequirement}>
            <Ionicons name="add-circle-outline" size={20} color={Theme.colors.secondary} />
            <Text style={styles.addRequirementText}>Add Requirement</Text>
          </TouchableOpacity>
        </View>

        {/* Participants Section - Only for group challenges without groupId */}
        {!isSolo && !groupId && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Add Participants</Text>
            
            {/* Mode Selection Toggle */}
            <View style={styles.modeToggleContainer}>
              <TouchableOpacity
                style={[
                  styles.modeToggleButton,
                  participantMode === 'friends' && styles.modeToggleButtonActive
                ]}
                onPress={() => setParticipantMode('friends')}
              >
                <Ionicons 
                  name="person-add-outline" 
                  size={20} 
                  color={participantMode === 'friends' ? Theme.colors.white : Theme.colors.secondary} 
                />
                <Text style={[
                  styles.modeToggleText,
                  participantMode === 'friends' && styles.modeToggleTextActive
                ]}>
                  Invite Friends
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modeToggleButton,
                  participantMode === 'group' && styles.modeToggleButtonActive
                ]}
                onPress={() => setParticipantMode('group')}
              >
                <Ionicons 
                  name="people-outline" 
                  size={20} 
                  color={participantMode === 'group' ? Theme.colors.white : Theme.colors.secondary} 
                />
                <Text style={[
                  styles.modeToggleText,
                  participantMode === 'group' && styles.modeToggleTextActive
                ]}>
                  Select Group
                </Text>
              </TouchableOpacity>
            </View>

            {/* Friends Selection */}
            {participantMode === 'friends' && (
              <>
                {friends.length === 0 ? (
                  <View style={styles.noFriends}>
                    <Ionicons name="people-outline" size={32} color={Theme.colors.gray400} />
                    <Text style={styles.noFriendsText}>No friends yet</Text>
                    <Text style={styles.noFriendsSubtext}>Add friends to invite them to challenges</Text>
                  </View>
                ) : (
                  <>
                    {friends.map((friend) => (
                      <TouchableOpacity
                        key={friend.id}
                        style={[styles.friendItem, friend.selected && styles.friendItemSelected]}
                        onPress={() => toggleFriendSelection(friend.id)}
                      >
                        <Avatar
                          source={friend.photoURL}
                          initials={friend.displayName.charAt(0)}
                          size="md"
                        />
                        <Text style={styles.friendName}>{friend.displayName}</Text>
                        <View style={styles.selectionIndicator}>
                          {friend.selected ? (
                            <Ionicons name="checkmark-circle" size={24} color={Theme.colors.secondary} />
                          ) : (
                            <Ionicons name="ellipse-outline" size={24} color={Theme.colors.textTertiary} />
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </>
            )}

            {/* Group Selection */}
            {participantMode === 'group' && (
              <>
                {userGroups.length === 0 ? (
                  <View style={styles.noFriends}>
                    <Ionicons name="people-outline" size={32} color={Theme.colors.gray400} />
                    <Text style={styles.noFriendsText}>No groups yet</Text>
                    <Text style={styles.noFriendsSubtext}>Create a group first to add it to a challenge</Text>
                  </View>
                ) : (
                  <>
                    {userGroups.map((group) => (
                      <TouchableOpacity
                        key={group.id}
                        style={[styles.groupItem, selectedGroupId === group.id && styles.groupItemSelected]}
                        onPress={() => toggleGroupSelection(group.id)}
                      >
                        <View style={styles.groupItemContent}>
                          <Ionicons name="people" size={24} color={Theme.colors.secondary} />
                          <View style={styles.groupItemInfo}>
                            <Text style={styles.groupItemName}>{group.name}</Text>
                            <Text style={styles.groupItemDescription} numberOfLines={1}>
                              {group.description}
                            </Text>
                            <Text style={styles.groupItemMembers}>
                              {group.memberIds.length} member{group.memberIds.length !== 1 ? 's' : ''}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.selectionIndicator}>
                          {selectedGroupId === group.id ? (
                            <Ionicons name="checkmark-circle" size={24} color={Theme.colors.secondary} />
                          ) : (
                            <Ionicons name="ellipse-outline" size={24} color={Theme.colors.textTertiary} />
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </>
            )}
          </View>
        )}

        {/* Create Challenge Button */}
        <View style={styles.createButtonContainer}>
          <Button
            title="Create Challenge"
            onPress={handleCreateChallenge}
            variant="primary"
            style={styles.createButton}
          />
        </View>
      </ScrollView>

      {/* Date and Time Pickers - Same as CreateGroupScreen */}
      {Platform.OS === 'ios' ? (
        <>
          <Modal
            visible={showStartDatePicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowStartDatePicker(false)}
          >
            <View style={styles.pickerModalContainer}>
              <View style={styles.pickerModalContent}>
                <View style={styles.pickerModalHeader}>
                  <TouchableOpacity
                    onPress={() => setShowStartDatePicker(false)}
                    style={styles.pickerModalButton}
                  >
                    <Text style={styles.pickerModalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.pickerModalTitle}>Select Start Date</Text>
                  <TouchableOpacity
                    onPress={() => {
                      if (startDate) {
                        setShowStartDatePicker(false);
                      }
                    }}
                    style={styles.pickerModalButton}
                  >
                    <Text style={styles.pickerModalDoneText}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={startDate || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setStartDate(selectedDate);
                    }
                  }}
                  textColor={Theme.colors.white}
                  accentColor={Theme.colors.secondary}
                />
              </View>
            </View>
          </Modal>

          <Modal
            visible={showEndDatePicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowEndDatePicker(false)}
          >
            <View style={styles.pickerModalContainer}>
              <View style={styles.pickerModalContent}>
                <View style={styles.pickerModalHeader}>
                  <TouchableOpacity
                    onPress={() => setShowEndDatePicker(false)}
                    style={styles.pickerModalButton}
                  >
                    <Text style={styles.pickerModalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.pickerModalTitle}>Select End Date</Text>
                  <TouchableOpacity
                    onPress={() => {
                      if (endDate) {
                        setShowEndDatePicker(false);
                      }
                    }}
                    style={styles.pickerModalButton}
                  >
                    <Text style={styles.pickerModalDoneText}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={endDate || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      if (startDate && selectedDate <= startDate) {
                        Alert.alert('Invalid Date', 'End date must be after start date');
                        return;
                      }
                      setEndDate(selectedDate);
                    }
                  }}
                  textColor={Theme.colors.white}
                  accentColor={Theme.colors.secondary}
                />
              </View>
            </View>
          </Modal>

          <Modal
            visible={showTimePicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowTimePicker(false)}
          >
            <View style={styles.pickerModalContainer}>
              <View style={styles.pickerModalContent}>
                <View style={styles.pickerModalHeader}>
                  <TouchableOpacity
                    onPress={() => setShowTimePicker(false)}
                    style={styles.pickerModalButton}
                  >
                    <Text style={styles.pickerModalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.pickerModalTitle}>Select Time</Text>
                  <TouchableOpacity
                    onPress={() => setShowTimePicker(false)}
                    style={styles.pickerModalButton}
                  >
                    <Text style={styles.pickerModalDoneText}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={assessmentTime}
                  mode="time"
                  display="spinner"
                  onChange={(event, selectedTime) => {
                    if (selectedTime) {
                      setAssessmentTime(selectedTime);
                    }
                  }}
                  textColor={Theme.colors.white}
                  accentColor={Theme.colors.secondary}
                />
              </View>
            </View>
          </Modal>
        </>
      ) : (
        <>
          {showStartDatePicker && (
            <DateTimePicker
              value={startDate || new Date()}
              mode="date"
              display="default"
              onChange={handleStartDateChange}
              textColor={Theme.colors.white}
              accentColor={Theme.colors.secondary}
            />
          )}

          {showEndDatePicker && (
            <DateTimePicker
              value={endDate || new Date()}
              mode="date"
              display="default"
              onChange={handleEndDateChange}
              textColor={Theme.colors.white}
              accentColor={Theme.colors.secondary}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={assessmentTime}
              mode="time"
              display="default"
              onChange={handleTimeChange}
              textColor={Theme.colors.white}
              accentColor={Theme.colors.secondary}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
};

// Copy styles from CreateGroupScreen
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F0ED',
  },
  
  scrollView: {
    flex: 1,
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.layout.screenPadding,
    paddingVertical: Theme.spacing.lg,
  },
  
  backButton: {
    padding: Theme.spacing.sm,
  },
  
  headerTitle: {
    ...Theme.typography.h2,
    color: '#FF6B35',
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  
  placeholder: {
    width: 48,
  },
  
  section: {
    paddingHorizontal: Theme.layout.screenPadding,
    paddingVertical: Theme.spacing.sm,
    marginBottom: Theme.spacing.xs,
  },
  
  sectionTitle: {
    ...Theme.typography.h4,
    color: '#000000',
    marginBottom: Theme.spacing.xs,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FF6B35',
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    color: '#000000',
    fontSize: 16,
    minHeight: Theme.layout.inputHeight,
    textAlignVertical: 'center',
  },
  
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Theme.spacing.sm,
  },
  
  bulletPoint: {
    fontSize: 28,
    color: Theme.colors.secondary,
    marginRight: Theme.spacing.sm,
    marginTop: 0,
    fontWeight: 'bold',
  },
  
  requirementInput: {
    flex: 1,
    backgroundColor: 'transparent',
    padding: Theme.spacing.sm,
    color: '#000000',
    fontSize: 16,
    minHeight: 40,
    textAlignVertical: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  
  removeButton: {
    padding: Theme.spacing.xs,
    marginLeft: Theme.spacing.sm,
  },
  
  addRequirementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
    marginTop: Theme.spacing.sm,
  },
  
  addRequirementText: {
    ...Theme.typography.body,
    color: Theme.colors.secondary,
    marginLeft: Theme.spacing.xs,
    fontWeight: '600',
  },
  
  modeToggleContainer: {
    flexDirection: 'row',
    marginBottom: Theme.spacing.md,
    backgroundColor: '#F5F5F5',
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.xs,
    gap: Theme.spacing.xs,
  },
  
  modeToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: 'transparent',
    gap: Theme.spacing.xs,
  },
  
  modeToggleButtonActive: {
    backgroundColor: Theme.colors.secondary,
  },
  
  modeToggleText: {
    ...Theme.typography.body,
    color: Theme.colors.secondary,
    fontWeight: '600',
  },
  
  modeToggleTextActive: {
    color: Theme.colors.white,
  },
  
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    backgroundColor: '#F5F5F5',
    borderRadius: Theme.borderRadius.md,
    marginBottom: Theme.spacing.sm,
  },
  
  friendItemSelected: {
    backgroundColor: Theme.colors.primary,
    borderWidth: 2,
    borderColor: Theme.colors.secondary,
  },
  
  friendName: {
    ...Theme.typography.body,
    color: '#000000',
    marginLeft: Theme.spacing.md,
    flex: 1,
  },
  
  selectionIndicator: {
    marginLeft: Theme.spacing.sm,
  },
  
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.md,
    backgroundColor: '#F5F5F5',
    borderRadius: Theme.borderRadius.md,
    marginBottom: Theme.spacing.sm,
  },
  
  groupItemSelected: {
    backgroundColor: Theme.colors.primary,
    borderWidth: 2,
    borderColor: Theme.colors.secondary,
  },
  
  groupItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  groupItemInfo: {
    marginLeft: Theme.spacing.md,
    flex: 1,
  },
  
  groupItemName: {
    ...Theme.typography.body,
    color: '#000000',
    fontWeight: '600',
    marginBottom: Theme.spacing.xs,
  },
  
  groupItemDescription: {
    ...Theme.typography.bodySmall,
    color: '#666666',
    marginBottom: Theme.spacing.xs,
  },
  
  groupItemMembers: {
    ...Theme.typography.caption,
    color: '#999999',
  },
  
  createButtonContainer: {
    paddingHorizontal: Theme.layout.screenPadding,
    paddingVertical: Theme.spacing.xl,
  },
  
  createButton: {
    width: '100%',
  },
  
  noFriends: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.lg,
  },
  
  noFriendsText: {
    ...Theme.typography.body,
    color: '#666666',
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.xs,
  },
  
  noFriendsSubtext: {
    ...Theme.typography.bodySmall,
    color: '#999999',
    textAlign: 'center',
  },
  
  configSubtitle: {
    ...Theme.typography.bodySmall,
    color: '#666666',
    marginBottom: Theme.spacing.md,
    textAlign: 'center',
  },
  
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  
  dateInput: {
    flex: 1,
  },
  
  dateLabel: {
    ...Theme.typography.bodySmall,
    color: '#666666',
    marginBottom: Theme.spacing.xs,
    textAlign: 'center',
  },
  
  dateButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 50,
  },
  
  dateButtonText: {
    ...Theme.typography.body,
    color: '#000000',
  },
  
  progressionInput: {
    marginBottom: Theme.spacing.md,
  },
  
  numberInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.sm,
  },
  
  numberButton: {
    backgroundColor: Theme.colors.secondary,
    borderRadius: Theme.borderRadius.md,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  numberValue: {
    ...Theme.typography.body,
    color: '#000000',
    fontWeight: '600',
    minWidth: 80,
    textAlign: 'center',
  },
  
  assessmentTimeContainer: {
    marginTop: Theme.spacing.md,
  },
  
  timeInputButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 50,
  },
  
  timeInputButtonText: {
    ...Theme.typography.body,
    color: '#000000',
  },
  
  pickerModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  
  pickerModalContent: {
    backgroundColor: Theme.colors.background,
    borderTopLeftRadius: Theme.borderRadius.xl,
    borderTopRightRadius: Theme.borderRadius.xl,
    paddingBottom: Theme.spacing.xl,
  },
  
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  
  pickerModalButton: {
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
  },
  
  pickerModalCancelText: {
    ...Theme.typography.body,
    color: '#666666',
  },
  
  pickerModalDoneText: {
    ...Theme.typography.body,
    color: Theme.colors.secondary,
    fontWeight: '600',
  },
  
  pickerModalTitle: {
    ...Theme.typography.h4,
    color: '#000000',
    fontWeight: '600',
  },
});
