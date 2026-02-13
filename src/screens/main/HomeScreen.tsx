import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Animated,
  Dimensions,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Button } from '../../components/common/Button';
import { Avatar } from '../../components/common/Avatar';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ChallengeCarouselCard } from '../../components/challenge/ChallengeCarouselCard';
import { TiltCarousel } from '../../components/carousel';
import { NotificationsModal } from '../../components/common/NotificationsModal';
import { FriendshipService } from '../../services/friendshipService';
import { Theme } from '../../constants/theme';
import { GroupService } from '../../services/groupService';
import { ChallengeService } from '../../services/challengeService';
import { AuthService } from '../../services/authService';
import { Group, User, Challenge } from '../../types';
import { useFocusEffect } from '@react-navigation/native';
import { AlertCircle, Bell, Moon, Plus, Sun, Trophy, User as UserIcon, Users, X } from 'lucide-react-native';
import { DicebearService } from '../../services/dicebearService';
import * as ImagePicker from 'expo-image-picker';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { dateKeys } from '../../utils/dateKeys';
import { challengeEval } from '../../utils/challengeEval';
import Svg, { Path } from 'react-native-svg';
import { useColorMode } from '../../theme/ColorModeContext';


interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [user, setUser] = useState<User | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [challengeDetailsCache, setChallengeDetailsCache] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [groupMembers, setGroupMembers] = useState<Record<string, User[]>>({});
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  
  
  const hasLoadedOnce = useRef(false);
  const scrollRef = useRef<any>(null);
  const { mode, colors, toggleMode } = useColorMode();

  useEffect(() => {
    loadUserData();
    
    // Test Dicebear service
    console.log('Testing Dicebear service...');
    const testAvatar = DicebearService.testDicebear();
    console.log('Test avatar result:', testAvatar ? 'Success' : 'Failed');
  }, []);

  useEffect(() => {
    if (user) {
      loadGroups();
      loadNotificationCount();
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadGroups({ showLoading: false });
        loadNotificationCount();
      }
    }, [user])
  );

  const loadNotificationCount = async () => {
    if (!user?.id) return;
    try {
      const requests = await FriendshipService.getPendingRequests(user.id);
      setNotificationCount(requests.length);
    } catch (error) {
      console.error('Error loading notification count:', error);
    }
  };

  const loadUserData = async () => {
    try {
      console.log('Loading user data...');
      const currentUser = await AuthService.getCurrentUser();
      console.log('Loaded user data:', currentUser);
      setUser(currentUser);
    } catch (error) {
      console.error('Error loading user data:', error);
      setError('Failed to load user data');
      setLoading(false);
    }
  };

  const loadGroups = async (options?: { showLoading?: boolean }) => {
    if (!user || !user.id) {
      console.log('⚠️ Cannot load groups - user or user.id is missing:', user);
      return;
    }
    const isFirstLoad = !hasLoadedOnce.current;
    const showLoading = options?.showLoading ?? isFirstLoad;
    if (isFirstLoad) hasLoadedOnce.current = true;

    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      // Load groups and user-scoped challenges in parallel (minimal fetch to show list fast)
      const [userGroups, userChallenges] = await Promise.all([
        GroupService.getUserGroups(user.id),
        ChallengeService.getUserChallenges(user.id)
      ]);

      setGroups(userGroups);

      // Merge with challenges from every group (same source as Group screen)
      const groupChallengesArrays = await Promise.all(
        userGroups.map((g) => ChallengeService.getGroupChallenges(g.id))
      );
      const byId = new Map<string, Challenge>();
      for (const c of userChallenges) byId.set(c.id, c);
      for (const list of groupChallengesArrays) {
        for (const c of list) if (!byId.has(c.id)) byId.set(c.id, c);
      }
      const mergedChallenges = Array.from(byId.values()).sort(
        (a, b) => (b.createdAt?.getTime?.() ?? 0) - (a.createdAt?.getTime?.() ?? 0)
      );
      setChallenges(mergedChallenges);
      if (showLoading) setLoading(false);

      // Prefetch details and members in background so list appears immediately
      Promise.all([
        loadGroupMembers(userGroups),
        prefetchChallengeDetails(mergedChallenges, user.id)
      ]).catch((err) => console.error('Background prefetch error:', err));
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data');
      setLoading(false);
    }
  };

  const prefetchChallengeDetails = async (challenges: Challenge[], userId: string) => {
    try {
      // Fetch details for all challenges in parallel
      const detailsPromises = challenges.map(async (challenge) => {
        try {
          const details = await ChallengeService.getChallengeDetails(challenge.id, userId);
          return { id: challenge.id, details };
        } catch (error) {
          return null;
        }
      });
      
      const results = await Promise.all(detailsPromises);
      
      // Build cache object
      const cache: Record<string, any> = {};
      results.forEach(result => {
        if (result) {
          cache[result.id] = result.details;
        }
      });
      
      setChallengeDetailsCache(cache);
    } catch (error) {
      console.error('Error prefetching challenge details:', error);
      // Don't throw - prefetch is an optimization, not critical
    }
  };

  const loadGroupMembers = async (groups: Group[]) => {
    try {
      // Collect all unique member IDs across all groups
      const allMemberIds = new Set<string>();
      groups.forEach(group => {
        group.memberIds.forEach(id => allMemberIds.add(id));
      });
      
      // Fetch all members in parallel
      const memberPromises = Array.from(allMemberIds).map(async (memberId) => {
        try {
          const userDoc = await getDoc(doc(db, 'users', memberId));
          if (userDoc.exists()) {
            return { id: memberId, data: userDoc.data() as User };
          }
        } catch (error) {
          console.error('Error loading member:', memberId, error);
        }
        return null;
      });
      
      const memberResults = await Promise.all(memberPromises);
      
      // Build a member lookup map
      const memberLookup: Record<string, User> = {};
      memberResults.forEach(result => {
        if (result) {
          memberLookup[result.id] = result.data;
        }
      });
      
      // Build the members map for each group
      const membersMap: Record<string, User[]> = {};
      groups.forEach(group => {
        membersMap[group.id] = group.memberIds
          .map(id => memberLookup[id])
          .filter(Boolean);
      });
      
      setGroupMembers(membersMap);
    } catch (error) {
      console.error('Error loading group members:', error);
    }
  };

  const handleAvatarPress = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to change your profile picture.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const selectedImage = result.assets[0];
        console.log('Selected image:', selectedImage.uri);
        
        // TODO: Upload image to Firebase Storage and update user profile
        // For now, just show a success message
        Alert.alert(
          'Image Selected',
          'Profile picture updated successfully! (Upload to Firebase coming soon)',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const handleRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      const [userGroups, userChallenges] = await Promise.all([
        GroupService.getUserGroups(user.id),
        ChallengeService.getUserChallenges(user.id)
      ]);
      setGroups(userGroups);
      // Merge in challenges from every group (same as loadGroups)
      const groupChallengesArrays = await Promise.all(
        userGroups.map((g) => ChallengeService.getGroupChallenges(g.id))
      );
      const byId = new Map<string, Challenge>();
      for (const c of userChallenges) byId.set(c.id, c);
      for (const list of groupChallengesArrays) {
        for (const c of list) if (!byId.has(c.id)) byId.set(c.id, c);
      }
      const mergedChallenges = Array.from(byId.values()).sort(
        (a, b) => (b.createdAt?.getTime?.() ?? 0) - (a.createdAt?.getTime?.() ?? 0)
      );
      setChallenges(mergedChallenges);
      await Promise.all([
        loadGroupMembers(userGroups),
        prefetchChallengeDetails(mergedChallenges, user.id)
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleNewChallenge = () => {
    console.log('New Challenge pressed');
    setShowActionMenu(false);
    navigation.navigate('SelectGroup');
  };

  const handleNewSoloChallenge = () => {
    console.log('New Solo Challenge pressed');
    setShowActionMenu(false);
    navigation.navigate('GroupType', { isSolo: true });
  };

  const handleNewReminder = () => {
    console.log('New Reminder pressed');
    setShowActionMenu(false);
    navigation.navigate('CreateReminder');
  };

  const SEPARATOR_WIDTH = Dimensions.get('window').width - (Theme.layout.screenPadding || 24) * 2;
  const DIP_DEPTH = 12;
  const CURVE_INSET = 32;
  const STROKE = 2.5;
  const SVG_HEIGHT = DIP_DEPTH + STROKE * 2;

  const renderSectionBlock = (title: string, count: number, variant: 'todo' | 'finished') => {
    const lineColor = variant === 'todo' ? 'rgba(255,107,53,0.55)' : 'rgba(34,197,94,0.55)';
    const mid = SEPARATOR_WIDTH / 2;
    const y0 = STROKE / 2;
    const left = mid - CURVE_INSET;
    const right = mid + CURVE_INSET;
    const dipY = y0 + DIP_DEPTH;
    const controlOffset = CURVE_INSET * 0.6;
    // Smooth single flowing curve across the whole width
    const path = [
      `M 0 ${y0}`,
      `C ${left - controlOffset} ${y0}, ${left} ${y0 + DIP_DEPTH * 0.4}, ${left} ${y0 + DIP_DEPTH * 0.8}`,
      `C ${mid - CURVE_INSET * 0.3} ${dipY}, ${mid + CURVE_INSET * 0.3} ${dipY}, ${right} ${y0 + DIP_DEPTH * 0.8}`,
      `C ${right} ${y0 + DIP_DEPTH * 0.4}, ${right + controlOffset} ${y0}, ${SEPARATOR_WIDTH} ${y0}`,
    ].join(' ');
    return (
      <View style={styles.sectionBlock}>
        <Text style={[styles.sectionLabel, { color: colors.text }]}>
          {title}
        </Text>
        <View style={[styles.sectionCount, variant === 'todo' && styles.sectionCountTodo, variant === 'finished' && styles.sectionCountFinished]}>
          <Text style={styles.sectionCountText}>{count}</Text>
        </View>
        <View style={styles.curvedSeparatorWrap}>
          <Svg width={SEPARATOR_WIDTH} height={SVG_HEIGHT} viewBox={`0 0 ${SEPARATOR_WIDTH} ${SVG_HEIGHT}`} style={styles.curvedSeparatorSvg}>
            <Path d={path} stroke={lineColor} strokeWidth={STROKE} fill="none" strokeLinecap="butt" strokeLinejoin="round" />
          </Svg>
        </View>
      </View>
    );
  };

  const renderGroupItem = (item: Group) => {
    const maxAvatars = 5;
    const members = groupMembers[item.id] || [];
    const displayMembers = members.slice(0, maxAvatars);
    const extraCount = Math.max(0, item.memberIds.length - maxAvatars);

    return (
      <TouchableOpacity
        style={styles.groupCard}
        onPress={() => navigation.navigate('GroupChat', { groupId: item.id })}
      >
        {/* Top Row: Overlapping Avatars on Left, Challenge Badge on Right */}
        <View style={styles.topRow}>
          <View style={styles.overlappingAvatars}>
            {displayMembers.map((member, index) => (
              <View 
                key={member.id} 
                style={[
                  styles.avatarCircle,
                  { 
                    zIndex: maxAvatars - index,
                    marginLeft: index > 0 ? -10 : 0 
                  }
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
              <View 
                style={[
                  styles.avatarCircle,
                  styles.extraAvatarBadge,
                  { marginLeft: -10 }
                ]}
              >
                <Text style={styles.extraAvatarText}>+{extraCount}</Text>
              </View>
            )}
          </View>
          
          {/* Challenge count */}
          <View style={styles.challengeBadge}>
            <Text style={styles.challengeCount}>0</Text>
          </View>
        </View>

        {/* Middle: Group Info */}
        <View style={styles.groupContent}>
          <Text style={styles.groupName}>{item.name}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const isChallengeCompleted = (challenge: Challenge): boolean => {
    // Check if challenge is completed today/this week
    if (!challengeDetailsCache[challenge.id]) return false;
    const details = challengeDetailsCache[challenge.id];
    return details.checkInsForCurrentPeriod?.some((ci: any) => ci.userId === user?.id && ci.status === 'completed') || false;
  };

  const isUserEliminated = (challenge: Challenge): boolean => {
    if (!user?.id || (challenge as any).type !== 'elimination') return false;
    const details = challengeDetailsCache[challenge.id];
    const members: any[] = details?.challengeMembers ?? [];
    const me = members.find((m: any) => m.userId === user.id);
    return me?.state === 'eliminated';
  };
  
  const handleCheckInPress = async (challenge: Challenge, e: any) => {
    e.stopPropagation(); // Prevent card navigation
    
    // Load challenge details if not cached
    if (!challengeDetailsCache[challenge.id]) {
      try {
        const details = await ChallengeService.getChallengeDetails(challenge.id, auth.currentUser?.uid || '');
        setChallengeDetailsCache(prev => ({ ...prev, [challenge.id]: details }));
      } catch (error) {
        console.error('Error loading challenge:', error);
        Alert.alert('Error', 'Failed to load challenge details');
        return;
      }
    }
    
    // Check if already submitted for the period we would submit to (same logic as backend)
    const details = challengeDetailsCache[challenge.id];
    const challengeForDue = details?.challenge || challenge;
    const dueTimeLocal = challengeForDue.due?.dueTimeLocal || '23:59';
    const timezoneOffset = challengeForDue.due?.timezoneOffset ?? new Date().getTimezoneOffset();
    const submissionPeriodKey = dateKeys.getSubmissionPeriodDayKey(dueTimeLocal, timezoneOffset);
    const alreadySubmittedForThisPeriod =
      details?.allRecentCheckIns?.some(
        (ci: any) => ci.userId === user?.id && ci.period?.dayKey === submissionPeriodKey
      );
    if (alreadySubmittedForThisPeriod) {
      Alert.alert('Already Submitted', 'You have already checked in for this period!');
      return;
    }

    navigation.navigate('CheckIn', {
      challengeId: challenge.id,
      details: challengeDetailsCache[challenge.id] ?? undefined,
    });
  };

  const getChallengeStatus = (challenge: Challenge): string => {
    if (isUserEliminated(challenge)) return 'Eliminated';
    // Safety check for old schema challenges
    if (!challenge.cadence || !challenge.due) {
      return 'In progress';
    }
    const now = new Date();
    if (challenge.type === 'deadline' && challenge.due.deadlineDate) {
      const deadline = new Date(challenge.due.deadlineDate);
      const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysLeft > 0) {
        return `Due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`;
      } else if (daysLeft === 0) {
        return 'Due today';
      }
      return 'Deadline passed';
    }
    
    if (challenge.cadence.unit === 'daily') {
      // Show completed if it's marked as completed
      if (isChallengeCompleted(challenge)) {
        const details = challengeDetailsCache[challenge.id];
        if (details?.checkInsForCurrentPeriod) {
          const myCheckIn = details.checkInsForCurrentPeriod.find((ci: any) => ci.userId === user?.id);
          if (myCheckIn?.createdAt) {
            const raw = myCheckIn.createdAt;
            const timestamp = raw instanceof Date ? raw.getTime()
              : typeof raw === 'number' ? raw
              : (raw as any)?.toMillis?.() ?? Date.now();
            return 'Completed ' + challengeEval.formatTimestamp(timestamp);
          }
        }
        return 'Completed today';
      }
      
      // Show time remaining until due
      const dueTimeLocal = challenge.due?.dueTimeLocal || '23:59';
      const timeRemaining = dateKeys.getTimeRemaining(dueTimeLocal);
      return `Due in ${timeRemaining}`;
    }
    
    if (challenge.cadence.unit === 'weekly' && challenge.cadence.requiredCount) {
      if (isChallengeCompleted(challenge)) {
        return `${challenge.cadence.requiredCount}/${challenge.cadence.requiredCount} done this week`;
      }
      return `${Math.min(2, challenge.cadence.requiredCount)}/${challenge.cadence.requiredCount} done this week`;
    }
    
    return 'In progress';
  };

  const renderEmptyState = (message: string) => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>{message}</Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorState}>
      <AlertCircle size={64} color={Theme.colors.error} />
      <Text style={styles.errorStateTitle}>Something went wrong</Text>
      <Text style={styles.errorStateSubtitle}>{error}</Text>
      <Button
        title="Try Again"
        onPress={loadGroups}
        variant="outline"
        style={styles.errorStateButton}
      />
    </View>
  );

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [160, 108],
    extrapolate: 'clamp',
  });
  const headerScale = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.59],
    extrapolate: 'clamp',
  });
  const subtitleMarginBottom = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [4, 32],
    extrapolate: 'clamp',
  });

  const handleMainScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    if (y > 0 && scrollRef.current) {
      // Prevent scrolling down into the content; keep it pinned while
      // still allowing pull-down to refresh (negative offsets).
      scrollRef.current.scrollTo({ y: 0, animated: false });
      scrollY.setValue(0);
    } else {
      scrollY.setValue(y);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Bell Icon - Top Right */}
      <TouchableOpacity
        style={[
          styles.themeToggle,
          {
            backgroundColor: colors.surface,
            shadowColor: colors.accent,
            borderWidth: 2,
            borderColor: colors.accent,
          },
        ]}
        onPress={toggleMode}
        activeOpacity={0.7}
      >
        {mode === 'light' ? (
          <Moon size={20} color={colors.accent} />
        ) : (
          <Sun size={20} color={colors.accent} />
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.bellIcon,
          {
            backgroundColor: colors.surface,
            shadowColor: colors.accent,
            borderWidth: 2,
            borderColor: colors.accent,
          },
        ]}
        onPress={() => setShowNotifications(true)}
        activeOpacity={0.7}
      >
        <Bell size={26} color="#FF6B35" />
        {notificationCount > 0 && (
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationBadgeText}>
              {notificationCount > 9 ? '9+' : notificationCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* User Profile Section - Shrinks on scroll */}
      <Animated.View style={[styles.userSectionWrapper, { height: headerHeight }]}>
        <Animated.View style={[styles.userSection, { transform: [{ scale: headerScale }] }]}>
          <Avatar
            source={user?.photoURL}
            initials={user?.displayName?.charAt(0)}
            size="xl"
            onPress={() => {
              console.log('Avatar pressed in HomeScreen!');
              handleAvatarPress();
            }}
          />
          <TouchableOpacity onPress={() => navigation.navigate('Settings', { user })}>
            <Text style={[styles.userName, { color: colors.text }]}>{user?.displayName || 'Loading...'}</Text>
          </TouchableOpacity>
          <Animated.View style={{ marginBottom: subtitleMarginBottom }}>
            <TouchableOpacity onPress={() => navigation.navigate('Settings', { user })}>
              <Text style={[styles.userTitle, { color: colors.textSecondary }]}>
                {user?.title || 'Accountability Seeker'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Animated.View>

      {/* Content Sections */}
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        renderErrorState()
      ) : (
        <Animated.ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          onScroll={handleMainScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#FF6B35"
              colors={['#FF6B35']}
            />
          }
        >
          {/* To Do Section - always open, curved separator with dip + arrow */}
          {(() => {
            const incompleteChallenges = challenges.filter(c => !isChallengeCompleted(c));
            const toDoCount = incompleteChallenges.length;
            return (
              <View style={styles.section}>
                {renderSectionBlock('TO DO', toDoCount, 'todo')}
                {incompleteChallenges.length > 0 ? (
                  <TiltCarousel
                      data={incompleteChallenges}
                      keyExtractor={(c) => c.id}
                      contentPadding={Theme.layout.screenPadding}
                      renderItem={({ item: challenge }) => {
                        const groupName = challenge.groupId
                          ? groups.find(g => g.id === challenge.groupId)?.name
                          : undefined;
                        return (
                          <ChallengeCarouselCard
                            challenge={challenge}
                            groupName={groupName}
                            groupMembers={challenge.groupId ? (groupMembers[challenge.groupId] || []).map(u => ({ id: u.id, photoURL: u.photoURL, displayName: u.displayName })) : undefined}
                            isCompleted={false}
                            status={getChallengeStatus(challenge)}
                            isEliminated={isUserEliminated(challenge)}
                            onPress={() => {
                              const cached = challengeDetailsCache[challenge.id];
                              if (cached) {
                                navigation.navigate('ChallengeDetail', cached);
                              } else {
                                navigation.navigate('ChallengeDetail', {
                                  challengeId: challenge.id,
                                  currentUserId: auth.currentUser?.uid || '',
                                });
                              }
                            }}
                            onCheckInPress={(e) => handleCheckInPress(challenge, e)}
                          />
                        );
                      }}
                    />
                ) : (
                  renderEmptyState('Nothing to do - great job!')
                )}
              </View>
            );
          })()}

          {/* Finished Section - always open, curved separator with dip + arrow */}
          {(() => {
            const completedChallenges = challenges.filter(c => isChallengeCompleted(c));
            const finishedCount = completedChallenges.length;
            return (
              <View style={[styles.section, styles.sectionFinished]}>
                {renderSectionBlock('FINISHED', finishedCount, 'finished')}
                {completedChallenges.length > 0 ? (
                  <TiltCarousel
                      data={completedChallenges}
                      keyExtractor={(c) => c.id}
                      contentPadding={Theme.layout.screenPadding}
                      renderItem={({ item: challenge }) => {
                        const groupName = challenge.groupId
                          ? groups.find(g => g.id === challenge.groupId)?.name
                          : undefined;
                        return (
                          <ChallengeCarouselCard
                            challenge={challenge}
                            groupName={groupName}
                            groupMembers={challenge.groupId ? (groupMembers[challenge.groupId] || []).map(u => ({ id: u.id, photoURL: u.photoURL, displayName: u.displayName })) : undefined}
                            isCompleted={true}
                            status={getChallengeStatus(challenge)}
                            isEliminated={isUserEliminated(challenge)}
                            onPress={() => {
                              const cached = challengeDetailsCache[challenge.id];
                              if (cached) {
                                navigation.navigate('ChallengeDetail', cached);
                              } else {
                                navigation.navigate('ChallengeDetail', {
                                  challengeId: challenge.id,
                                  currentUserId: auth.currentUser?.uid || '',
                                });
                              }
                            }}
                            onCheckInPress={(e) => handleCheckInPress(challenge, e)}
                          />
                        );
                      }}
                    />
                ) : (
                  renderEmptyState('No completed items yet')
                )}
              </View>
            );
          })()}
          
          {/* Empty spacer trimmed so content doesn't scroll unnecessarily */}
        </Animated.ScrollView>
      )}

      {/* Floating Action Button with Circular Speed Dial */}
      {showActionMenu && (
        <TouchableOpacity
          style={styles.fabOverlay}
          activeOpacity={1}
          onPress={() => setShowActionMenu(false)}
        />
      )}
      <View style={styles.fabContainer}>
        {/* Action Buttons - Circular pattern around FAB */}
        {showActionMenu && (
          <>
            {/* Group Challenge Button - 12 o'clock (above FAB) */}
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.actionButtonTopRight,
                { backgroundColor: colors.surface, borderColor: colors.accent },
              ]}
              onPress={handleNewChallenge}
              activeOpacity={0.8}
            >
              <Trophy size={24} color="#FF6B35" />
            </TouchableOpacity>

            {/* Solo Challenge Button - 4 o'clock (bottom right) */}
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.actionButtonBottomRight,
                { backgroundColor: colors.surface, borderColor: colors.accent },
              ]}
              onPress={handleNewSoloChallenge}
              activeOpacity={0.8}
            >
              <UserIcon size={24} color="#FF6B35" />
            </TouchableOpacity>

            {/* Reminder Button - 8 o'clock (bottom left) */}
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.actionButtonBottomLeft,
                { backgroundColor: colors.surface, borderColor: colors.accent },
              ]}
              onPress={handleNewReminder}
              activeOpacity={0.8}
            >
              <AlertCircle size={24} color="#FF6B35" />
            </TouchableOpacity>
          </>
        )}

        {/* Main FAB Button */}
        <TouchableOpacity
          style={[
            styles.fab,
            showActionMenu && styles.fabActive,
            { backgroundColor: colors.surface, borderColor: colors.accent },
          ]}
          onPress={() => setShowActionMenu(!showActionMenu)}
          activeOpacity={0.8}
        >
          {showActionMenu ? (
            <X size={24} color="#FF6B35" />
          ) : (
            <Plus size={24} color="#FF6B35" />
          )}
        </TouchableOpacity>
      </View>
      
      {/* Notifications Modal */}
      {user && (
        <NotificationsModal
          visible={showNotifications}
          onClose={() => {
            setShowNotifications(false);
            loadNotificationCount(); // Refresh count when modal closes
          }}
          currentUserId={user.id}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3F0',
    position: 'relative',
  },
  themeToggle: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 1000,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  
  userSectionWrapper: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 108,
  },
  userSection: {
    alignItems: 'center',
    paddingHorizontal: Theme.layout.screenPadding,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.xs,
  },
  userName: {
    ...Theme.typography.h2,
    marginTop: Theme.spacing.xs,
    marginBottom: 2,
    textAlign: 'center',
    color: '#000000',
  },
  
  userTitle: {
    ...Theme.typography.body,
    marginBottom: 0,
    textAlign: 'center',
    color: '#666666',
  },
  
  scrollContent: {
    paddingHorizontal: Theme.layout.screenPadding,
    paddingTop: Theme.spacing.sm,
    paddingBottom: 20,
  },
  section: {
    marginBottom: Theme.spacing.lg,
  },
  sectionFinished: {
    marginTop: -16,
  },
  
  sectionBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  sectionLabelTodo: {
    color: '#1A1A1A',
  },
  sectionLabelFinished: {
    color: '#1A1A1A',
  },
  sectionCount: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    minWidth: 28,
    alignItems: 'center',
    marginBottom: 2,
  },
  sectionCountTodo: {
    backgroundColor: '#FF6B35',
  },
  sectionCountFinished: {
    backgroundColor: '#22C55E',
  },
  sectionCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  curvedSeparatorWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  curvedSeparatorSvg: {
    overflow: 'visible',
  },
  
  cardsContainer: {
    gap: 10,
  },
  
  userStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: Theme.spacing.xl,
    marginTop: Theme.spacing.sm,
  },
  
  badgesContainer: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    flex: 1,
    justifyContent: 'flex-start',
  },
  
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.xs,
    flex: 1,
  },
  
  streakText: {
    ...Theme.typography.h4,
    color: Theme.colors.streak,
    fontWeight: '600',
  },
  
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    flex: 1,
    justifyContent: 'flex-end',
  },
  
  pointsText: {
    ...Theme.typography.h4,
    color: Theme.colors.points,
    fontWeight: '600',
  },
  
  groupCard: {
    backgroundColor: '#FFFBF7',
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: '#FF6B35',
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
    borderColor: '#FFFFFF',
    borderRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  
  extraAvatarBadge: {
    width: 36,
    height: 36,
    backgroundColor: '#FF6B35',
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
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FFE8B3',
  },
  
  challengeCount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#333',
  },
  
  groupContent: {
    marginTop: 2,
  },
  
  groupName: {
    fontSize: 17,
    color: '#000000',
    fontWeight: '700',
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  
  groupDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  
  arrowIcon: {
    marginLeft: 8,
  },
  
  // Challenge Card Styles (used by legacy list; carousel uses ChallengeCarouselCard)
  challengeCard: {
    backgroundColor: '#FFFBF7',
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
  },
  
  challengeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  
  challengeTitle: {
    fontSize: 17,
    color: '#000000',
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  challengeDate: {
    fontSize: 13,
    color: '#FF6B35',
    fontWeight: '600',
  },
  
  challengeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  challengeDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 10,
  },
  
  challengeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  
  challengeStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  
  challengeStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  
  challengeStatusText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
  },
  
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  
  checkInButtonCompleted: {
    backgroundColor: '#4CAF50',
    opacity: 0.7,
  },
  
  checkInButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  
  
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.lg,
    minHeight: 80,
  },
  
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: Theme.spacing.md,
    textAlign: 'center',
    color: '#333',
  },
  
  emptyStateSubtitle: {
    fontSize: 14,
    marginTop: Theme.spacing.xs,
    textAlign: 'center',
    color: '#999',
  },
  
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  

  
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.xl,
  },
  
  errorStateTitle: {
    ...Theme.typography.h3,
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
    color: Theme.colors.error,
  },
  
  errorStateSubtitle: {
    ...Theme.typography.bodySmall,
    textAlign: 'center',
    color: '#666666',
    marginBottom: Theme.spacing.xl,
  },
  
  errorStateButton: {
    marginTop: Theme.spacing.md,
  },
  
  fabOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 999,
  },
  
  fabContainer: {
    position: 'absolute',
    bottom: Theme.layout.fabBottomOffsetHome,
    right: Theme.layout.screenPadding,
    width: 56,
    height: 56,
    zIndex: 1000,
  },
  
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF6B35',
    ...Theme.shadows.lg,
    zIndex: 1000,
  },
  
  fabActive: {
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
  },
  

  
  actionButton: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FF6B35',
    ...Theme.shadows.lg,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  
  actionButtonTopRight: {
    bottom: 100,
    right: 1,
    transform: [{ translateX: 0 }],
  },
  
  actionButtonBottomLeft: {
    bottom: 70,
    left: 45,
    transform: [{ translateX: -100 }],
  },
  
  actionButtonBottomRight: {
    bottom: 0,
    right: 100,
    transform: [{ translateX: 0 }],
  },
  
  bellIcon: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1000,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 4,
  },

}); 