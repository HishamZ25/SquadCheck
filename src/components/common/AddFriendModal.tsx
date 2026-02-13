import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Input } from './Input';
import { Button } from './Button';
import { Avatar } from './Avatar';
import { CenteredModal } from './CenteredModal';
import { Theme } from '../../constants/theme';
import { FriendshipService } from '../../services/friendshipService';
import { User } from '../../types';

interface AddFriendModalProps {
  visible: boolean;
  onClose: () => void;
  currentUserId: string;
}

export const AddFriendModal: React.FC<AddFriendModalProps> = ({
  visible,
  onClose,
  currentUserId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<User | null>(null);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Error', 'Please enter a username or friend code');
      return;
    }

    setSearching(true);
    setSearchResult(null);

    try {
      const result = await FriendshipService.searchUser(searchQuery.trim());
      
      if (!result) {
        Alert.alert('Not Found', 'No user found with that username or friend code');
      } else if (result.id === currentUserId) {
        Alert.alert('Error', 'You cannot add yourself as a friend');
      } else {
        setSearchResult(result);
      }
    } catch (error: any) {
      console.error('Error searching user:', error);
      Alert.alert('Error', error.message || 'Failed to search for user');
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async () => {
    if (!searchResult) return;

    setSending(true);
    try {
      await FriendshipService.sendFriendRequest(currentUserId, searchResult.id);
      Alert.alert('Success', `Friend request sent to ${searchResult.displayName}!`);
      handleClose();
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', error.message || 'Failed to send friend request');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResult(null);
    onClose();
  };

  return (
    <CenteredModal visible={visible} onClose={handleClose} size="medium" scrollable>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Add Friend</Text>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#1A1A1A" />
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.content}>
        <Text style={styles.label}>Enter Username or Friend Code</Text>
        <View style={styles.searchContainer}>
          <Input
            placeholder="Username or Friend Code"
            value={searchQuery}
            onChangeText={setSearchQuery}
            variant="light"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Button
            title="Search"
            onPress={handleSearch}
            loading={searching}
            variant="secondary"
            style={styles.searchButton}
          />
        </View>

        {/* Search Result */}
        {searchResult && (
          <View style={styles.resultCard}>
            <Avatar
              source={searchResult.photoURL}
              initials={searchResult.displayName?.charAt(0)}
              size="lg"
            />
            <View style={styles.resultInfo}>
              <Text style={styles.resultName}>{searchResult.displayName}</Text>
              <Text style={styles.resultSubtitle}>
                {searchResult.title || 'Accountability Seeker'}
              </Text>
              <Text style={styles.friendCode}>
                Friend Code: {searchResult.id.substring(0, 8)}
              </Text>
            </View>
            <Button
              title="Send Request"
              onPress={handleSendRequest}
              loading={sending}
              variant="secondary"
              size="small"
            />
          </View>
        )}

        <Text style={styles.hint}>
          💡 Your friend code: {currentUserId.substring(0, 8)}
        </Text>
      </View>
    </CenteredModal>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  searchContainer: {
    gap: 12,
    marginBottom: 20,
  },
  searchButton: {
    marginTop: 8,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#FF6B35',
    marginBottom: 20,
    gap: 12,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  resultSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  friendCode: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '600',
  },
  hint: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    backgroundColor: '#FFF5F0',
    padding: 12,
    borderRadius: 12,
  },
});
