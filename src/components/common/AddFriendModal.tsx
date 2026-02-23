import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from './Avatar';
import { CenteredModal } from './CenteredModal';
import { Theme } from '../../constants/theme';
import { FriendshipService } from '../../services/friendshipService';
import { User } from '../../types';
import { useColorMode } from '../../theme/ColorModeContext';

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
  const { colors } = useColorMode();
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
      if (__DEV__) console.error('Error searching user:', error);
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
      if (__DEV__) console.error('Error sending friend request:', error);
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
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Add Friend</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={styles.content}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Search by username or friend code</Text>
          <View style={[styles.searchRow, { backgroundColor: colors.background, borderColor: colors.dividerLineTodo + '80' }]}>
            <Ionicons name="search" size={18} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Username or friend code"
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            <TouchableOpacity
              style={[styles.searchBtn, { backgroundColor: colors.accent }]}
              onPress={handleSearch}
              disabled={searching}
              activeOpacity={0.8}
            >
              {searching ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>

          {/* Search Result */}
          {searchResult && (
            <View style={[styles.resultCard, { backgroundColor: colors.background, borderColor: colors.accent }]}>
              <Avatar
                source={searchResult.photoURL}
                initials={searchResult.displayName?.charAt(0)}
                size="lg"
              />
              <View style={styles.resultInfo}>
                <Text style={[styles.resultName, { color: colors.text }]}>{searchResult.displayName}</Text>
                <Text style={[styles.resultSubtitle, { color: colors.textSecondary }]}>
                  {searchResult.title || 'Accountability Seeker'}
                </Text>
                <Text style={[styles.friendCode, { color: colors.accent }]}>
                  {searchResult.id.substring(0, 8)}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: colors.accent }]}
                onPress={handleSendRequest}
                disabled={sending}
                activeOpacity={0.8}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.sendBtnText}>Add</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Friend code hint */}
          <View style={[styles.hintBox, { backgroundColor: colors.accent + '10', borderColor: colors.accent + '30' }]}>
            <Ionicons name="finger-print-outline" size={16} color={colors.accent} />
            <Text style={[styles.hintText, { color: colors.textSecondary }]}>
              Your code: <Text style={[styles.hintCode, { color: colors.accent }]}>{currentUserId.substring(0, 8)}</Text>
            </Text>
          </View>
        </View>
      </View>
    </CenteredModal>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingLeft: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    gap: 12,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  resultSubtitle: {
    fontSize: 13,
    marginBottom: 2,
  },
  friendCode: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sendBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  hintText: {
    fontSize: 13,
    fontWeight: '500',
  },
  hintCode: {
    fontWeight: '700',
  },
});
