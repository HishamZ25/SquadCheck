import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Dimensions,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
import { Group, User, Challenge, Reminder } from '../../types';
import { useFocusEffect } from '@react-navigation/native';
import { AlertCircle, Bell as BellIcon, Check, Clock, Moon, Plus, Sparkles, Sun, Trophy, User as UserIcon, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  generateCustomAvatarUrl,
  DICEBEAR_STYLES,
  DICEBEAR_BACKGROUNDS,
  type DicebearStyle,
} from '../../services/dicebearService';
import { CenteredModal } from '../../components/common/CenteredModal';
import * as Haptics from 'expo-haptics';
import { auth } from '../../services/firebase';
import { useCurrentUser } from '../../contexts/UserContext';
import { AuthService } from '../../services/authService';
import { userCache } from '../../services/userCache';
import { dateKeys } from '../../utils/dateKeys';
import { challengeEval } from '../../utils/challengeEval';
import {
  resolveAdminTimeZone,
  getAdminZoneDayKey,
  getCurrentPeriodDayKey,
  getCurrentPeriodWeekKey,
  computeDueMomentUtcForDay,
  computeDeadlineMomentUtc,
} from '../../utils/dueTime';
import Svg, { Path } from 'react-native-svg';
import { ReminderService } from '../../services/reminderService';
import { GamificationService } from '../../services/gamificationService';
import { useColorMode } from '../../theme/ColorModeContext';

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user, refreshUser } = useCurrentUser();
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
  const [todayReminders, setTodayReminders] = useState<Reminder[]>([]);
  const [dismissedReminderIds, setDismissedReminderIds] = useState<Set<string>>(new Set());
  const dismissedStorageKey = `dismissed_reminders_${new Date().toISOString().slice(0, 10)}`;
  const [showCongratsModal, setShowCongratsModal] = useState(false);
  const congratsScale = useRef(new Animated.Value(0)).current;
  const congratsOpacity = useRef(new Animated.Value(0)).current;
  const sparkleRotation = useRef(new Animated.Value(0)).current;

  // Avatar customization modal state
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [avatarStyle, setAvatarStyle] = useState<DicebearStyle>('avataaars');
  const [avatarBgIndex, setAvatarBgIndex] = useState(0);
  const [seedOverride, setSeedOverride] = useState<string | null>(null);
  const [useSavedAsPreview, setUseSavedAsPreview] = useState(true);
  const [savingAvatar, setSavingAvatar] = useState(false);

  // Alert modal state for eliminated / deadline-ended challenges
  const [alertChallenge, setAlertChallenge] = useState<{ challenge: Challenge; type: 'eliminated' | 'deadline_ended' } | null>(null);

  const hasLoadedOnce = useRef(false);
  const lastLoadedAt = useRef(0);
  const scrollRef = useRef<any>(null);
  const { mode, colors, toggleMode } = useColorMode();

  // Load persisted dismissed reminder IDs on mount
  useEffect(() => {
    AsyncStorage.getItem(dismissedStorageKey).then(json => {
      if (json) {
        try { setDismissedReminderIds(new Set(JSON.parse(json))); } catch {}
      }
    });
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
        // Staleness guard: skip refetch if loaded less than 2s ago
        if (Date.now() - lastLoadedAt.current < 2000) return;
        loadGroups({ showLoading: false });
        loadNotificationCount();
        // Refresh user doc so XP/level updates are reflected immediately
        refreshUser();
      }
    }, [user])
  );

  const loadNotificationCount = async () => {
    if (!user?.id) return;
    try {
      const requests = await FriendshipService.getPendingRequests(user.id);
      setNotificationCount(requests.length);
    } catch (error) {
      if (__DEV__) console.error('Error loading notification count:', error);
    }
  };

  // getUserChallenges already returns all challenges via challengeMembers — no extra group fetch needed
  const deduplicateChallenges = (userChallenges: Challenge[]): Challenge[] => {
    const byId = new Map<string, Challenge>();
    for (const c of userChallenges) byId.set(c.id, c);
    return Array.from(byId.values()).sort(
      (a, b) => (b.createdAt?.getTime?.() ?? 0) - (a.createdAt?.getTime?.() ?? 0)
    );
  };

  const loadGroups = async (options?: { showLoading?: boolean }) => {
    if (!user || !user.id) {
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

      // Load groups, challenges, and reminders in parallel
      const [userGroups, userChallenges, userReminders] = await Promise.all([
        GroupService.getUserGroups(user.id),
        ChallengeService.getUserChallenges(user.id),
        ReminderService.getUserReminders(user.id),
      ]);

      // Filter reminders relevant to today
      const today = new Date();
      const todayDayOfWeek = today.getDay(); // 0=Sun
      const todayDateOfMonth = today.getDate(); // 1-31
      const filtered = userReminders.filter(r => {
        if (!r.isActive) return false;
        if (r.frequency === 'daily') return true;
        if (r.frequency === 'weekly') {
          const entries = r.schedule as { day: number; hour: number }[];
          return entries.some(e => e.day === todayDayOfWeek);
        }
        if (r.frequency === 'monthly') {
          const entries = r.schedule as { day: number; hour: number }[];
          return entries.some(e => e.day === todayDateOfMonth);
        }
        return false;
      });
      setTodayReminders(filtered);

      setGroups(userGroups);

      const mergedChallenges = deduplicateChallenges(userChallenges);
      setChallenges(mergedChallenges);
      lastLoadedAt.current = Date.now();

      // On first load, wait for details so cards don't flash from "to do" → "finished".
      // On subsequent loads (background refetch), fire in background.
      if (showLoading) {
        await Promise.all([
          loadGroupMembers(userGroups),
          prefetchChallengeDetails(mergedChallenges, user.id)
        ]).catch((err) => { if (__DEV__) console.error('Prefetch error:', err); });
        setLoading(false);
      } else {
        Promise.all([
          loadGroupMembers(userGroups),
          prefetchChallengeDetails(mergedChallenges, user.id)
        ]).catch((err) => { if (__DEV__) console.error('Background prefetch error:', err); });
      }
    } catch (error) {
      if (__DEV__) console.error('Error loading data:', error);
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

      // Check for eliminated or deadline-ended challenges to show alert
      checkForAlerts(challenges, cache, userId);
    } catch (error) {
      if (__DEV__) console.error('Error prefetching challenge details:', error);
      // Don't throw - prefetch is an optimization, not critical
    }
  };

  const checkForAlerts = async (challengeList: Challenge[], cache: Record<string, any>, userId: string) => {
    for (const challenge of challengeList) {
      const details = cache[challenge.id];
      if (!details) continue;

      // Skip ended challenges (already handled)
      if ((challenge as any).state === 'ended') continue;

      // Check eliminated
      if ((challenge as any).type === 'elimination') {
        const me = details.challengeMembers?.find((m: any) => m.userId === userId);
        if (me?.state === 'eliminated') {
          const storageKey = `alert_shown_${challenge.id}_eliminated`;
          const shown = await AsyncStorage.getItem(storageKey);
          if (!shown) {
            await AsyncStorage.setItem(storageKey, '1');
            setAlertChallenge({ challenge, type: 'eliminated' });
            return; // Show one alert at a time
          }
        }
      }

      // Check deadline ended
      if ((challenge as any).type === 'deadline' && challenge.due?.deadlineDate) {
        const adminTz = resolveAdminTimeZone(challenge);
        const dueTimeLocal = challenge.due?.dueTimeLocal || '23:59';
        const deadlineMoment = computeDeadlineMomentUtc(adminTz, challenge.due.deadlineDate, dueTimeLocal);
        if (Date.now() >= deadlineMoment.getTime()) {
          const storageKey = `alert_shown_${challenge.id}_deadline_ended`;
          const shown = await AsyncStorage.getItem(storageKey);
          if (!shown) {
            await AsyncStorage.setItem(storageKey, '1');
            setAlertChallenge({ challenge, type: 'deadline_ended' });
            return;
          }
        }
      }
    }
  };

  const loadGroupMembers = async (groups: Group[]) => {
    try {
      const allMemberIds = new Set<string>();
      groups.forEach(group => {
        group.memberIds.forEach(id => allMemberIds.add(id));
      });

      const memberLookup = await userCache.getUsers(Array.from(allMemberIds));

      const membersMap: Record<string, User[]> = {};
      groups.forEach(group => {
        membersMap[group.id] = group.memberIds
          .map(id => memberLookup.get(id)!)
          .filter(Boolean);
      });

      setGroupMembers(membersMap);
    } catch (error) {
      if (__DEV__) console.error('Error loading group members:', error);
    }
  };

  // Avatar customization helpers
  const customAvatarUrl = useMemo(() => {
    const seed = seedOverride ?? user?.displayName ?? user?.email ?? 'user';
    const bg = DICEBEAR_BACKGROUNDS[avatarBgIndex];
    return generateCustomAvatarUrl(seed, 400, avatarStyle, bg);
  }, [seedOverride, user?.displayName, user?.email, avatarStyle, avatarBgIndex]);

  const displayPreviewUrl = (useSavedAsPreview && user?.photoURL) ? user.photoURL : customAvatarUrl;

  const handleAvatarPress = () => {
    setAvatarModalVisible(true);
  };

  const handleCloseAvatarModal = () => {
    setSeedOverride(null);
    setUseSavedAsPreview(true);
    setAvatarModalVisible(false);
  };

  const handleRandomizeAvatar = () => {
    setUseSavedAsPreview(false);
    setSeedOverride('r-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10));
  };

  const handleUseMyName = () => {
    setSeedOverride(null);
    setUseSavedAsPreview(false);
  };

  const handleSaveCustomAvatar = async () => {
    if (!user?.id) return;
    if (useSavedAsPreview && user?.photoURL) {
      handleCloseAvatarModal();
      return;
    }
    setSavingAvatar(true);
    try {
      await AuthService.updateProfile({ photoURL: customAvatarUrl });
      await refreshUser();
      handleCloseAvatarModal();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update avatar');
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      const [userGroups, userChallenges, userReminders] = await Promise.all([
        GroupService.getUserGroups(user.id),
        ChallengeService.getUserChallenges(user.id),
        ReminderService.getUserReminders(user.id),
      ]);
      setGroups(userGroups);
      const mergedChallenges = deduplicateChallenges(userChallenges);
      setChallenges(mergedChallenges);

      // Filter reminders for today
      const today = new Date();
      const todayDayOfWeek = today.getDay();
      const todayDateOfMonth = today.getDate();
      const filtered = userReminders.filter(r => {
        if (!r.isActive) return false;
        if (r.frequency === 'daily') return true;
        if (r.frequency === 'weekly') {
          const entries = r.schedule as { day: number; hour: number }[];
          return entries.some(e => e.day === todayDayOfWeek);
        }
        if (r.frequency === 'monthly') {
          const entries = r.schedule as { day: number; hour: number }[];
          return entries.some(e => e.day === todayDateOfMonth);
        }
        return false;
      });
      setTodayReminders(filtered);

      await Promise.all([
        loadGroupMembers(userGroups),
        prefetchChallengeDetails(mergedChallenges, user.id)
      ]);
    } catch (error) {
      if (__DEV__) console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleNewChallenge = () => {
    setShowActionMenu(false);
    navigation.navigate('SelectGroup');
  };

  const handleNewSoloChallenge = () => {
    setShowActionMenu(false);
    navigation.navigate('GroupType', { isSolo: true });
  };

  const handleNewReminder = () => {
    setShowActionMenu(false);
    navigation.navigate('CreateReminder');
  };

  const CONGRATS_MESSAGES = [
    "Congratulations! You've completed all challenges for the day! Keep it up!",
    "Well done! You've submitted for all the challenges for the day! Keep up the good work!",
    "Good work! You've done everything assigned for the day! Stay Locked in!",
  ];

  const handleDismissReminder = (reminderId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDismissedReminderIds(prev => {
      const next = new Set(prev);
      next.add(reminderId);
      // Persist to AsyncStorage so it survives app restarts
      AsyncStorage.setItem(dismissedStorageKey, JSON.stringify([...next])).catch(() => {});
      return next;
    });
  };

  const showCongratsAnimation = () => {
    setShowCongratsModal(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    congratsScale.setValue(0);
    congratsOpacity.setValue(0);
    sparkleRotation.setValue(0);
    Animated.parallel([
      Animated.spring(congratsScale, {
        toValue: 1,
        friction: 4,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(congratsOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.timing(sparkleRotation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ),
    ]).start();
  };

  // Track previous to-do count to detect transition to 0
  const prevToDoCountRef = useRef<number | null>(null);

  const SEPARATOR_WIDTH = Dimensions.get('window').width - (Theme.layout.screenPadding || 24) * 2;
  const DIP_DEPTH = 10;
  const CURVE_INSET = 30;
  const STROKE = 2;
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

  const isChallengeEnded = (challenge: Challenge): boolean => {
    return (challenge as any).state === 'ended';
  };

  const isDeadlinePassed = (challenge: Challenge): boolean => {
    if ((challenge as any).type !== 'deadline' || !challenge.due?.deadlineDate) return false;
    const adminTz = resolveAdminTimeZone(challenge);
    const dueTimeLocal = challenge.due?.dueTimeLocal || '23:59';
    const deadlineMoment = computeDeadlineMomentUtc(adminTz, challenge.due.deadlineDate, dueTimeLocal);
    return Date.now() >= deadlineMoment.getTime();
  };

  const isChallengeCompleted = (challenge: Challenge): boolean => {
    // Check if challenge is completed today/this week
    if (!challengeDetailsCache[challenge.id]) return false;
    const details = challengeDetailsCache[challenge.id];
    const myCompletedCount = details.checkInsForCurrentPeriod?.filter(
      (ci: any) => ci.userId === user?.id && ci.status === 'completed'
    ).length || 0;
    if (myCompletedCount === 0) return false;
    // Weekly challenges require requiredCount check-ins to be "done"
    if (challenge.cadence?.unit === 'weekly') {
      const required = challenge.cadence.requiredCount || 1;
      return myCompletedCount >= required;
    }
    return true; // daily: 1 completed = done
  };

  const isUserEliminated = (challenge: Challenge): boolean => {
    if (!user?.id || (challenge as any).type !== 'elimination') return false;
    const details = challengeDetailsCache[challenge.id];
    const members: any[] = details?.challengeMembers ?? [];
    const me = members.find((m: any) => m.userId === user.id);
    return me?.state === 'eliminated';
  };

  const getUserStreak = (challenge: Challenge): number => {
    if (!user?.id) return 0;
    const details = challengeDetailsCache[challenge.id];
    const members: any[] = details?.challengeMembers ?? [];
    const me = members.find((m: any) => m.userId === user.id);
    return me?.currentStreak || 0;
  };
  
  const handleCheckInPress = async (challenge: Challenge, e: any) => {
    e.stopPropagation(); // Prevent card navigation

    if (isChallengeEnded(challenge)) {
      Alert.alert('Challenge Ended', 'This challenge has ended. Check-ins are no longer accepted.');
      return;
    }

    if (isDeadlinePassed(challenge)) {
      Alert.alert('Deadline Passed', 'The deadline for this challenge has passed. Check-ins are no longer accepted.');
      return;
    }

    // Load challenge details if not cached
    if (!challengeDetailsCache[challenge.id]) {
      try {
        const details = await ChallengeService.getChallengeDetails(challenge.id, auth.currentUser?.uid || '');
        setChallengeDetailsCache(prev => ({ ...prev, [challenge.id]: details }));
      } catch (error) {
        if (__DEV__) console.error('Error loading challenge:', error);
        Alert.alert('Error', 'Failed to load challenge details');
        return;
      }
    }
    
    // Check if already submitted for the period we would submit to (IANA timezone-based)
    const details = challengeDetailsCache[challenge.id];
    const challengeForDue = details?.challenge || challenge;
    const dueTimeLocal = challengeForDue.due?.dueTimeLocal || '23:59';
    const adminTz = resolveAdminTimeZone(challengeForDue);
    const isDaily = challengeForDue.cadence?.unit === 'daily';
    const isDeadline = challengeForDue.type === 'deadline';
    const submissionPeriodKey = isDaily
      ? (isDeadline ? getAdminZoneDayKey(adminTz) : getCurrentPeriodDayKey(adminTz, dueTimeLocal))
      : getCurrentPeriodWeekKey(adminTz, challengeForDue.cadence?.weekStartsOn ?? 0);
    const myPeriodCheckIns = details?.allRecentCheckIns?.filter(
      (ci: any) => ci.userId === user?.id && ci.status === 'completed' &&
        (isDaily ? ci.period?.dayKey === submissionPeriodKey : ci.period?.weekKey === submissionPeriodKey)
    ) || [];
    const requiredCount = isDaily ? 1 : (challengeForDue.cadence?.requiredCount || 1);
    if (myPeriodCheckIns.length >= requiredCount) {
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
      const deadlineTz = resolveAdminTimeZone(challenge);
      const deadlineDueTime = challenge.due.dueTimeLocal || '23:59';
      const deadlineMomentUtc = computeDeadlineMomentUtc(deadlineTz, challenge.due.deadlineDate, deadlineDueTime);
      const deadlineDiffMs = deadlineMomentUtc.getTime() - now.getTime();
      if (deadlineDiffMs <= 0) return 'Deadline passed';
      const daysLeft = Math.ceil(deadlineDiffMs / (1000 * 60 * 60 * 24));
      if (daysLeft === 0) return 'Due today';
      return `Due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`;
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
      
      // Show time remaining until due (IANA timezone-based)
      const dueTimeLocal2 = challenge.due?.dueTimeLocal || '23:59';
      const tz = resolveAdminTimeZone(challenge);
      const dayKey = getCurrentPeriodDayKey(tz, dueTimeLocal2);
      const dueMomentUtc = computeDueMomentUtcForDay(tz, dayKey, dueTimeLocal2);
      const diffMs = dueMomentUtc.getTime() - Date.now();
      if (diffMs <= 0) return 'Due now';
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const timeRemaining = diffHours > 0 ? `${diffHours}h ${diffMinutes}m` : `${diffMinutes}m`;
      return `Due in ${timeRemaining}`;
    }
    
    if (challenge.cadence.unit === 'weekly' && challenge.cadence.requiredCount) {
      const details = challengeDetailsCache[challenge.id];
      const completedCount = details?.checkInsForCurrentPeriod?.filter(
        (ci: any) => ci.userId === user?.id && ci.status === 'completed'
      ).length || 0;
      return `${completedCount}/${challenge.cadence.requiredCount} done this week`;
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

  // No vertical scroll — header is fixed height

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
      {/* Level Pill — top center */}
      <View style={styles.levelPillTopBar}>
        <View style={[styles.levelPill, { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.accent }]}>
          <Text style={[styles.levelPillText, { color: colors.accent }]}>
            Lv. {user?.level || 1} — {user?.levelTitle || 'Rookie'}
          </Text>
        </View>
        <View style={[styles.xpBarBg, { backgroundColor: colors.accent + '20' }]}>
          <View
            style={[
              styles.xpBarFill,
              {
                backgroundColor: colors.accent,
                width: `${Math.min(100, ((user?.xp || 0) / GamificationService.getNextLevelXP(user?.level || 1)) * 100)}%`,
              },
            ]}
          />
        </View>
      </View>

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
        <BellIcon size={26} color="#FF6B35" />
        {notificationCount > 0 && (
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationBadgeText}>
              {notificationCount > 9 ? '9+' : notificationCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* User Profile Section */}
      <View style={styles.userSectionWrapper}>
        <View style={styles.userSection}>
          <Avatar
            source={user?.photoURL}
            initials={user?.displayName?.charAt(0)}
            size="xl"
            onPress={() => {
              handleAvatarPress();
            }}
          />
          <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
            <Text style={[styles.userName, { color: colors.text }]}>{user?.displayName || 'Loading...'}</Text>
          </TouchableOpacity>
          <View style={{ marginBottom: 0 }}>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
              <Text style={[styles.userTitle, { color: colors.textSecondary }]}>
                {user?.title || 'Accountability Seeker'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Content Sections */}
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        renderErrorState()
      ) : (
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          scrollEnabled={false}
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
            const incompleteChallenges = challenges.filter(c => !isChallengeEnded(c) && !isChallengeCompleted(c) && !isDeadlinePassed(c));
            const activeReminders = todayReminders.filter(r => !dismissedReminderIds.has(r.id));
            const toDoItems: ({ kind: 'challenge'; data: Challenge } | { kind: 'reminder'; data: Reminder })[] = [
              ...incompleteChallenges.map(c => ({ kind: 'challenge' as const, data: c })),
              ...activeReminders.map(r => ({ kind: 'reminder' as const, data: r })),
            ];
            const toDoCount = toDoItems.length;

            // Detect when to-do transitions to 0 and show congrats
            if (prevToDoCountRef.current !== null && prevToDoCountRef.current > 0 && toDoCount === 0) {
              // Use setTimeout to avoid setState during render
              setTimeout(() => showCongratsAnimation(), 300);
            }
            prevToDoCountRef.current = toDoCount;

            return (
              <View style={styles.section}>
                {renderSectionBlock('TO DO', toDoCount, 'todo')}
                {toDoItems.length > 0 ? (
                  <TiltCarousel
                      data={toDoItems}
                      keyExtractor={(item) => item.kind === 'challenge' ? item.data.id : `rem_${item.data.id}`}
                      contentPadding={Theme.layout.screenPadding}
                      renderItem={({ item }) => {
                        if (item.kind === 'challenge') {
                          const challenge = item.data;
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
                              streak={getUserStreak(challenge)}
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
                        }
                        // Reminder card
                        const reminder = item.data;
                        const formatHour = (h: number) =>
                          h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
                        return (
                          <View style={[styles.reminderCard, { backgroundColor: colors.card, borderColor: colors.accent }]}>
                            <View style={styles.reminderCardRow}>
                              <BellIcon size={18} color={colors.accent} />
                              <Text style={[styles.reminderTitle, { color: colors.text }]} numberOfLines={1}>
                                {reminder.title}
                              </Text>
                              <View style={[styles.reminderFreqBadge, { backgroundColor: colors.accent + '20' }]}>
                                <Text style={[styles.reminderFreqText, { color: colors.accent }]}>
                                  {reminder.frequency}
                                </Text>
                              </View>
                            </View>
                            {reminder.description ? (
                              <Text style={[styles.reminderDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                                {reminder.description}
                              </Text>
                            ) : null}
                            <View style={styles.reminderBottomRow}>
                              <View style={styles.reminderTimesRow}>
                                <Clock size={13} color={colors.textSecondary} />
                                {reminder.frequency === 'daily' ? (
                                  (reminder.schedule as number[]).map(h => (
                                    <View key={h} style={[styles.reminderTimeChip, { backgroundColor: colors.accent + '15' }]}>
                                      <Text style={[styles.reminderTimeText, { color: colors.accent }]}>{formatHour(h)}</Text>
                                    </View>
                                  ))
                                ) : (
                                  (reminder.schedule as { day: number; hour: number }[]).map((e, i) => (
                                    <View key={i} style={[styles.reminderTimeChip, { backgroundColor: colors.accent + '15' }]}>
                                      <Text style={[styles.reminderTimeText, { color: colors.accent }]}>{formatHour(e.hour)}</Text>
                                    </View>
                                  ))
                                )}
                              </View>
                              <TouchableOpacity
                                style={[styles.reminderDismissBtn, { borderColor: '#22C55E' }]}
                                onPress={() => handleDismissReminder(reminder.id)}
                                activeOpacity={0.7}
                              >
                                <Check size={16} color="#22C55E" />
                              </TouchableOpacity>
                            </View>
                          </View>
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
            const completedChallenges = challenges.filter(c => !isChallengeEnded(c) && (isChallengeCompleted(c) || isDeadlinePassed(c)));
            const dismissedReminders = todayReminders.filter(r => dismissedReminderIds.has(r.id));
            const finishedItems: ({ kind: 'challenge'; data: Challenge } | { kind: 'reminder'; data: Reminder })[] = [
              ...completedChallenges.map(c => ({ kind: 'challenge' as const, data: c })),
              ...dismissedReminders.map(r => ({ kind: 'reminder' as const, data: r })),
            ];
            const finishedCount = finishedItems.length;
            return (
              <View style={[styles.section, styles.sectionFinished]}>
                {renderSectionBlock('FINISHED', finishedCount, 'finished')}
                {finishedItems.length > 0 ? (
                  <TiltCarousel
                      data={finishedItems}
                      keyExtractor={(item) => item.kind === 'challenge' ? item.data.id : `rem_done_${item.data.id}`}
                      contentPadding={Theme.layout.screenPadding}
                      renderItem={({ item }) => {
                        if (item.kind === 'challenge') {
                          const challenge = item.data;
                          const groupName = challenge.groupId
                            ? groups.find(g => g.id === challenge.groupId)?.name
                            : undefined;
                          return (
                            <ChallengeCarouselCard
                              challenge={challenge}
                              groupName={groupName}
                              groupMembers={challenge.groupId ? (groupMembers[challenge.groupId] || []).map(u => ({ id: u.id, photoURL: u.photoURL, displayName: u.displayName })) : undefined}
                              isCompleted={isChallengeCompleted(challenge) || isDeadlinePassed(challenge)}
                              status={getChallengeStatus(challenge)}
                              isEliminated={isUserEliminated(challenge)}
                              streak={getUserStreak(challenge)}
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
                        }
                        // Dismissed reminder card
                        const reminder = item.data;
                        const formatHour = (h: number) =>
                          h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
                        return (
                          <View style={[styles.reminderCard, { backgroundColor: colors.card, borderColor: '#22C55E', opacity: 0.7 }]}>
                            <View style={styles.reminderCardRow}>
                              <Check size={18} color="#22C55E" />
                              <Text style={[styles.reminderTitle, { color: colors.textSecondary, textDecorationLine: 'line-through' }]} numberOfLines={1}>
                                {reminder.title}
                              </Text>
                              <View style={[styles.reminderFreqBadge, { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
                                <Text style={[styles.reminderFreqText, { color: '#22C55E' }]}>
                                  Done
                                </Text>
                              </View>
                            </View>
                            {reminder.description ? (
                              <Text style={[styles.reminderDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                                {reminder.description}
                              </Text>
                            ) : null}
                            <View style={styles.reminderTimesRow}>
                              <Clock size={13} color={colors.textSecondary} />
                              {reminder.frequency === 'daily' ? (
                                (reminder.schedule as number[]).map(h => (
                                  <View key={h} style={[styles.reminderTimeChip, { backgroundColor: 'rgba(34,197,94,0.1)' }]}>
                                    <Text style={[styles.reminderTimeText, { color: '#22C55E' }]}>{formatHour(h)}</Text>
                                  </View>
                                ))
                              ) : (
                                (reminder.schedule as { day: number; hour: number }[]).map((e, i) => (
                                  <View key={i} style={[styles.reminderTimeChip, { backgroundColor: 'rgba(34,197,94,0.1)' }]}>
                                    <Text style={[styles.reminderTimeText, { color: '#22C55E' }]}>{formatHour(e.hour)}</Text>
                                  </View>
                                ))
                              )}
                            </View>
                          </View>
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
        </ScrollView>
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

      {/* Avatar Customization Modal */}
      <CenteredModal
        visible={avatarModalVisible}
        onClose={handleCloseAvatarModal}
        size="large"
        scrollable
      >
        <View style={[avatarModalStyles.modalContent, { backgroundColor: colors.surface }]}>
          <Text style={[avatarModalStyles.modalTitle, { color: colors.text }]}>Customize avatar</Text>
          <Text style={[avatarModalStyles.modalSubtitle, { color: colors.textSecondary }]}>
            Choose a style and background. Randomize or use your name for a different look.
          </Text>

          <View style={[avatarModalStyles.previewCard, { backgroundColor: colors.card, borderColor: colors.dividerLineTodo + '50' }]}>
            <Avatar source={displayPreviewUrl} initials={user?.displayName?.charAt(0)} size="xl" />
            <View style={avatarModalStyles.randomizeRow}>
              <TouchableOpacity
                style={[avatarModalStyles.randomizeButton, { backgroundColor: colors.background, borderColor: colors.dividerLineTodo + '80' }]}
                onPress={handleRandomizeAvatar}
              >
                <Ionicons name="shuffle" size={18} color={colors.accent} />
                <Text style={[avatarModalStyles.randomizeButtonText, { color: colors.text }]}>Randomize</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleUseMyName} style={avatarModalStyles.useNameLink}>
                <Text style={[avatarModalStyles.useNameLinkText, { color: colors.accent }]}>Use my name</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={[avatarModalStyles.pickerLabel, { color: colors.textSecondary }]}>Style</Text>
          <View style={[avatarModalStyles.styleRow, { justifyContent: 'center' }]}>
            {DICEBEAR_STYLES.map((s) => (
              <TouchableOpacity
                key={s.id}
                onPress={() => { setAvatarStyle(s.id); setUseSavedAsPreview(false); }}
                style={[
                  avatarModalStyles.styleChip,
                  { borderColor: colors.dividerLineTodo + '80', backgroundColor: colors.card },
                  avatarStyle === s.id && [avatarModalStyles.styleChipActive, { borderColor: colors.accent, backgroundColor: colors.accent + '20' }],
                ]}
              >
                <Text style={[avatarModalStyles.styleChipText, { color: colors.text }]} numberOfLines={1}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[avatarModalStyles.pickerLabel, { color: colors.textSecondary }]}>Background</Text>
          <View style={avatarModalStyles.bgRow}>
            {DICEBEAR_BACKGROUNDS.map((hex, i) => (
              <TouchableOpacity
                key={hex}
                onPress={() => { setAvatarBgIndex(i); setUseSavedAsPreview(false); }}
                style={[
                  avatarModalStyles.bgChip,
                  { backgroundColor: '#' + hex },
                  avatarBgIndex === i && [avatarModalStyles.bgChipActive, { borderColor: colors.accent }],
                ]}
              />
            ))}
          </View>

          <View style={avatarModalStyles.modalActions}>
            <TouchableOpacity
              style={[avatarModalStyles.modalButton, { backgroundColor: colors.card, borderColor: colors.dividerLineTodo + '80' }]}
              onPress={handleCloseAvatarModal}
            >
              <Text style={[avatarModalStyles.modalButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[avatarModalStyles.modalButton, avatarModalStyles.modalButtonSave, { backgroundColor: colors.accent }]}
              onPress={handleSaveCustomAvatar}
              disabled={savingAvatar}
            >
              {savingAvatar ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={avatarModalStyles.modalButtonTextWhite}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </CenteredModal>

      {/* Challenge Alert Modal (eliminated / deadline ended) */}
      <Modal
        visible={!!alertChallenge}
        transparent
        animationType="fade"
        onRequestClose={() => setAlertChallenge(null)}
      >
        <View style={styles.congratsOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setAlertChallenge(null)}
          />
          <View style={[styles.congratsCard, { backgroundColor: colors.surface }]}>
            <Ionicons
              name={alertChallenge?.type === 'eliminated' ? 'skull-outline' : 'flag-outline'}
              size={48}
              color={colors.accent}
            />
            <Text style={[styles.congratsTitle, { color: colors.text }]}>
              {alertChallenge?.type === 'eliminated' ? 'Eliminated!' : 'Deadline Passed!'}
            </Text>
            <Text style={[styles.congratsMessage, { color: colors.textSecondary }]}>
              {alertChallenge?.type === 'eliminated'
                ? `You've been eliminated from "${(alertChallenge?.challenge as any)?.title || (alertChallenge?.challenge as any)?.name || 'the challenge'}".`
                : `The deadline for "${(alertChallenge?.challenge as any)?.title || (alertChallenge?.challenge as any)?.name || 'the challenge'}" has passed. View the details!`}
            </Text>
            <TouchableOpacity
              style={[styles.congratsButton, { backgroundColor: colors.accent }]}
              onPress={() => {
                const ch = alertChallenge?.challenge;
                setAlertChallenge(null);
                if (ch) {
                  const cached = challengeDetailsCache[ch.id];
                  if (cached) {
                    navigation.navigate('ChallengeDetail', cached);
                  } else {
                    navigation.navigate('ChallengeDetail', {
                      challengeId: ch.id,
                      currentUserId: auth.currentUser?.uid || '',
                    });
                  }
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.congratsButtonText}>View Challenge</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Congrats Modal */}
      <Modal
        visible={showCongratsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCongratsModal(false)}
      >
        <View style={styles.congratsOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowCongratsModal(false)}
          />
          <Animated.View
            style={[
              styles.congratsCard,
              {
                backgroundColor: colors.surface,
                transform: [{ scale: congratsScale }],
                opacity: congratsOpacity,
              },
            ]}
          >
            <Animated.View
              style={{
                transform: [
                  {
                    rotate: sparkleRotation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              }}
            >
              <Sparkles size={48} color="#FFD700" />
            </Animated.View>
            <Text style={[styles.congratsTitle, { color: colors.text }]}>
              All Done!
            </Text>
            <Text style={[styles.congratsMessage, { color: colors.textSecondary }]}>
              {CONGRATS_MESSAGES[Math.floor(Math.random() * CONGRATS_MESSAGES.length)]}
            </Text>
            <TouchableOpacity
              style={[styles.congratsButton, { backgroundColor: colors.accent }]}
              onPress={() => setShowCongratsModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.congratsButtonText}>Awesome!</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  userSection: {
    alignItems: 'center',
    paddingHorizontal: Theme.layout.screenPadding,
    paddingTop: Theme.spacing.sm,
    paddingBottom: 4,
  },
  userName: {
    ...Theme.typography.h2,
    marginTop: 6,
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
  levelPillTopBar: {
    position: 'absolute',
    top: 63,
    left: 70,
    right: 70,
    zIndex: 1000,
    alignItems: 'center',
    gap: 3,
  },
  levelPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  xpBarBg: {
    width: 80,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  
  scrollContent: {
    paddingHorizontal: Theme.layout.screenPadding,
    paddingTop: 6,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 12,
  },
  sectionFinished: {
    marginTop: -6,
  },

  sectionBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  sectionLabelTodo: {
    color: '#1A1A1A',
  },
  sectionLabelFinished: {
    color: '#1A1A1A',
  },
  sectionCount: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    minWidth: 26,
    alignItems: 'center',
    marginBottom: 1,
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
  
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    minHeight: 70,
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

  reminderCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    marginTop: 8,
    marginHorizontal: 2,
  },
  reminderCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  reminderFreqBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  reminderFreqText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  reminderDesc: {
    fontSize: 13,
    marginTop: 4,
    marginLeft: 26,
  },
  reminderBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  reminderTimesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 26,
    flexWrap: 'wrap',
    flex: 1,
  },
  reminderTimeChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  reminderTimeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  reminderDismissBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  congratsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  congratsCard: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  congratsTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 8,
  },
  congratsMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  congratsButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  congratsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

const avatarModalStyles = StyleSheet.create({
  modalContent: { padding: 20, paddingTop: 16 },
  modalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, marginBottom: 20, lineHeight: 20 },
  previewCard: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16, marginBottom: 20, borderRadius: 16, borderWidth: 1 },
  randomizeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 16 },
  randomizeButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1 },
  randomizeButtonText: { fontSize: 14, fontWeight: '600' },
  useNameLink: { paddingVertical: 8, paddingHorizontal: 4 },
  useNameLinkText: { fontSize: 14, fontWeight: '600' },
  pickerLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  styleRow: { flexDirection: 'row', flexWrap: 'nowrap', gap: 8, marginBottom: 20, alignSelf: 'center' },
  styleChip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5, alignItems: 'center' },
  styleChipActive: { borderWidth: 2 },
  styleChipText: { fontSize: 12, fontWeight: '600' },
  bgRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  bgChip: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'transparent' },
  bgChipActive: { borderWidth: 2 },
  modalActions: { flexDirection: 'row', gap: 16, marginTop: 8 },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  modalButtonSave: { borderWidth: 0 },
  modalButtonText: { fontSize: 16, fontWeight: '600' },
  modalButtonTextWhite: { fontSize: 16, fontWeight: '600', color: '#FFF' },
});