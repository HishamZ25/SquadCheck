import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Group, User } from '../../types';
import { Avatar } from '../common/Avatar';
import { Theme } from '../../constants/theme';
import { useColorMode } from '../../theme/ColorModeContext';

interface GroupCardProps {
  group: Group;
  members?: User[];
  challengeCount?: number;
  onPress: () => void;
}

export const GroupCard: React.FC<GroupCardProps> = ({
  group,
  members = [],
  challengeCount = 0,
  onPress,
}) => {
  const { colors } = useColorMode();
  const maxAvatars = 5;
  const displayMembers = members.slice(0, maxAvatars);
  const extraCount = Math.max(0, (group.memberIds?.length || 0) - maxAvatars);

  return (
    <TouchableOpacity style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.accent }]} onPress={onPress}>
      <View style={styles.topRow}>
        <View style={styles.overlappingAvatars}>
          {displayMembers.map((member, index) => (
            <View
              key={member.id}
              style={[
                styles.avatarCircle,
                { borderColor: colors.card, zIndex: maxAvatars - index, marginLeft: index > 0 ? -10 : 0 },
              ]}
            >
              <Avatar
                source={member.photoURL}
                initials={member.displayName?.charAt(0)?.toUpperCase() || '?'}
                size="sm"
              />
            </View>
          ))}
          {extraCount > 0 && (
            <View style={[styles.avatarCircle, styles.extraAvatarBadge, { marginLeft: -10, backgroundColor: colors.accent }]}>
              <Text style={styles.extraAvatarText}>+{extraCount}</Text>
            </View>
          )}
        </View>
        <View style={[styles.challengeBadge, { backgroundColor: colors.card, borderColor: colors.dividerLineTodo }]}>
          <Text style={[styles.challengeCount, { color: colors.accent }]}>{challengeCount}</Text>
        </View>
      </View>
      <View style={styles.groupContent}>
        <Text style={[styles.groupName, { color: colors.text }]}>{group.name}</Text>
        {group.description ? (
          <Text style={[styles.groupDescription, { color: colors.textSecondary }]} numberOfLines={2}>
            {group.description}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  groupCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    ...Theme.shadows.sm,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    borderWidth: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  overlappingAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    borderWidth: 2.5,
    borderRadius: 18,
    shadowOpacity: 0.12,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  extraAvatarBadge: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraAvatarText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  challengeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
  },
  challengeCount: {
    fontSize: 14,
    fontWeight: '800',
  },
  groupContent: {
    marginTop: 2,
  },
  groupName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  groupDescription: {
    fontSize: 14,
    marginTop: 2,
  },
});

