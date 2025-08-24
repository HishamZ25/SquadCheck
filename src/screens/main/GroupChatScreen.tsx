import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { Theme } from '../../constants/theme';
import { GroupService } from '../../services/groupService';
import { CheckInService } from '../../services/checkInService';
import { AuthService } from '../../services/authService';
import { Group, CheckIn, User } from '../../types';
import { Ionicons } from '@expo/vector-icons';

interface GroupChatScreenProps {
  navigation: any;
  route: { params: { groupId: string } };
}

export const GroupChatScreen: React.FC<GroupChatScreenProps> = ({ navigation, route }) => {
  const { groupId } = route.params;
  const [group, setGroup] = useState<Group | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [groupId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load group data
      const groupData = await GroupService.getGroup(groupId);
      setGroup(groupData);
      
      // Load check-ins
      const groupCheckIns = await CheckInService.getGroupCheckIns(groupId);
      setCheckIns(groupCheckIns);
      
      // Load current user
      const currentUser = await AuthService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error loading group data:', error);
      Alert.alert('Error', 'Failed to load group data');
    } finally {
      setLoading(false);
    }
  };

  const handleNewCheckIn = () => {
    // TODO: Navigate to NewCheckIn screen when implemented
    Alert.alert('New Check-In', 'Check-in functionality will be implemented soon!');
  };

  const handleApproveCheckIn = async (checkIn: CheckIn) => {
    if (!user) return;
    
    try {
      await CheckInService.approveCheckIn(checkIn.id, user.id);
      await loadData(); // Refresh data
    } catch (error) {
      Alert.alert('Error', 'Failed to approve check-in');
    }
  };

  const handleRejectCheckIn = async (checkIn: CheckIn) => {
    if (!user) return;
    
    try {
      await CheckInService.rejectCheckIn(checkIn.id, user.id);
      await loadData(); // Refresh data
    } catch (error) {
      Alert.alert('Error', 'Failed to reject check-in');
    }
  };

  const renderCheckIn = ({ item }: { item: CheckIn }) => {
    const isOwnCheckIn = item.userId === user?.id;
    const canVerify = !isOwnCheckIn && user && group?.memberIds.includes(user.id);

    const getStatusStyle = (status: string) => {
      switch (status) {
        case 'pending':
          return styles.statuspending;
        case 'approved':
          return styles.statusapproved;
        case 'rejected':
          return styles.statusrejected;
        case 'ai-verified':
          return styles.statusaiverified;
        default:
          return styles.statuspending;
      }
    };

    return (
      <View style={[styles.checkInItem, isOwnCheckIn && styles.ownCheckIn]}>
        <View style={styles.checkInHeader}>
          <Avatar
            source={undefined} // TODO: Get user photo
            initials="U"
            size="sm"
          />
          <View style={styles.checkInInfo}>
            <Text style={styles.userName}>User Name</Text>
            <Text style={styles.timestamp}>
              {new Date(item.timestamp).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={[styles.statusText, getStatusStyle(item.status)]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <Image source={{ uri: item.imageURL }} style={styles.checkInImage} />
        
        {item.caption && (
          <Text style={styles.caption}>{item.caption}</Text>
        )}

        {item.aiVerdict && (
          <View style={styles.aiVerdict}>
            <Text style={styles.aiVerdictTitle}>AI Verdict</Text>
            <Text style={styles.aiVerdictText}>{item.aiVerdict.reasoning}</Text>
            <Text style={styles.aiConfidence}>
              Confidence: {item.aiVerdict.confidence}%
            </Text>
          </View>
        )}

        {canVerify && item.status === 'pending' && (
          <View style={styles.verificationButtons}>
            <Button
              title="Approve"
              onPress={() => handleApproveCheckIn(item)}
              variant="secondary"
              size="small"
              style={styles.verifyButton}
            />
            <Button
              title="Reject"
              onPress={() => handleRejectCheckIn(item)}
              variant="outline"
              size="small"
              style={styles.verifyButton}
            />
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="refresh" size={32} color={Theme.colors.gray400} />
          <Text style={styles.loadingText}>Loading group...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!group) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Theme.colors.error} />
          <Text style={styles.errorText}>Group not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.groupName}>{group.name}</Text>
          <Text style={styles.memberCount}>
            {group.memberIds.length} member{group.memberIds.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('GroupSettings', { groupId })}>
          <Ionicons name="settings-outline" size={20} color={Theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.goalCard}>
        <Text style={styles.goalTitle}>{group.goal}</Text>
        <Text style={styles.goalDescription}>Goal Description</Text>
        <Text style={styles.goalRequirements}>
          Requirements: {group.requirements.join(', ')}
        </Text>
      </View>

      <FlatList
        data={checkIns}
        renderItem={renderCheckIn}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.checkInsList}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.fab}>
        <Button
          title="+ Check In"
          onPress={handleNewCheckIn}
          size="large"
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.layout.screenPadding,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  
  headerInfo: {
    flex: 1,
    marginLeft: Theme.spacing.md,
  },
  
  groupName: {
    ...Theme.typography.h4,
    marginBottom: Theme.spacing.xs,
  },
  
  memberCount: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
  },
  
  goalCard: {
    backgroundColor: Theme.colors.card,
    margin: Theme.layout.screenPadding,
    padding: Theme.layout.cardPadding,
    borderRadius: Theme.borderRadius.lg,
    ...Theme.shadows.sm,
  },
  
  goalTitle: {
    ...Theme.typography.h4,
    marginBottom: Theme.spacing.sm,
    color: Theme.colors.primary,
  },
  
  goalDescription: {
    ...Theme.typography.bodySmall,
    marginBottom: Theme.spacing.sm,
    color: Theme.colors.textSecondary,
  },
  
  goalRequirements: {
    ...Theme.typography.caption,
    color: Theme.colors.secondary,
    fontWeight: '600',
  },
  
  checkInsList: {
    padding: Theme.layout.screenPadding,
    paddingBottom: 100, // Space for FAB
  },
  
  checkInItem: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.layout.cardPadding,
    marginBottom: Theme.spacing.md,
    ...Theme.shadows.sm,
  },
  
  ownCheckIn: {
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.primary,
  },
  
  checkInHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  
  checkInInfo: {
    flex: 1,
    marginLeft: Theme.spacing.sm,
  },
  
  userName: {
    ...Theme.typography.body,
    fontWeight: '600',
  },
  
  timestamp: {
    ...Theme.typography.caption,
    color: Theme.colors.textTertiary,
  },
  
  statusBadge: {
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: Theme.colors.gray100,
  },
  
  statusText: {
    ...Theme.typography.caption,
    fontWeight: '600',
  },
  
  statuspending: {
    color: Theme.colors.pending,
  },
  
  statusapproved: {
    color: Theme.colors.approved,
  },
  
  statusrejected: {
    color: Theme.colors.rejected,
  },
  
  statusaiverified: {
    color: Theme.colors.aiVerified,
  },
  
  checkInImage: {
    width: '100%',
    height: 200,
    borderRadius: Theme.borderRadius.md,
    marginBottom: Theme.spacing.sm,
  },
  
  caption: {
    ...Theme.typography.bodySmall,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.md,
  },
  
  aiVerdict: {
    backgroundColor: Theme.colors.gray50,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    marginBottom: Theme.spacing.md,
  },
  
  aiVerdictTitle: {
    ...Theme.typography.bodySmall,
    fontWeight: '600',
    marginBottom: Theme.spacing.xs,
  },
  
  aiVerdictText: {
    ...Theme.typography.bodySmall,
    marginBottom: Theme.spacing.xs,
  },
  
  aiConfidence: {
    ...Theme.typography.caption,
    color: Theme.colors.primary,
    fontWeight: '600',
  },
  
  verificationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  
  verifyButton: {
    flex: 1,
    marginHorizontal: Theme.spacing.xs,
  },
  
  fab: {
    position: 'absolute',
    bottom: Theme.spacing.lg,
    left: Theme.layout.screenPadding,
    right: Theme.layout.screenPadding,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  loadingText: {
    ...Theme.typography.bodySmall,
    color: Theme.colors.textSecondary,
    marginTop: Theme.spacing.md,
  },
  
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  errorText: {
    ...Theme.typography.body,
    color: Theme.colors.error,
  },
}); 