import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  PanResponder,
} from 'react-native';
import { GroupsScreen } from './GroupsScreen';
import { FriendsScreen } from './FriendsScreen';
import { useColorMode } from '../../theme/ColorModeContext';

const SWIPE_THRESHOLD = 50;

interface SocialScreenProps {
  navigation: any;
}

export const SocialScreen: React.FC<SocialScreenProps> = ({ navigation }) => {
  const { colors } = useColorMode();
  const [activeTab, setActiveTab] = useState<'groups' | 'friends'>('groups');

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          const { dx, dy } = gestureState;
          return Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10;
        },
        onPanResponderRelease: (_, gestureState) => {
          const { dx } = gestureState;
          if (dx > SWIPE_THRESHOLD && activeTab === 'friends') {
            setActiveTab('groups');
          } else if (dx < -SWIPE_THRESHOLD && activeTab === 'groups') {
            setActiveTab('friends');
          }
        },
      }),
    [activeTab]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Social</Text>
      </View>

      <View style={[styles.tabContainer, { backgroundColor: colors.dividerLineTodo + '30' }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'groups' && [styles.tabActive, { backgroundColor: colors.accent }]]}
          onPress={() => setActiveTab('groups')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'groups' && { color: '#FFF' }]}>
            Groups
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && [styles.tabActive, { backgroundColor: colors.accent }]]}
          onPress={() => setActiveTab('friends')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'friends' && { color: '#FFF' }]}>
            Friends
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content - Swipeable, keep both mounted to avoid refetching */}
      <View style={styles.content} {...panResponder.panHandlers}>
        <View style={[styles.tabContent, activeTab !== 'groups' && styles.hidden]}>
          <GroupsScreen navigation={navigation} />
        </View>
        <View style={[styles.tabContent, activeTab !== 'friends' && styles.hidden]}>
          <FriendsScreen navigation={navigation} />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {},
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  tabTextActive: {},
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  hidden: {
    display: 'none',
  },
});
