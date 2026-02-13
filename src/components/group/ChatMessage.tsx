import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, Modal, Dimensions } from 'react-native';
import { Avatar } from '../common/Avatar';
import { GroupChatMessage } from '../../services/messageService';
import { Ionicons } from '@expo/vector-icons';
import { useColorMode } from '../../theme/ColorModeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function formatMessageTime(timestamp: GroupChatMessage['timestamp']): string {
  if (timestamp == null) return '';
  const raw = timestamp as any;
  let date: Date | null = null;
  if (typeof raw?.toDate === 'function') date = raw.toDate();
  else if (raw instanceof Date) date = raw;
  else if (typeof raw?.seconds === 'number') date = new Date(raw.seconds * 1000);
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

interface ChatMessageProps {
  message: GroupChatMessage;
  isOwn: boolean;
  onUpvote: (messageId: string) => void;
  onDownvote: (messageId: string, reason: string) => void;
  onAIJudge: (messageId: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isOwn,
  onUpvote,
  onDownvote,
  onAIJudge,
}) => {
  const { colors } = useColorMode();
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const isCheckIn = message.type === 'checkin';
  const isElimination = message.type === 'elimination';
  const isWinner = message.type === 'winner';

  return (
    <View style={[styles.messageContainer, isOwn && styles.ownMessage]}>
      {!isOwn && (
        <Avatar
          source={undefined}
          initials={message.userName.charAt(0)}
          size="sm"
          style={styles.messageAvatar}
        />
      )}

      <View style={[
        styles.messageBubble,
        { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.dividerLineTodo + '99' },
        isOwn && [styles.ownMessageBubble, { backgroundColor: colors.accent, borderColor: 'transparent' }],
        isCheckIn && [styles.checkInMessageBubble, { backgroundColor: colors.surface, borderColor: colors.dividerLineTodo + '99' }]
      ]}>
        {!isOwn && (
          <Text style={[styles.messageUserName, { color: colors.textSecondary }]}>{message.userName}</Text>
        )}

        {isCheckIn ? (
          <View style={styles.checkInContent}>
            {(message as any).challengeTitle && (
              <View style={styles.challengeTitleContainer}>
                <Ionicons name="trophy" size={16} color={colors.accent} />
                <Text style={[styles.challengeTitle, { color: colors.accent }]}>{(message as any).challengeTitle}</Text>
              </View>
            )}

            {message.imageUrl && (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setImageModalVisible(true)}
                style={styles.checkInImageTouchable}
              >
                <Image source={{ uri: message.imageUrl }} style={styles.checkInImage} />
              </TouchableOpacity>
            )}

            <Modal
              visible={imageModalVisible}
              transparent
              animationType="fade"
              onRequestClose={() => setImageModalVisible(false)}
            >
              <TouchableOpacity
                activeOpacity={1}
                style={styles.imageModalOverlay}
                onPress={() => setImageModalVisible(false)}
              >
                <View style={styles.imageModalContent}>
                  <TouchableOpacity
                    style={styles.imageModalClose}
                    onPress={() => setImageModalVisible(false)}
                    hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                  >
                    <Ionicons name="close" size={32} color="#FFF" />
                  </TouchableOpacity>
                  <Image
                    source={{ uri: message.imageUrl }}
                    style={styles.imageModalImage}
                    resizeMode="contain"
                  />
                </View>
              </TouchableOpacity>
            </Modal>

            {message.text && (
              <Text style={[styles.checkInNote, { color: colors.text }]}>{message.text}</Text>
            )}

            {!isOwn && (
              <View style={[styles.votingSection, { borderTopColor: colors.dividerLineTodo + '60' }]}>
                <TouchableOpacity style={styles.voteButton} onPress={() => onUpvote(message.id)}>
                  <Ionicons
                    name="thumbs-up"
                    size={18}
                    color={(message.upvotes || 0) > 0 ? '#4CAF50' : colors.textSecondary}
                  />
                  <Text style={[styles.voteCount, { color: colors.text }]}>{message.upvotes || 0}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.aiJudgeButton, { backgroundColor: colors.accent }]} onPress={() => onAIJudge(message.id)}>
                  <Text style={styles.aiJudgeButtonText}>Judge with AI</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.voteButton} onPress={() => onDownvote(message.id, '')}>
                  <Ionicons
                    name="thumbs-down"
                    size={18}
                    color={(message.downvotes || 0) > 0 ? '#F44336' : colors.textSecondary}
                  />
                  <Text style={[styles.voteCount, { color: colors.text }]}>{message.downvotes || 0}</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={[styles.messageTime, styles.checkInMessageTime, { color: colors.textSecondary }]}>
              {formatMessageTime(message.timestamp) || '—'}
            </Text>
          </View>
        ) : isElimination ? (
          <Text style={[styles.messageText, { color: colors.text }]}>
            {(message as any).challengeName ? (
              <>
                {(message.text || '').split((message as any).challengeName)[0]}
                <Text style={styles.eliminationChallengeName}>{(message as any).challengeName}</Text>
                {(message.text || '').split((message as any).challengeName)[1] || ". They've been eliminated."}
              </>
            ) : (
              message.text
            )}
          </Text>
        ) : isWinner ? (
          <Text style={[styles.messageText, { color: colors.text }]}>
            {(message as any).challengeName ? (
              <>
                {(message.text || '').split((message as any).challengeName)[0]}
                <Text style={styles.eliminationChallengeName}>{(message as any).challengeName}</Text>
                {(message.text || '').split((message as any).challengeName)[1] || '. They win!'}
              </>
            ) : (
              message.text
            )}
          </Text>
        ) : (
          <>
            {message.type === 'text' ? (
              <Text style={[styles.messageText, { color: isOwn ? '#FFF' : colors.text }, isOwn && styles.ownMessageText]}>
                {message.text}
              </Text>
            ) : (
              <Image source={{ uri: message.imageUrl }} style={styles.messageImage} />
            )}
          </>
        )}

        {!isCheckIn && (
          <Text style={[styles.messageTime, { color: isOwn ? 'rgba(255,255,255,0.7)' : colors.textSecondary }, isOwn && styles.ownMessageTime]}>
            {formatMessageTime(message.timestamp)}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'flex-start',
  },
  ownMessage: {
    flexDirection: 'row-reverse',
  },
  messageAvatar: {
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
  },
  ownMessageBubble: {
    backgroundColor: '#FF6B35',
  },
  checkInMessageBubble: {
    maxWidth: '90%',
    minWidth: 280,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  messageUserName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
  },
  checkInContent: {
    gap: 12,
  },
  challengeTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  challengeTitle: {
    fontSize: 15,
    color: '#FF6B35',
    fontWeight: '700',
    flex: 1,
  },
  checkInImageTouchable: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  checkInImage: {
    width: '100%',
    height: 280,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  checkInNote: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContent: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  imageModalImage: {
    width: SCREEN_WIDTH,
    height: '80%',
  },
  votingSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 6,
  },
  voteCount: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  aiJudgeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FF6B35',
    borderRadius: 12,
  },
  aiJudgeButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  messageText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  eliminationChallengeName: {
    color: '#FF6B35',
    fontWeight: '700',
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  messageTime: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  checkInMessageTime: {
    marginTop: 2,
  },
});
