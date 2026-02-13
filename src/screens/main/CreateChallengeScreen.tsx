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
import { Input } from '../../components/common/Input';
import { Avatar } from '../../components/common/Avatar';
import { ChallengeService } from '../../services/challengeService';
import { FriendshipService } from '../../services/friendshipService';
import { GroupService } from '../../services/groupService';
import { AuthService } from '../../services/authService';
import { auth } from '../../services/firebase';
import { Group } from '../../types';
import { useColorMode } from '../../theme/ColorModeContext';

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
  const { colors } = useColorMode();
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
  const [challengeCountByGroupId, setChallengeCountByGroupId] = useState<Record<string, number>>({});

  // Load friends and groups when component mounts (only for group challenges)
  useEffect(() => {
    if (!isSolo) {
      if (!groupId) {
        loadFriends();
        loadUserGroups();
      } else {
        loadUserGroups(); // Load groups so we have memberIds for the selected group
      }
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
        await loadChallengeCounts(groups);
      }
    } catch (error) {
      console.error('Error loading user groups:', error);
    }
  };

  const loadChallengeCounts = async (groups: Group[]) => {
    if (!groups.length) return;
    const counts: Record<string, number> = {};
    await Promise.all(
      groups.map(async (g) => {
        try {
          const challenges = await ChallengeService.getGroupChallenges(g.id);
          const fromQuery = challenges.length;
          const fromDoc = Array.isArray((g as any).challengeIds) ? (g as any).challengeIds.length : 0;
          counts[g.id] = Math.max(fromQuery, fromDoc);
        } catch {
          counts[g.id] = Array.isArray((g as any).challengeIds) ? (g as any).challengeIds.length : 0;
        }
      })
    );
    setChallengeCountByGroupId((prev) => ({ ...prev, ...counts }));
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

      // Add participants for group challenges
      if (!isSolo) {
        let membersToAdd: string[] = [];
        if (groupId) {
          const selectedGroup = userGroups.find(g => g.id === groupId);
          if (selectedGroup) membersToAdd = selectedGroup.memberIds;
        } else if (participantMode === 'friends') {
          membersToAdd = friends.filter(f => f.selected).map(f => f.id);
        } else if (participantMode === 'group' && selectedGroupId) {
          const selectedGroup = userGroups.find(g => g.id === selectedGroupId);
          if (selectedGroup) membersToAdd = selectedGroup.memberIds;
        }
        for (const memberId of membersToAdd) {
          if (memberId !== currentUser.uid) {
            await ChallengeService.addParticipant(challengeId, memberId);
          }
        }
      }

      // Navigate first, then show success (so user sees their new challenge on home)
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
      Alert.alert(
        'Challenge Created! 🎉', 
        `Your challenge "${challengeTitle}" has been created successfully!`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error creating challenge:', error);
      Alert.alert('Error', 'Failed to create challenge. Please try again.');
    }
  };


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Configure Challenge</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.section}>
          <Input
            label="Challenge Title"
            placeholder="What is This Challenge's Title?"
            value={challengeTitle}
            onChangeText={setChallengeTitle}
            multiline
            variant="light"
          />
        </View>

        <View style={styles.section}>
          <Input
            label="Description"
            placeholder="What is this challenge about?"
            value={description}
            onChangeText={setDescription}
            multiline
            variant="light"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Configure {challengeType.charAt(0).toUpperCase() + challengeType.slice(1)} Challenge
          </Text>

          {challengeType === 'elimination' && (
            <View>
              <Text style={styles.configSubtitle}>
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
                    activeOpacity={0.7}
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
                    activeOpacity={0.7}
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

          <View style={styles.assessmentTimeContainer}>
            <Text style={styles.configSubtitle}>
              Choose when the AI will assess what users posted (default: midnight)
            </Text>
            <TouchableOpacity style={styles.timeInputButton} onPress={() => setShowTimePicker(true)}>
              <Text style={styles.timeInputButtonText}>
                {assessmentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <Ionicons name="time" size={20} color={Theme.colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Requirements & Rules</Text>
          {requirements.map((requirement, index) => (
            <View key={index} style={styles.requirementRow}>
              <Text style={styles.bulletPoint}>*</Text>
              <Input
                placeholder="Enter requirement or rule..."
                value={requirement}
                onChangeText={(text) => updateRequirement(index, text)}
                variant="light"
                containerStyle={{ flex: 1 }}
              />
              {requirements.length > 1 && (
                <TouchableOpacity style={styles.removeButton} onPress={() => removeRequirement(index)}>
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

        {!isSolo && !groupId && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Add Participants</Text>
            <View style={styles.modeToggleContainer}>
              <TouchableOpacity
                style={[styles.modeToggleButton, participantMode === 'friends' && styles.modeToggleButtonActive]}
                onPress={() => setParticipantMode('friends')}
              >
                <Ionicons name="person-add-outline" size={20} color={participantMode === 'friends' ? Theme.colors.white : Theme.colors.secondary} />
                <Text style={[styles.modeToggleText, participantMode === 'friends' && styles.modeToggleTextActive]}>Invite Friends</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeToggleButton, participantMode === 'group' && styles.modeToggleButtonActive]}
                onPress={() => setParticipantMode('group')}
              >
                <Ionicons name="people-outline" size={20} color={participantMode === 'group' ? Theme.colors.white : Theme.colors.secondary} />
                <Text style={[styles.modeToggleText, participantMode === 'group' && styles.modeToggleTextActive]}>Select Group</Text>
              </TouchableOpacity>
            </View>

            {participantMode === 'friends' && (
              friends.length === 0 ? (
                <View style={styles.noFriends}>
                  <Ionicons name="people-outline" size={32} color={Theme.colors.gray400} />
                  <Text style={styles.noFriendsText}>No friends yet</Text>
                  <Text style={styles.noFriendsSubtext}>Add friends to invite them to challenges</Text>
                </View>
              ) : (
                friends.map((friend) => (
                  <TouchableOpacity
                    key={friend.id}
                    style={[styles.friendItem, friend.selected && styles.friendItemSelected]}
                    onPress={() => toggleFriendSelection(friend.id)}
                  >
                    <Avatar source={friend.photoURL} initials={friend.displayName.charAt(0)} size="md" />
                    <Text style={styles.friendName}>{friend.displayName}</Text>
                    <View style={styles.selectionIndicator}>
                      {friend.selected ? (
                        <Ionicons name="checkmark-circle" size={24} color={Theme.colors.secondary} />
                      ) : (
                        <Ionicons name="ellipse-outline" size={24} color={Theme.colors.textTertiary} />
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              )
            )}

            {participantMode === 'group' && (
              userGroups.length === 0 ? (
                <View style={styles.noFriends}>
                  <Ionicons name="people-outline" size={32} color={Theme.colors.gray400} />
                  <Text style={styles.noFriendsText}>No groups yet</Text>
                  <Text style={styles.noFriendsSubtext}>Create a group first to add it to a challenge</Text>
                </View>
              ) : (
                userGroups.map((group) => (
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
                          {(group as { description?: string }).description || ''}
                        </Text>
                        <Text style={styles.groupItemMembers}>
                          {group.memberIds.length} member{group.memberIds.length !== 1 ? 's' : ''}
                        </Text>
                        <Text style={styles.groupItemChallenges}>
                          {(challengeCountByGroupId[group.id] ?? 0)} challenge
                          {(challengeCountByGroupId[group.id] ?? 0) === 1 ? '' : 's'}
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
                ))
              )
            )}
          </View>
        )}

        <View style={styles.createButtonContainer}>
          <Button title="Create Challenge" onPress={handleCreateChallenge} variant="secondary" style={styles.createButton} />
        </View>
      </ScrollView>

      {Platform.OS === 'ios' ? (
        <>
          <Modal visible={showStartDatePicker} transparent animationType="slide" onRequestClose={() => setShowStartDatePicker(false)}>
            <View style={styles.pickerModalContainer}>
              <View style={styles.pickerModalContent}>
                <View style={styles.pickerModalHeader}>
                  <TouchableOpacity onPress={() => setShowStartDatePicker(false)} style={styles.pickerModalButton}>
                    <Text style={styles.pickerModalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.pickerModalTitle}>Select Start Date</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setStartDate(startDate || new Date());
                      setShowStartDatePicker(false);
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
                  onChange={(_, d) => d && setStartDate(d)}
                  textColor="#000000"
                  accentColor={Theme.colors.secondary}
                />
              </View>
            </View>
          </Modal>

          <Modal visible={showEndDatePicker} transparent animationType="slide" onRequestClose={() => setShowEndDatePicker(false)}>
            <View style={styles.pickerModalContainer}>
              <View style={styles.pickerModalContent}>
                <View style={styles.pickerModalHeader}>
                  <TouchableOpacity onPress={() => setShowEndDatePicker(false)} style={styles.pickerModalButton}>
                    <Text style={styles.pickerModalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.pickerModalTitle}>Select End Date</Text>
                  <TouchableOpacity
                    onPress={() => {
                      const chosen = endDate || new Date();
                      if (startDate && chosen <= startDate) {
                        Alert.alert('Invalid Date', 'End date must be after start date');
                        return;
                      }
                      setEndDate(chosen);
                      setShowEndDatePicker(false);
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
                  onChange={(_, d) => {
                    if (d && startDate && d <= startDate) {
                      Alert.alert('Invalid Date', 'End date must be after start date');
                      return;
                    }
                    d && setEndDate(d);
                  }}
                  textColor="#000000"
                  accentColor={Theme.colors.secondary}
                />
              </View>
            </View>
          </Modal>

          <Modal visible={showTimePicker} transparent animationType="slide" onRequestClose={() => setShowTimePicker(false)}>
            <View style={styles.pickerModalContainer}>
              <View style={styles.pickerModalContent}>
                <View style={styles.pickerModalHeader}>
                  <TouchableOpacity onPress={() => setShowTimePicker(false)} style={styles.pickerModalButton}>
                    <Text style={styles.pickerModalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.pickerModalTitle}>Select Time</Text>
                  <TouchableOpacity onPress={() => setShowTimePicker(false)} style={styles.pickerModalButton}>
                    <Text style={styles.pickerModalDoneText}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={assessmentTime}
                  mode="time"
                  display="spinner"
                  onChange={(_, t) => t && setAssessmentTime(t)}
                  textColor="#000000"
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
              accentColor={Theme.colors.secondary}
            />
          )}
          {showEndDatePicker && (
            <DateTimePicker
              value={endDate || new Date()}
              mode="date"
              display="default"
              onChange={handleEndDateChange}
              accentColor={Theme.colors.secondary}
            />
          )}
          {showTimePicker && (
            <DateTimePicker
              value={assessmentTime}
              mode="time"
              display="default"
              onChange={handleTimeChange}
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
    color: '#333333',
    fontSize: 16,
    minHeight: 40,
    textAlignVertical: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
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
    backgroundColor: '#FFF5F0',
    borderWidth: 2,
    borderColor: '#FF6B35',
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
    backgroundColor: '#FFF5F0',
    borderWidth: 2,
    borderColor: '#FF6B35',
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
  groupItemChallenges: {
    ...Theme.typography.caption,
    color: '#999999',
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
  createButtonContainer: {
    paddingHorizontal: Theme.layout.screenPadding,
    paddingVertical: Theme.spacing.xl,
  },
  createButton: {
    width: '100%',
  },
  pickerModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pickerModalContent: {
    backgroundColor: '#F1F0ED',
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
    borderBottomColor: '#E5E5E5',
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
