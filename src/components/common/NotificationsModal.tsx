import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SectionList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from './Avatar';
import { CenteredModal } from './CenteredModal';
import { useColorMode } from '../../theme/ColorModeContext';
import { FriendshipService } from '../../services/friendshipService';
import { NotificationService } from '../../services/notificationService';
import { AppNotification, NotificationType } from '../../types';

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

const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  hour_before: 'time-outline',
  chat_all: 'chatbubble-outline',
  group_checkins: 'checkmark-circle-outline',
  elimination: 'skull-outline',
  invites: 'person-add-outline',
  reminders: 'alarm-outline',
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
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { colors } = useColorMode();

  useEffect(() => {
    if (visible) {
      loadAll();
    }
  }, [visible, currentUserId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [pendingRequests, inAppNotifs] = await Promise.all([
        FriendshipService.getPendingRequests(currentUserId),
        NotificationService.getInAppNotifications(currentUserId),
      ]);
      setRequests(pendingRequests);
      setNotifications(inAppNotifs);
    } catch (error) {
      if (__DEV__) console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId: string, fromUserId: string) => {
    setProcessingId(requestId);
    try {
      await FriendshipService.acceptFriendRequest(requestId, currentUserId, fromUserId);
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error: any) {
      if (__DEV__) console.error('Error accepting friend request:', error);
      alert(error.message || 'Failed to accept friend request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await FriendshipService.declineFriendRequest(requestId);
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error: any) {
      if (__DEV__) console.error('Error declining friend request:', error);
      alert(error.message || 'Failed to decline friend request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    await NotificationService.markAllRead(currentUserId);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleNotificationTap = async (notif: AppNotification) => {
    if (!notif.read) {
      await NotificationService.markRead(notif.id);
      setNotifications(prev =>
        prev.map(n => (n.id === notif.id ? { ...n, read: true } : n)),
      );
    }
  };

  const hasUnread = notifications.some(n => !n.read);

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

  const renderNotification = ({ item }: { item: AppNotification }) => {
    const iconName = NOTIFICATION_ICONS[item.type] || 'notifications-outline';
    const timeAgo = getTimeAgo(item.createdAt);

    return (
      <TouchableOpacity
        style={[
          styles.notifCard,
          { backgroundColor: colors.card, borderColor: colors.dividerLineTodo + '40' },
          !item.read && { borderLeftColor: colors.accent, borderLeftWidth: 3 },
        ]}
        onPress={() => handleNotificationTap(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.notifIconWrap, { backgroundColor: colors.accent + '20' }]}>
          <Ionicons name={iconName as any} size={20} color={colors.accent} />
        </View>
        <View style={styles.notifContent}>
          <Text
            style={[
              styles.notifTitle,
              { color: colors.text },
              !item.read && { fontWeight: '700' },
            ]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text
            style={[styles.notifBody, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {item.body}
          </Text>
          <Text style={[styles.timeText, { color: colors.textSecondary }]}>{timeAgo}</Text>
        </View>
        {!item.read && (
          <View style={[styles.unreadDot, { backgroundColor: colors.accent }]} />
        )}
      </TouchableOpacity>
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

  const isEmpty = requests.length === 0 && notifications.length === 0;

  return (
    <CenteredModal visible={visible} onClose={onClose} size="large">
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="notifications" size={22} color={colors.accent} />
        <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
        {hasUnread && (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllButton}>
            <Text style={[styles.markAllText, { color: colors.accent }]}>Mark all read</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : isEmpty ? (
        renderEmpty()
      ) : (
        <SectionList
          sections={[
            ...(requests.length > 0
              ? [{ title: 'Friend Requests', data: requests as any[], type: 'request' as const }]
              : []),
            ...(notifications.length > 0
              ? [{ title: 'Recent', data: notifications as any[], type: 'notification' as const }]
              : []),
          ]}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item, section }: any) => {
            if (section.type === 'request') {
              return renderRequest({ item: item as FriendRequest });
            }
            return renderNotification({ item: item as AppNotification });
          }}
          renderSectionHeader={({ section }: any) => (
            <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
              {section.title}
            </Text>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      )}
    </CenteredModal>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    gap: 10,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
  },
  markAllButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '600',
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
    padding: 16,
    paddingBottom: 28,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 4,
  },
  // Friend request card
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    gap: 12,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  requestText: {
    fontSize: 14,
    marginBottom: 2,
  },
  timeText: {
    fontSize: 12,
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
  // In-app notification card
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    gap: 10,
  },
  notifIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  notifBody: {
    fontSize: 13,
    lineHeight: 17,
    marginBottom: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  // Empty state
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
});
