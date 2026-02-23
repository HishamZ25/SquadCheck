import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../constants/theme';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Avatar } from '../../components/common/Avatar';
import { CircleLoader } from '../../components/common/CircleLoader';
import { GroupService } from '../../services/groupService';
import { FriendshipService } from '../../services/friendshipService';
import { auth } from '../../services/firebase';

interface CreateSimpleGroupScreenProps {
  navigation: any;
}

interface Friend {
  id: string;
  displayName: string;
  photoURL: string;
  selected: boolean;
}

export const CreateSimpleGroupScreen: React.FC<CreateSimpleGroupScreenProps> = ({ navigation }) => {
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);

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
      }
    } catch (error) {
      if (__DEV__) console.error('Error loading friends:', error);
    } finally {
      setLoadingFriends(false);
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

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Missing Information', 'Please enter a group name.');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Missing Information', 'Please enter a group description.');
      return;
    }

    const selectedFriends = friends.filter(friend => friend.selected);
    
    // Groups must have at least 2 members (creator + at least 1 friend)
    if (selectedFriends.length === 0) {
      Alert.alert('Missing Members', 'Please select at least one friend to create a group.');
      return;
    }

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'You must be logged in to create a group.');
        return;
      }

      // Create the group in Firebase
      await GroupService.createGroup(
        groupName.trim(),
        description.trim(),
        currentUser.uid,
        selectedFriends.map(f => f.id)
      );

      // Navigate to Groups first, then show success (so user sees their new group)
      navigation.goBack();
      Alert.alert(
        'Group Created! 🎉', 
        `Your group "${groupName}" has been created successfully!`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      if (__DEV__) console.error('Error creating group:', error);
      Alert.alert('Error', error.message || 'Failed to create group. Please try again.');
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
            <Ionicons name="arrow-back" size={22} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create New Group</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Group Name Section */}
        <View style={styles.section}>
          <Input
            label="Group Name"
            placeholder="Enter group name..."
            value={groupName}
            onChangeText={setGroupName}
            variant="light"
          />
        </View>

        {/* Description Section */}
        <View style={styles.section}>
          <Input
            label="Description"
            placeholder="What is this group about?"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            variant="light"
          />
        </View>

        {/* Invite Friends Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Members</Text>
          <Text style={styles.sectionSubtitle}>
            Select friends to add to your group (at least 1 required)
          </Text>

          {loadingFriends ? (
            <View style={styles.loadingFriends}>
              <CircleLoader dotColor="#FF6B35" size="medium" />
              <Text style={styles.loadingFriendsText}>Loading friends...</Text>
            </View>
          ) : friends.length === 0 ? (
            <View style={styles.noFriends}>
              <Ionicons name="people-outline" size={32} color={Theme.colors.gray400} />
              <Text style={styles.noFriendsText}>No friends yet</Text>
              <Text style={styles.noFriendsSubtext}>Add friends to invite them to groups</Text>
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
    ...Theme.typography.h4,
    color: '#333',
    marginBottom: Theme.spacing.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  sectionSubtitle: {
    ...Theme.typography.bodySmall,
    color: '#555',
    marginBottom: Theme.spacing.md,
    textAlign: 'center',
  },
  
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FF6B35',
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    color: '#333',
    fontSize: 16,
    minHeight: Theme.layout.inputHeight,
  },
  
  descriptionInput: {
    minHeight: 100,
    textAlignVertical: 'top',
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
    color: '#333',
    marginLeft: Theme.spacing.md,
    flex: 1,
  },
  
  selectionIndicator: {
    marginLeft: Theme.spacing.sm,
  },
  
  loadingFriends: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.lg,
  },
  
  loadingFriendsText: {
    ...Theme.typography.bodySmall,
    color: '#555',
    marginTop: Theme.spacing.sm,
  },
  
  noFriends: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.lg,
  },
  
  noFriendsText: {
    ...Theme.typography.body,
    color: '#555',
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.xs,
  },
  
  noFriendsSubtext: {
    ...Theme.typography.bodySmall,
    color: '#666',
    textAlign: 'center',
  },
  
  createButtonContainer: {
    paddingHorizontal: Theme.layout.screenPadding,
    paddingVertical: Theme.spacing.xl,
  },
  
  createButton: {
    width: '100%',
  },
});
