import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Alert,
  Share,
} from 'react-native';
import { CircleLoader } from '../../components/common/CircleLoader';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../../components/common/Avatar';
import { AuthService } from '../../services/authService';
import { GroupService } from '../../services/groupService';
import { FriendshipService } from '../../services/friendshipService';
import { User } from '../../types';
import { buildGroupInviteMessage } from '../../constants/appLinks';

type Props = StackScreenProps<{ InviteToGroup: { groupId: string; groupName?: string } }, 'InviteToGroup'>;

export const InviteToGroupScreen: React.FC<Props> = ({ navigation, route }) => {
  const { groupId, groupName } = route.params || {};
  const [group, setGroup] = useState<{ memberIds: string[] } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [friends, setFriends] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  useEffect(() => {
    if (groupId && user) load();
  }, [groupId, user]);

  const load = async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      const [groupData, friendsList] = await Promise.all([
        GroupService.getGroup(groupId),
        user ? FriendshipService.getUserFriends(user.id) : Promise.resolve([]),
      ]);
      setGroup(groupData);
      const memberIds = groupData?.memberIds || [];
      const notMembers = (friendsList || []).filter((f) => f?.id && !memberIds.includes(f.id));
      setFriends(notMembers);
    } catch (e) {
      if (__DEV__) console.error(e);
      Alert.alert('Error', 'Could not load friends or group.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const u = await AuthService.getCurrentUser();
      setUser(u || null);
    })();
  }, []);

  const handleInvite = async (friendId: string) => {
    if (!groupId || !user) return;
    try {
      setInvitingId(friendId);
      await GroupService.createInvitation(groupId, user.id, friendId);
      Alert.alert('Invited', 'Your friend will see the invitation in the app.');
      setFriends((prev) => prev.filter((f) => f.id !== friendId));
    } catch (e) {
      if (__DEV__) console.error(e);
      Alert.alert('Error', 'Could not send invitation.');
    } finally {
      setInvitingId(null);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: buildGroupInviteMessage(groupName || 'Squad', groupId),
        title: 'Invite to squad',
      });
    } catch (e) {
      // user cancelled
    }
  };

  if (!groupId) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Missing group</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invite to squad</Text>
        <View style={styles.placeholder} />
      </View>

      <TouchableOpacity style={styles.shareRow} onPress={handleShare}>
        <Ionicons name="share-social" size={22} color="#FF6B35" />
        <Text style={styles.shareText}>Share squad link</Text>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>

      <Text style={styles.sectionLabel}>Invite friends</Text>
      {loading ? (
        <CircleLoader dotColor="#FF6B35" size="large" style={styles.loader} />
      ) : friends.length === 0 ? (
        <Text style={styles.empty}>No friends to invite, or they’re already in the squad.</Text>
      ) : (
        <FlatList
          data={friends}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Avatar source={item.photoURL} initials={item.displayName?.charAt(0) || '?'} size="sm" />
              <Text style={styles.name}>{item.displayName}</Text>
              <TouchableOpacity
                style={[styles.inviteBtn, invitingId === item.id && styles.inviteBtnDisabled]}
                onPress={() => handleInvite(item.id)}
                disabled={!!invitingId}
              >
                {invitingId === item.id ? (
                  <CircleLoader dotColor="#FFF" size="small" />
                ) : (
                  <Text style={styles.inviteBtnText}>Invite</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F0ED',
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
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
  },
  placeholder: { width: 48 },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  shareText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 8,
  },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  inviteBtn: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  inviteBtnDisabled: { opacity: 0.7 },
  inviteBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  loader: { marginTop: 24 },
  empty: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginHorizontal: 24,
    marginTop: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginTop: 24,
  },
});
