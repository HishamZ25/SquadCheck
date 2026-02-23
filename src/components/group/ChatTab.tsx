import React from 'react';
import { View, FlatList, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { GroupChatMessage } from '../../services/messageService';
import { ChatMessage } from './ChatMessage';
import { Ionicons } from '@expo/vector-icons';
import { useColorMode } from '../../theme/ColorModeContext';

interface ChatTabProps {
  messages: GroupChatMessage[];
  messageText: string;
  onMessageTextChange: (text: string) => void;
  onSendMessage: () => void;
  onUpvote: (messageId: string) => void;
  onDownvote: (messageId: string, reason: string) => void;
  onAIJudge: (messageId: string) => void;
  currentUserId?: string;
}

export const ChatTab: React.FC<ChatTabProps> = ({
  messages,
  messageText,
  onMessageTextChange,
  onSendMessage,
  onUpvote,
  onDownvote,
  onAIJudge,
  currentUserId,
}) => {
  const { colors } = useColorMode();
  return (
    <>
      <FlatList
        data={messages}
        renderItem={({ item }) => (
          <ChatMessage
            message={item}
            isOwn={item.userId === currentUserId}
            onUpvote={onUpvote}
            onDownvote={onDownvote}
            onAIJudge={onAIJudge}
            currentUserId={currentUserId}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        inverted
      />

      <View style={[styles.chatInputContainer, { backgroundColor: colors.background, borderTopWidth: 0 }]}>
        <TextInput
          style={[styles.messageInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.dividerLineTodo + '80' }]}
          placeholder="Message..."
          placeholderTextColor={colors.textSecondary}
          value={messageText}
          onChangeText={onMessageTextChange}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: colors.accent }, !messageText.trim() && [styles.sendButtonDisabled, { backgroundColor: colors.dividerLineTodo + '99' }]]}
          onPress={onSendMessage}
          disabled={!messageText.trim()}
        >
          <Ionicons name="arrow-up" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  messagesList: {
    paddingVertical: 10,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 10,
    borderTopWidth: 1,
  },
  messageInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    paddingHorizontal: 18,
    paddingVertical: 12,
    paddingTop: 12,
    borderRadius: 22,
    fontSize: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  sendButtonDisabled: {
    opacity: 0.8,
  },
});
