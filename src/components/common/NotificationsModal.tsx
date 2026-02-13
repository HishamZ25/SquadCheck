import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from './Avatar';
import { CenteredModal } from './CenteredModal';
import { Theme } from '../../constants/theme';
import { useColorMode } from '../../theme/ColorModeContext';
import { FriendshipService } from '../../services/friendshipService';

interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserPhoto?: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: any;
}

const getTimeAgo = (timestamp: any): string => {
  if (!timestamp) return 'Just now';
  
  const now = new Date();
  const createdDate = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diffMs = now.getTime() - createdDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return createdDate.toLocaleDateString();
};

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  currentUserId: string;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  visible,
  onClose,
  currentUserId,
}) => {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { colors } = useColorMode();

  useEffect(() => {
    if (visible) {
      loadRequests();
    }
  }, [visible, currentUserId]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const pendingRequests = await FriendshipService.getPendingRequests(currentUserId);
      setRequests(pendingRequests);
    } catch (error) {
      console.error('Error loading friend requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId: string, fromUserId: string) => {
    setProcessingId(requestId);
    try {
      await FriendshipService.acceptFriendRequest(requestId, currentUserId, fromUserId);
      // Remove from list
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error: any) {
      console.error('Error accepting friend request:', error);
      alert(error.message || 'Failed to accept friend request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await FriendshipService.declineFriendRequest(requestId);
      // Remove from list
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error: any) {
      console.error('Error declining friend request:', error);
      alert(error.message || 'Failed to decline friend request');
    } finally {
      setProcessingId(null);
    }
  };

  const renderRequest = ({ item }: { item: FriendRequest }) => {
    const isProcessing = processingId === item.id;
    const timeAgo = getTimeAgo(item.createdAt);

    return (
      <View style={[styles.requestCard, { backgroundColor: colors.card, borderColor: colors.accent }]}>
        <Avatar
          source={item.fromUserPhoto}
          initials={item.fromUserName?.charAt(0)}
          size="md"
        />
        <View style={styles.requestInfo}>
          <Text style={[styles.requestName, { color: colors.text }]}>{item.fromUserName}</Text>
          <Text style={[styles.requestText, { color: colors.textSecondary }]}>Wants to be Friends!</Text>
          <Text style={[styles.timeText, { color: colors.textSecondary }]}>{timeAgo}</Text>
        </View>
        
        {isProcessing ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => handleAccept(item.id, item.fromUserId)}
            >
              <Ionicons name="checkmark" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.declineButton}
              onPress={() => handleDecline(item.id)}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-off-outline" size={64} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Notifications</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        You're all caught up!
      </Text>
    </View>
  );

  return (
    <CenteredModal visible={visible} onClose={onClose} size="large">
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.dividerLineTodo + '60' }]}>
        <Ionicons name="notifications" size={24} color={colors.accent} />
        <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequest}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}
    </CenteredModal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    backgroundColor: '#F1F0ED',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#FF6B35',
    gap: 12,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  requestText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  timeText: {
    fontSize: 12,
    color: '#999999',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
});
