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
  Linking,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../constants/theme';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { GroupService } from '../../services/groupService';
import { auth } from '../../services/firebase';

interface CreateGroupScreenProps {
  navigation: any;
}

interface Friend {
  id: string;
  displayName: string;
  photoURL: string;
  selected: boolean;
}

export const CreateGroupScreen: React.FC<CreateGroupScreenProps> = ({ navigation }) => {
  const [challengeTitle, setChallengeTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [requirements, setRequirements] = useState(['']);
  const [pointsReward, setPointsReward] = useState(1000);
  const [penaltyAmount, setPenaltyAmount] = useState(0);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [selectedPicture, setSelectedPicture] = useState('');
  const [selectedBadge, setSelectedBadge] = useState('');

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

  const [friends, setFriends] = useState<Friend[]>([
    { id: '1', displayName: 'Alex Chen', photoURL: '', selected: false },
    { id: '2', displayName: 'Sarah Kim', photoURL: '', selected: false },
    { id: '3', displayName: 'Mike Johnson', photoURL: '', selected: false },
  ]);

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

  const handleCreateGroup = async () => {
    if (!challengeTitle.trim() || !goal.trim()) {
      Alert.alert('Missing Information', 'Please fill in the challenge title and goal.');
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
          title: selectedTitle || undefined,
          picture: selectedPicture || undefined,
          badge: selectedBadge || undefined,
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
      console.error('Error creating group:', error);
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
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={Theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create New Group</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Challenge Title Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Challenge Title</Text>
          <TextInput
            style={styles.textInput}
            placeholder="What is This Group's Title?"
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
            placeholder="What is the Goal of this Challenge?"
            placeholderTextColor={Theme.colors.textTertiary}
            value={goal}
            onChangeText={setGoal}
            multiline
            textAlign="center"
          />
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

                {/* Invite Friends Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invite Friends</Text>

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

          <TouchableOpacity style={styles.inviteButton} onPress={handleInviteExternalUsers}>
            <Ionicons name="person-add" size={20} color={Theme.colors.secondary} />
            <Text style={styles.inviteButtonText}>Invite After Creation</Text>
          </TouchableOpacity>
        </View>

        {/* Create Group Button */}
        <View style={styles.createButtonContainer}>
          <Button
            title="Create Group"
            onPress={handleCreateGroup}
            variant="primary"
            style={styles.createButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
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
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  
  backButton: {
    padding: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.card,
  },
  
  headerTitle: {
    ...Theme.typography.h2,
    color: Theme.colors.text,
    fontWeight: '700',
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
    color: Theme.colors.text,
    marginBottom: Theme.spacing.xs,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  textInput: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    color: Theme.colors.text,
    fontSize: 16,
    minHeight: 50,
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
    color: Theme.colors.text,
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
    color: Theme.colors.text,
    marginLeft: Theme.spacing.sm,
    fontWeight: '500',
  },
  
  pointsSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.card,
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
    color: Theme.colors.text,
    fontWeight: '700',
    minWidth: 80,
    textAlign: 'center',
  },
  
  selectRewardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
  },
  
  selectRewardText: {
    ...Theme.typography.body,
    color: Theme.colors.textTertiary,
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
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.sm,
    marginTop: Theme.spacing.xs,
    alignItems: 'center',
    minWidth: 80,
  },
  
  selectRewardTextCompact: {
    ...Theme.typography.caption,
    color: Theme.colors.textTertiary,
    textAlign: 'center',
  },
  
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    backgroundColor: Theme.colors.card,
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
    color: Theme.colors.text,
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
}); 