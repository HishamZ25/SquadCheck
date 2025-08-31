import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from './Avatar';
import { Theme } from '../../constants/theme';

interface CheckInPostProps {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  caption: string;
  imageUri?: string;
  timestamp: Date;
  upvotes: number;
  downvotes: number;
  onUpvote: (postId: string) => void;
  onDownvote: (postId: string, reason: string) => void;
}

const { width } = Dimensions.get('window');

export const CheckInPost: React.FC<CheckInPostProps> = ({
  id,
  userId,
  userName,
  userAvatar,
  caption,
  imageUri,
  timestamp,
  upvotes,
  downvotes,
  onUpvote,
  onDownvote,
}) => {
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');

  const handleDownvote = () => {
    Alert.prompt(
      'Dispute Check-In',
      'Please provide a reason for disputing this check-in:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: (reason) => {
            if (reason && reason.trim()) {
              onDownvote(id, reason.trim());
            } else {
              Alert.alert('Error', 'Please provide a reason for disputing');
            }
          },
        },
      ],
      'plain-text',
      '',
      'Enter your reason here...'
    );
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Avatar
          source={userAvatar}
          initials={userName.charAt(0)}
          size="sm"
          style={styles.avatar}
        />
        <View style={styles.headerInfo}>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.timestamp}>{formatTimestamp(timestamp)}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {imageUri && (
          <Image source={{ uri: imageUri }} style={styles.image} />
        )}
        <Text style={styles.caption}>{caption}</Text>
      </View>

      {/* Voting Section */}
      <View style={styles.votingSection}>
        <TouchableOpacity 
          style={styles.voteButton}
          onPress={() => onUpvote(id)}
        >
          <Ionicons 
            name="thumbs-up" 
            size={20} 
            color={upvotes > 0 ? '#4CAF50' : Theme.colors.textSecondary} 
          />
          <Text style={[styles.voteCount, upvotes > 0 && styles.voteCountActive]}>
            {upvotes}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.voteButton}
          onPress={handleDownvote}
        >
          <Ionicons 
            name="thumbs-down" 
            size={20} 
            color={downvotes > 0 ? '#F44336' : Theme.colors.textSecondary} 
          />
          <Text style={[styles.voteCount, downvotes > 0 && styles.voteCountActive]}>
            {downvotes}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#374151',
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    ...Theme.shadows.sm,
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  
  avatar: {
    marginRight: Theme.spacing.sm,
  },
  
  headerInfo: {
    flex: 1,
  },
  
  userName: {
    ...Theme.typography.body,
    color: Theme.colors.white,
    fontWeight: '600',
    marginBottom: Theme.spacing.xs,
  },
  
  timestamp: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
  },
  
  content: {
    marginBottom: Theme.spacing.md,
  },
  
  image: {
    width: '100%',
    height: 200,
    borderRadius: Theme.borderRadius.md,
    marginBottom: Theme.spacing.sm,
  },
  
  caption: {
    ...Theme.typography.body,
    color: Theme.colors.white,
    lineHeight: 20,
  },
  
  votingSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#4B5563',
  },
  
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: 'transparent',
  },
  
  voteCount: {
    ...Theme.typography.body,
    color: Theme.colors.textSecondary,
    marginLeft: Theme.spacing.xs,
    fontWeight: '600',
  },
  
  voteCountActive: {
    color: Theme.colors.white,
  },
}); 