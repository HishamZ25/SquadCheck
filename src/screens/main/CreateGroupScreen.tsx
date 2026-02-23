import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Theme } from '../../constants/theme';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Avatar } from '../../components/common/Avatar';
import { CircleLoader } from '../../components/common/CircleLoader';
import { GroupService } from '../../services/groupService';
import { FriendshipService } from '../../services/friendshipService';
import { auth } from '../../services/firebase';
import { useColorMode } from '../../theme/ColorModeContext';

type GroupType = 'elimination' | 'deadline' | 'progress';

interface CreateGroupScreenProps {
  navigation: any;
  route?: {
    params?: {
      groupType?: GroupType;
    };
  };
}

interface Friend {
  id: string;
  displayName: string;
  photoURL: string;
  selected: boolean;
}

export const CreateGroupScreen: React.FC<CreateGroupScreenProps> = ({ navigation, route }) => {
  const { colors } = useColorMode();
  const groupType = route?.params?.groupType || 'elimination';
  
  const [challengeTitle, setChallengeTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [requirements, setRequirements] = useState(['']);
  const [pointsReward, setPointsReward] = useState(1000);
  const [penaltyAmount, setPenaltyAmount] = useState(0);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [selectedPicture, setSelectedPicture] = useState('');
  const [selectedBadge, setSelectedBadge] = useState('');
  
  // Configuration states based on group type
  const [eliminationRule, setEliminationRule] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [progressionDuration, setProgressionDuration] = useState<number>(7);
  const [intervalType, setIntervalType] = useState('');
  const [assessmentTime, setAssessmentTime] = useState<Date>(new Date(new Date().setHours(23, 59, 0, 0)));
  
  // Date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Load friends when component mounts
  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      setLoadingFriends(true);
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
      } else {
      }
    } catch (error) {
      if (__DEV__) console.error('Error loading friends:', error);
    } finally {
      setLoadingFriends(false);
    }
  };

  const addRequirement = () => {
    setRequirements([...requirements, '']);
  };

  const updateRequirement = (index: number, text: string) => {
    const newRequirements = [...requirements];
    newRequirements[index] = text;
    setRequirements(newRequirements);
    
    // Add new requirement if user presses enter and this is the last one
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

  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);

  const toggleFriendSelection = (friendId: string) => {
    setFriends(prevFriends => 
      prevFriends.map(friend => 
        friend.id === friendId 
          ? { ...friend, selected: !friend.selected }
          : friend
      )
    );
  };

    const handleInviteExternalUsers = () => {
    Alert.alert(
      'Invite External Users', 
      'You can invite external users after the group is created. For now, just create the group and then invite people with the actual group link.',
      [
        { text: 'OK', style: 'default' },
        { 
          text: 'Create Group First', 
          onPress: () => {
            // Focus on creating the group first
            Alert.alert('Smart!', 'Create the group first, then you\'ll get a real invite link to share with people.');
          }
        }
      ]
    );
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
      // Ensure end date is after start date
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

  const handleCreateGroup = async () => {
    if (!challengeTitle.trim() || !goal.trim()) {
      Alert.alert('Missing Information', 'Please fill in the challenge title and goal.');
      return;
    }

    // Validate required fields based on group type
    if (groupType === 'elimination' && !eliminationRule.trim()) {
      Alert.alert('Error', 'Please enter an elimination rule');
      return;
    }

    if (groupType === 'deadline' && (!startDate || !endDate)) {
      Alert.alert('Error', 'Please select both start and end dates');
      return;
    }

    if (groupType === 'progress' && (!progressionDuration || !intervalType.trim())) {
      Alert.alert('Error', 'Please fill in all progression fields');
      return;
    }

    try {
      // Get current user ID
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'You must be logged in to create a group.');
        return;
      }

      // Create the group in Firebase
      const groupId = await GroupService.createGroup(
        challengeTitle.trim(),
        goal.trim(),
        requirements.filter(req => req.trim()), // Remove empty requirements
        {
          points: pointsReward,
          ...(selectedTitle && { title: selectedTitle }),
          ...(selectedPicture && { picture: selectedPicture }),
          ...(selectedBadge && { badge: selectedBadge }),
        },
        penaltyAmount,
        currentUser.uid,
        'team' // TODO: Let user choose team vs solo
      );

      const selectedFriends = friends.filter(friend => friend.selected);
      
      if (selectedFriends.length > 0) {
        // TODO: Create invitations for selected friends
        Alert.alert(
          'Group Created! 🎉', 
          `Your group "${challengeTitle}" has been created successfully! ${selectedFriends.length} friend(s) will receive in-app invites.`,
          [
            { text: 'OK', style: 'default' },
            { 
              text: 'Share Group Link', 
              onPress: () => {
                // TODO: Generate and share actual group invite link
                Alert.alert('Share Group', `Group ID: ${groupId}\nInvite link will be generated here after deep linking setup.`);
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Group Created! 🎉', 
          `Your group "${challengeTitle}" has been created successfully! You can invite friends later.`,
          [
            { text: 'OK', style: 'default' },
            { 
              text: 'Invite Friends Now', 
              onPress: () => {
                // TODO: Navigate to invite friends screen
                Alert.alert('Invite Friends', 'Navigate to invite friends screen after Firebase integration.');
              }
            }
          ]
        );
      }
      
      navigation.goBack();
    } catch (error) {
      if (__DEV__) console.error('Error creating group:', error);
      Alert.alert('Error', 'Failed to create group. Please try again.');
    }
  };

  const increasePoints = () => {
    if (pointsReward < 10000) {
      setPointsReward(pointsReward + 100);
    }
  };

  const decreasePoints = () => {
    if (pointsReward > 100) {
      setPointsReward(pointsReward - 100);
    }
  };

  const increasePenalty = () => {
    if (penaltyAmount < pointsReward) {
      setPenaltyAmount(penaltyAmount + 100);
    }
  };

  const decreasePenalty = () => {
    if (penaltyAmount > 0) {
      setPenaltyAmount(penaltyAmount - 100);
    }
  };

  const handleLongPress = (action: 'increasePoints' | 'decreasePoints' | 'increasePenalty' | 'decreasePenalty') => {
    const interval = setInterval(() => {
      switch (action) {
        case 'increasePoints':
          if (pointsReward < 10000) {
            setPointsReward(prev => prev + 100);
          }
          break;
        case 'decreasePoints':
          if (pointsReward > 100) {
            setPointsReward(prev => prev - 100);
          }
          break;
        case 'increasePenalty':
          if (penaltyAmount < pointsReward) {
            setPenaltyAmount(prev => prev + 100);
          }
          break;
        case 'decreasePenalty':
          if (penaltyAmount > 0) {
            setPenaltyAmount(prev => prev - 100);
          }
          break;
      }
    }, 100);

    // Clear interval after 2 seconds
    setTimeout(() => clearInterval(interval), 2000);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Create New Group</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Challenge Title Section */}
        <View style={styles.section}>
          <Input
            label="Challenge Title"
            placeholder="What is This Group's Title?"
            value={challengeTitle}
            onChangeText={setChallengeTitle}
            multiline
            variant="light"
          />
        </View>

        {/* Challenge Configuration Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Configure {groupType.charAt(0).toUpperCase() + groupType.slice(1)} Challenge
          </Text>

          {groupType === 'elimination' && (
            <View>
              <Text style={[styles.configSubtitle, { color: colors.textSecondary }]}>
                Define what happens when a user misses a requirement
              </Text>
              <Input
                placeholder="Enter elimination rule..."
                value={eliminationRule}
                onChangeText={setEliminationRule}
                multiline
                variant="light"
              />
            </View>
          )}

          {groupType === 'deadline' && (
            <View>
              <Text style={[styles.configSubtitle, { color: colors.textSecondary }]}>
                Set when the challenge starts and ends
              </Text>
              <View style={styles.dateRow}>
                <View style={styles.dateInput}>
                  <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>Start Date</Text>
                  <TouchableOpacity
                    style={[styles.dateButton, { backgroundColor: colors.surface }]}
                    onPress={() => setShowStartDatePicker(true)}
                  >
                    <Text style={[styles.dateButtonText, { color: colors.text }]}>
                      {startDate ? startDate.toLocaleDateString() : 'Select start date'}
                    </Text>
                    <Ionicons name="calendar" size={20} color={Theme.colors.textTertiary} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.dateInput}>
                  <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>End Date</Text>
                  <TouchableOpacity
                    style={[styles.dateButton, { backgroundColor: colors.surface }]}
                    onPress={() => setShowEndDatePicker(true)}
                  >
                    <Text style={[styles.dateButtonText, { color: colors.text }]}>
                      {endDate ? endDate.toLocaleDateString() : 'Select end date'}
                    </Text>
                    <Ionicons name="calendar" size={20} color={Theme.colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {groupType === 'progress' && (
            <View>
              <View style={styles.progressionInput}>
                <Text style={[styles.configSubtitle, { color: colors.textSecondary }]}>
                  Choose the amount of time between each interval progression
                </Text>
                <View style={[styles.numberInputContainer, { backgroundColor: colors.surface }]}>
                  <TouchableOpacity
                    style={styles.numberButton}
                    onPress={() => setProgressionDuration(Math.max(1, progressionDuration - 1))}
                  >
                    <Ionicons name="remove" size={20} color={Theme.colors.white} />
                  </TouchableOpacity>
                  <Text style={[styles.numberValue, { color: colors.text }]}>{progressionDuration} days</Text>
                  <TouchableOpacity 
                    style={styles.numberButton}
                    onPress={() => setProgressionDuration(progressionDuration + 1)}
                  >
                    <Ionicons name="add" size={20} color={Theme.colors.white} />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.progressionInput}>
                <Text style={[styles.configSubtitle, { color: colors.textSecondary }]}>
                  What needs to increase? Cardio done? Time spent coding?
                </Text>
                <Input
                  placeholder="Enter interval type..."
                  value={intervalType}
                  onChangeText={setIntervalType}
                  multiline
                  variant="light"
                />
              </View>
            </View>
          )}

          {/* AI Assessment Time - shown for all types */}
          <View style={styles.assessmentTimeContainer}>
            <Text style={[styles.configSubtitle, { color: colors.textSecondary }]}>
              Choose when the AI will assess what users posted (default: midnight)
            </Text>
            <TouchableOpacity
              style={[styles.timeInputButton, { backgroundColor: colors.surface }]}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={[styles.timeInputButtonText, { color: colors.text }]}>
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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Requirements & Rules</Text>
                  {requirements.map((requirement, index) => (
          <View key={index} style={styles.requirementRow}>
            <Text style={styles.bulletPoint}>*</Text>
            <Input
              placeholder="Enter requirement or rule..."
              value={requirement}
              onChangeText={(text) => updateRequirement(index, text)}
              multiline
              variant="light"
              containerStyle={{ flex: 1 }}
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

        {/* Rewards Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Rewards</Text>

          {/* Points Reward */}
          <View style={styles.rewardItem}>
            <View style={styles.rewardHeader}>
              <Ionicons name="diamond" size={24} color={Theme.colors.points} />
              <Text style={[styles.rewardLabel, { color: colors.text }]}>Points Reward</Text>
            </View>
            <View style={[styles.pointsSelector, { backgroundColor: colors.surface }]}>
              <TouchableOpacity 
                style={styles.pointsButton} 
                onPress={decreasePoints}
                onLongPress={() => handleLongPress('decreasePoints')}
                delayLongPress={500}
              >
                <Ionicons name="remove" size={20} color={Theme.colors.white} />
              </TouchableOpacity>
              <Text style={[styles.pointsValue, { color: colors.text }]}>{pointsReward.toLocaleString()}</Text>
              <TouchableOpacity 
                style={styles.pointsButton} 
                onPress={increasePoints}
                onLongPress={() => handleLongPress('increasePoints')}
                delayLongPress={500}
              >
                <Ionicons name="add" size={20} color={Theme.colors.white} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Penalty Section */}
          <View style={styles.rewardItem}>
            <View style={styles.rewardHeader}>
              <Ionicons name="warning" size={24} color={Theme.colors.error} />
              <Text style={[styles.rewardLabel, { color: colors.text }]}>Enter a Penalty</Text>
            </View>
            <View style={[styles.pointsSelector, { backgroundColor: colors.surface }]}>
              <TouchableOpacity 
                style={styles.pointsButton} 
                onPress={decreasePenalty}
                onLongPress={() => handleLongPress('decreasePenalty')}
                delayLongPress={500}
              >
                <Ionicons name="remove" size={20} color={Theme.colors.white} />
              </TouchableOpacity>
              <Text style={[styles.pointsValue, { color: colors.text }]}>{penaltyAmount.toLocaleString()}</Text>
              <TouchableOpacity 
                style={styles.pointsButton} 
                onPress={increasePenalty}
                onLongPress={() => handleLongPress('increasePenalty')}
                delayLongPress={500}
              >
                <Ionicons name="add" size={20} color={Theme.colors.white} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Title, Picture & Badge Rewards - All on one line */}
          <View style={styles.rewardsRow}>
            {/* Title Reward */}
            <View style={styles.rewardItemCompact}>
              <Ionicons name="text" size={20} color={Theme.colors.secondary} />
              <TouchableOpacity style={[styles.selectRewardButtonCompact, { backgroundColor: colors.surface }]}>
                <Text style={[styles.selectRewardTextCompact, { color: colors.textSecondary }]}>Select Title</Text>
              </TouchableOpacity>
            </View>

            {/* Picture Reward */}
            <View style={styles.rewardItemCompact}>
              <Ionicons name="image" size={20} color={Theme.colors.secondary} />
              <TouchableOpacity style={[styles.selectRewardButtonCompact, { backgroundColor: colors.surface }]}>
                <Text style={[styles.selectRewardTextCompact, { color: colors.textSecondary }]}>Select Picture</Text>
              </TouchableOpacity>
            </View>

            {/* Badge Reward */}
            <View style={styles.rewardItemCompact}>
              <Ionicons name="ribbon" size={20} color={Theme.colors.secondary} />
              <TouchableOpacity style={[styles.selectRewardButtonCompact, { backgroundColor: colors.surface }]}>
                <Text style={[styles.selectRewardTextCompact, { color: colors.textSecondary }]}>Select Badge</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Invite Friends Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Invite Friends</Text>

          {loadingFriends ? (
            <View style={styles.loadingFriends}>
              <CircleLoader dotColor="#FF6B35" size="large" />
              <Text style={[styles.loadingFriendsText, { color: colors.textSecondary }]}>Loading friends...</Text>
            </View>
          ) : friends.length === 0 ? (
            <View style={styles.noFriends}>
              <Ionicons name="people-outline" size={32} color={colors.textSecondary} />
              <Text style={[styles.noFriendsText, { color: colors.textSecondary }]}>No friends yet</Text>
              <Text style={[styles.noFriendsSubtext, { color: colors.textSecondary }]}>Add friends to invite them to groups</Text>
            </View>
          ) : (
            <>
              {friends.map((friend) => (
                <TouchableOpacity
                  key={friend.id}
                  style={[styles.friendItem, { backgroundColor: colors.surface }, friend.selected && [styles.friendItemSelected, { backgroundColor: colors.card }]]}
                  onPress={() => toggleFriendSelection(friend.id)}
                >
                  <Avatar
                    source={friend.photoURL}
                    initials={friend.displayName.charAt(0)}
                    size="md"
                  />
                  <Text style={[styles.friendName, { color: colors.text }]}>{friend.displayName}</Text>
                  <View style={styles.selectionIndicator}>
                    {friend.selected ? (
                      <Ionicons name="checkmark-circle" size={24} color={Theme.colors.secondary} />
                    ) : (
                      <Ionicons name="ellipse-outline" size={24} color={Theme.colors.textTertiary} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}

              <TouchableOpacity style={styles.inviteButton} onPress={handleInviteExternalUsers}>
                <Ionicons name="person-add" size={20} color={Theme.colors.secondary} />
                <Text style={styles.inviteButtonText}>Invite More Friends</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Create Group Button */}
        <View style={styles.createButtonContainer}>
          <Button
            title="Create Group"
            onPress={handleCreateGroup}
            variant="secondary"
            style={styles.createButton}
          />
        </View>
      </ScrollView>

      {/* Date and Time Pickers */}
      {Platform.OS === 'ios' ? (
        <>
          {/* Start Date Picker Modal for iOS */}
          <Modal
            visible={showStartDatePicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowStartDatePicker(false)}
          >
            <View style={styles.pickerModalContainer}>
              <View style={[styles.pickerModalContent, { backgroundColor: colors.background }]}>
                <View style={[styles.pickerModalHeader, { borderBottomColor: colors.dividerLineTodo + '60' }]}>
                  <TouchableOpacity
                    onPress={() => setShowStartDatePicker(false)}
                    style={styles.pickerModalButton}
                  >
                    <Text style={[styles.pickerModalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={[styles.pickerModalTitle, { color: colors.text }]}>Select Start Date</Text>
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

          {/* End Date Picker Modal for iOS */}
          <Modal
            visible={showEndDatePicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowEndDatePicker(false)}
          >
            <View style={styles.pickerModalContainer}>
              <View style={[styles.pickerModalContent, { backgroundColor: colors.background }]}>
                <View style={[styles.pickerModalHeader, { borderBottomColor: colors.dividerLineTodo + '60' }]}>
                  <TouchableOpacity
                    onPress={() => setShowEndDatePicker(false)}
                    style={styles.pickerModalButton}
                  >
                    <Text style={[styles.pickerModalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={[styles.pickerModalTitle, { color: colors.text }]}>Select End Date</Text>
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
                      // Ensure end date is after start date
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

          {/* Time Picker Modal for iOS */}
          <Modal
            visible={showTimePicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowTimePicker(false)}
          >
            <View style={styles.pickerModalContainer}>
              <View style={[styles.pickerModalContent, { backgroundColor: colors.background }]}>
                <View style={[styles.pickerModalHeader, { borderBottomColor: colors.dividerLineTodo + '60' }]}>
                  <TouchableOpacity
                    onPress={() => setShowTimePicker(false)}
                    style={styles.pickerModalButton}
                  >
                    <Text style={[styles.pickerModalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={[styles.pickerModalTitle, { color: colors.text }]}>Select Time</Text>
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
          {/* Android pickers - have built-in cancel */}
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#F1F0ED',
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
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
    ...Theme.typography.h3,
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
  
  rewardItem: {
    marginBottom: Theme.spacing.md,
  },
  
  rewardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  
  rewardLabel: {
    ...Theme.typography.body,
    color: '#000000',
    marginLeft: Theme.spacing.sm,
    fontWeight: '500',
  },
  
  pointsSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.sm,
  },
  
  pointsButton: {
    backgroundColor: Theme.colors.secondary,
    borderRadius: Theme.borderRadius.md,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  pointsValue: {
    ...Theme.typography.h4,
    color: '#000000',
    fontWeight: '700',
    minWidth: 80,
    textAlign: 'center',
  },
  
  selectRewardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
  },
  
  selectRewardText: {
    ...Theme.typography.body,
    color: '#999999',
  },
  
  rewardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Theme.spacing.md,
  },
  
  rewardItemCompact: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: Theme.spacing.xs,
  },
  
  selectRewardButtonCompact: {
    backgroundColor: '#F5F5F5',
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.sm,
    marginTop: Theme.spacing.xs,
    alignItems: 'center',
    minWidth: 80,
  },
  
  selectRewardTextCompact: {
    ...Theme.typography.caption,
    color: '#999999',
    textAlign: 'center',
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
    backgroundColor: '#FFFFFF',
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
  
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Theme.colors.secondary,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    marginTop: Theme.spacing.md,
  },
  
  inviteButtonText: {
    ...Theme.typography.body,
    color: Theme.colors.secondary,
    fontWeight: '600',
    marginLeft: Theme.spacing.sm,
  },

  
  createButtonContainer: {
    paddingHorizontal: Theme.layout.screenPadding,
    paddingVertical: Theme.spacing.xl,
  },
  
  createButton: {
    width: '100%',
  },
  
  loadingFriends: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.lg,
  },
  
  loadingFriendsText: {
    ...Theme.typography.bodySmall,
    color: '#666666',
    marginTop: Theme.spacing.sm,
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