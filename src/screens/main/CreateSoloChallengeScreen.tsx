import React, { useState } from 'react';
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
import { GroupService } from '../../services/groupService';
import { auth } from '../../services/firebase';

type ChallengeType = 'elimination' | 'deadline' | 'progression';

interface CreateSoloChallengeScreenProps {
  navigation: any;
  route?: {
    params?: {
      challengeType?: ChallengeType;
    };
  };
}

export const CreateSoloChallengeScreen: React.FC<CreateSoloChallengeScreenProps> = ({ navigation, route }) => {
  const challengeType = route?.params?.challengeType || 'elimination';
  
  const [challengeTitle, setChallengeTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [requirements, setRequirements] = useState(['']);
  const [pointsReward, setPointsReward] = useState(1000);
  const [penaltyAmount, setPenaltyAmount] = useState(0);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [selectedPicture, setSelectedPicture] = useState('');
  const [selectedBadge, setSelectedBadge] = useState('');
  
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

  const handleCreateChallenge = async () => {
    if (!challengeTitle.trim() || !goal.trim()) {
      Alert.alert('Missing Information', 'Please fill in the challenge title and goal.');
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

    try {
      // Get current user ID
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'You must be logged in to create a challenge.');
        return;
      }

      // Create the solo challenge in Firebase
      const challengeId = await GroupService.createGroup(
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
        'solo' // Solo challenge type
      );

      Alert.alert(
        'Solo Challenge Created! 🎉', 
        `Your solo challenge "${challengeTitle}" has been created successfully!`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error creating solo challenge:', error);
      Alert.alert('Error', 'Failed to create challenge. Please try again.');
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
          <Text style={styles.headerTitle}>Create Solo Challenge</Text>
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

        {/* Goal Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Goal</Text>
          <TextInput
            style={styles.textInput}
            placeholder="What is your goal for this challenge?"
            placeholderTextColor={Theme.colors.textTertiary}
            value={goal}
            onChangeText={setGoal}
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
                Define what happens when you miss a requirement
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

          {/* AI Assessment Time - shown for all types */}
          <View style={styles.assessmentTimeContainer}>
            <Text style={styles.configSubtitle}>
              Choose when the AI will assess what you posted (default: midnight)
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

        {/* Rewards Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rewards</Text>
          
          {/* Points Reward */}
          <View style={styles.rewardItem}>
            <View style={styles.rewardHeader}>
              <Ionicons name="diamond" size={24} color={Theme.colors.points} />
              <Text style={styles.rewardLabel}>Points Reward</Text>
            </View>
            <View style={styles.pointsSelector}>
              <TouchableOpacity 
                style={styles.pointsButton} 
                onPress={decreasePoints}
                onLongPress={() => handleLongPress('decreasePoints')}
                delayLongPress={500}
              >
                <Ionicons name="remove" size={20} color={Theme.colors.white} />
              </TouchableOpacity>
              <Text style={styles.pointsValue}>{pointsReward.toLocaleString()}</Text>
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
              <Text style={styles.rewardLabel}>Enter a Penalty</Text>
            </View>
            <View style={styles.pointsSelector}>
              <TouchableOpacity 
                style={styles.pointsButton} 
                onPress={decreasePenalty}
                onLongPress={() => handleLongPress('decreasePenalty')}
                delayLongPress={500}
              >
                <Ionicons name="remove" size={20} color={Theme.colors.white} />
              </TouchableOpacity>
              <Text style={styles.pointsValue}>{penaltyAmount.toLocaleString()}</Text>
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
              <TouchableOpacity style={styles.selectRewardButtonCompact}>
                <Text style={styles.selectRewardTextCompact}>Select Title</Text>
              </TouchableOpacity>
            </View>

            {/* Picture Reward */}
            <View style={styles.rewardItemCompact}>
              <Ionicons name="image" size={20} color={Theme.colors.secondary} />
              <TouchableOpacity style={styles.selectRewardButtonCompact}>
                <Text style={styles.selectRewardTextCompact}>Select Picture</Text>
              </TouchableOpacity>
            </View>

            {/* Badge Reward */}
            <View style={styles.rewardItemCompact}>
              <Ionicons name="ribbon" size={20} color={Theme.colors.secondary} />
              <TouchableOpacity style={styles.selectRewardButtonCompact}>
                <Text style={styles.selectRewardTextCompact}>Select Badge</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Create Challenge Button */}
        <View style={styles.createButtonContainer}>
          <Button
            title="Create Solo Challenge"
            onPress={handleCreateChallenge}
            variant="primary"
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

          {/* End Date Picker Modal for iOS */}
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

// Copy styles from CreateGroupScreen - they should be identical
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
    width: 40,
  },
  section: {
    marginBottom: Theme.spacing.xl,
    paddingHorizontal: Theme.spacing.md,
  },
  sectionTitle: {
    ...Theme.typography.h4,
    color: '#000000',
    fontWeight: '600',
    marginBottom: Theme.spacing.md,
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
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Theme.spacing.md,
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
    justifyContent: 'center',
    marginTop: Theme.spacing.sm,
  },
  numberButton: {
    backgroundColor: Theme.colors.secondary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberValue: {
    ...Theme.typography.h4,
    color: '#000000',
    marginHorizontal: Theme.spacing.lg,
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
    ...Theme.typography.h4,
    color: Theme.colors.secondary,
    marginRight: Theme.spacing.sm,
    marginTop: Theme.spacing.xs,
  },
  requirementInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    color: '#000000',
    ...Theme.typography.body,
    minHeight: 50,
  },
  removeButton: {
    padding: Theme.spacing.xs,
    marginLeft: Theme.spacing.xs,
    marginTop: Theme.spacing.xs,
  },
  addRequirementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.spacing.md,
    marginTop: Theme.spacing.sm,
  },
  addRequirementText: {
    ...Theme.typography.body,
    color: Theme.colors.secondary,
    marginLeft: Theme.spacing.xs,
  },
  rewardItem: {
    backgroundColor: '#F5F5F5',
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
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
    fontWeight: '600',
  },
  pointsSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsButton: {
    backgroundColor: Theme.colors.secondary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsValue: {
    ...Theme.typography.h3,
    color: '#000000',
    marginHorizontal: Theme.spacing.lg,
    minWidth: 100,
    textAlign: 'center',
  },
  rewardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Theme.spacing.xs,
  },
  rewardItemCompact: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.sm,
    alignItems: 'center',
  },
  selectRewardButtonCompact: {
    marginTop: Theme.spacing.xs,
  },
  selectRewardTextCompact: {
    ...Theme.typography.bodySmall,
    color: Theme.colors.secondary,
    textAlign: 'center',
  },
  createButtonContainer: {
    paddingHorizontal: Theme.spacing.md,
    paddingBottom: Theme.spacing.xl,
    marginTop: Theme.spacing.md,
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
    padding: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  pickerModalButton: {
    padding: Theme.spacing.sm,
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

