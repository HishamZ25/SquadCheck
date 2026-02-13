import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Group } from '../../types';
import { useColorMode } from '../../theme/ColorModeContext';

interface GroupHeaderProps {
  group: Group;
  onBack: () => void;
  activeTab?: 'chat' | 'leaderboard' | 'settings';
  onTabChange?: (tab: 'chat' | 'leaderboard' | 'settings') => void;
}

export const GroupHeader: React.FC<GroupHeaderProps> = ({
  group,
  onBack,
  activeTab,
  onTabChange,
}) => {
  const { colors } = useColorMode();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text 
            style={[styles.title, { color: colors.text }]} 
            numberOfLines={1} 
            adjustsFontSizeToFit 
            minimumFontScale={0.7}
          >
            {group.name}
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {activeTab && onTabChange && (
        <View style={[styles.tabContainer, { backgroundColor: colors.dividerLineTodo + '30' }]}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'leaderboard' && [styles.tabActive, { backgroundColor: colors.accent }]]}
            onPress={() => onTabChange('leaderboard')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'leaderboard' && { color: '#FFF' }]}>
              Leaderboard
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'chat' && [styles.tabActive, { backgroundColor: colors.accent }]]}
            onPress={() => onTabChange('chat')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'chat' && { color: '#FFF' }]}>
              Chat
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'settings' && [styles.tabActive, { backgroundColor: colors.accent }]]}
            onPress={() => onTabChange('settings')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'settings' && { color: '#FFF' }]}>
              Settings
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
    paddingBottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: 8,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  placeholder: {
    width: 48,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabActive: {},
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {},
});
