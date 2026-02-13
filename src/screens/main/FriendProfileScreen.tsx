import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../../components/common/Avatar';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { User, Group } from '../../types';
import { AuthService } from '../../services/authService';
import { GroupService } from '../../services/groupService';
import { ChallengeService } from '../../services/challengeService';
import { CheckInService } from '../../services/checkInService';
import { dateKeys } from '../../utils/dateKeys';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

type Challenge = any;
type CheckIn = any;

interface FriendProfileScreenProps {
  navigation: any;
  route: {
    params?: {
      user?: User;
      currentUser?: User;
    };
  };
}

export const FriendProfileScreen: React.FC<FriendProfileScreenProps> = ({ navigation, route }) => {
  const friend = route.params?.user;
  const currentUserFromParams = route.params?.currentUser;
  const [currentUser, setCurrentUser] = useState<User | null>(() => currentUserFromParams ?? null);
  const [sharedGroups, setSharedGroups] = useState<Group[]>([]);
  const [sharedChallenges, setSharedChallenges] = useState<Challenge[]>([]);
  const [friendCheckInsByDay, setFriendCheckInsByDay] = useState<Map<string, Array<{ checkIn: CheckIn; challenge: Challenge }>>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!friend?.id || !currentUser?.id) return;

    try {
      const [myGroups, myChallenges, friendChallenges] = await Promise.all([
        GroupService.getUserGroups(currentUser.id),
        ChallengeService.getUserChallenges(currentUser.id),
        ChallengeService.getUserChallenges(friend.id),
      ]);

      const myChallengeIds = new Set(myChallenges.map((c: Challenge) => c.id));
      const friendChallengeIds = new Set(friendChallenges.map((c: Challenge) => c.id));
      const sharedIds: string[] = [];
      const challengeMap = new Map<string, Challenge>();
      myChallenges.forEach((c: Challenge) => {
        if (friendChallengeIds.has(c.id)) {
          sharedIds.push(c.id);
          challengeMap.set(c.id, c);
        }
      });

      const shared = sharedIds.map((id) => challengeMap.get(id)!).filter(Boolean);
      setSharedChallenges(shared);

      const groupsWeShare = myGroups.filter((g) => g.memberIds && g.memberIds.includes(friend.id));
      setSharedGroups(groupsWeShare);

      if (sharedIds.length === 0) {
        setFriendCheckInsByDay(new Map());
        return;
      }

      const allCheckIns = await CheckInService.getChallengeCheckIns(sharedIds);
      const friendOnly = allCheckIns.filter((ci: CheckIn) => ci.userId === friend.id);

      const byDay = new Map<string, Array<{ checkIn: CheckIn; challenge: Challenge }>>();
      friendOnly.forEach((ci: CheckIn) => {
        const dayKey = ci.period?.dayKey || (ci.createdAt ? dateKeys.getDayKey(ci.createdAt instanceof Date ? ci.createdAt : new Date(ci.createdAt)) : null);
        if (!dayKey) return;
        const challenge = challengeMap.get(ci.challengeId);
        if (!challenge) return;
        if (!byDay.has(dayKey)) byDay.set(dayKey, []);
        byDay.get(dayKey)!.push({ checkIn: ci, challenge });
      });

      byDay.forEach((arr) => arr.sort((a, b) => {
        const ta = a.checkIn.createdAt instanceof Date ? a.checkIn.createdAt.getTime() : (a.checkIn.createdAt ?? 0);
        const tb = b.checkIn.createdAt instanceof Date ? b.checkIn.createdAt.getTime() : (b.checkIn.createdAt ?? 0);
        return tb - ta;
      }));

      setFriendCheckInsByDay(byDay);
    } catch (e) {
      console.error('FriendProfile loadData:', e);
      setSharedGroups([]);
      setSharedChallenges([]);
      setFriendCheckInsByDay(new Map());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [friend?.id, currentUser?.id]);

  // Use currentUser from params (instant) or fetch once
  useEffect(() => {
    if (currentUserFromParams?.id) {
      setCurrentUser(currentUserFromParams);
      return;
    }
    let mounted = true;
    AuthService.getCurrentUser().then((u) => {
      if (mounted) setCurrentUser(u);
    });
    return () => { mounted = false; };
  }, [currentUserFromParams?.id]);

  useEffect(() => {
    if (currentUser?.id && friend?.id) {
      setLoading(true);
      loadData();
    } else {
      setLoading(false);
    }
  }, [currentUser?.id, friend?.id, loadData]);

  useFocusEffect(
    useCallback(() => {
      if (currentUser?.id && friend?.id && !loading) loadData();
    }, [currentUser?.id, friend?.id, loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const generateMonthGrid = (): Date[][] => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const weeks: Date[][] = [];
    let week: Date[] = [];
    const startDay = firstDay.getDay();
    for (let i = 0; i < startDay; i++) {
      week.push(new Date(year, month, -startDay + i + 1));
    }
    for (let day = 1; day <= lastDay.getDate(); day++) {
      week.push(new Date(year, month, day));
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }
    while (week.length > 0 && week.length < 7) {
      week.push(new Date(year, month + 1, week.length - startDay + lastDay.getDate() + 1));
    }
    if (week.length > 0) weeks.push(week);
    return weeks;
  };

  const getCompletionCount = (date: Date): number => {
    const dayKey = dateKeys.getDayKey(date);
    const items = friendCheckInsByDay.get(dayKey) || [];
    return items.filter((i) => i.checkIn.status === 'completed').length;
  };

  const getColorForCount = (count: number): string => {
    if (count === 0) return '#F0F0F0';
    if (count === 1) return '#FFE5DC';
    if (count === 2) return '#FFB088';
    return '#FF6B35';
  };

  const isToday = (date: Date) => dateKeys.getDayKey(date) === dateKeys.getDayKey(new Date());
  const isCurrentMonth = (date: Date) => date.getMonth() === currentMonth.getMonth();
  const monthGrid = generateMonthGrid();

  const goPrevMonth = () => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1));
  const goNextMonth = () => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1));
  const isNextDisabled = currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear();

  const challengesForSelectedDay = selectedDayKey ? (friendCheckInsByDay.get(selectedDayKey) || []) : [];

  if (!friend) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>No profile data</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show friend immediately (from params); sections load in background
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />
          }
        >
          <View style={styles.userSection}>
            <Avatar
              source={friend.photoURL}
              initials={friend.displayName?.charAt(0)}
              size="xl"
            />
            <Text style={styles.userName}>{friend.displayName || 'Unknown'}</Text>
            <Text style={styles.userTitle}>{friend.title || 'Accountability Seeker'}</Text>
          </View>

          {/* Shared groups */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shared Groups</Text>
            {loading ? (
              <Text style={styles.loadingSection}>Loading…</Text>
            ) : sharedGroups.length === 0 ? (
              <Text style={styles.emptySection}>No groups in common</Text>
            ) : (
              sharedGroups.map((group) => (
                <TouchableOpacity
                  key={group.id}
                  style={styles.card}
                  onPress={() => navigation.navigate('GroupChat', { groupId: group.id })}
                  activeOpacity={0.7}
                >
                  <Ionicons name="people" size={22} color="#FF6B35" style={styles.cardIcon} />
                  <Text style={styles.cardTitle} numberOfLines={1}>{group.name}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Shared challenges */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shared Challenges</Text>
            {loading ? (
              <Text style={styles.loadingSection}>Loading…</Text>
            ) : sharedChallenges.length === 0 ? (
              <Text style={styles.emptySection}>No challenges in common</Text>
            ) : (
              sharedChallenges.map((challenge) => (
                <TouchableOpacity
                  key={challenge.id}
                  style={styles.card}
                  onPress={() =>
                    navigation.navigate('ChallengeDetail', {
                      challengeId: challenge.id,
                      currentUserId: currentUser?.id ?? '',
                    })
                  }
                  activeOpacity={0.7}
                >
                  <Ionicons name="trophy" size={22} color="#FF6B35" style={styles.cardIcon} />
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {challenge.title ?? challenge.name ?? 'Challenge'}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Mini calendar (no title) */}
          <View style={styles.calendarSection}>
            {loading ? (
              <Text style={styles.loadingSection}>Loading calendar…</Text>
            ) : (
              <>
            <View style={styles.monthHeader}>
              <TouchableOpacity onPress={goPrevMonth} style={styles.navButton}>
                <Ionicons name="chevron-back" size={24} color="#FF6B35" />
              </TouchableOpacity>
              <Text style={styles.monthText}>
                {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </Text>
              <TouchableOpacity
                onPress={goNextMonth}
                style={styles.navButton}
                disabled={isNextDisabled}
              >
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color={isNextDisabled ? '#CCC' : '#FF6B35'}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.calendarContainer}>
              <View style={styles.dayNamesRow}>
                {DAY_NAMES.map((day, i) => (
                  <View key={`dn-${i}`} style={styles.dayNameCell}>
                    <Text style={styles.dayNameText}>{day}</Text>
                  </View>
                ))}
              </View>
              {monthGrid.map((week, weekIndex) => (
                <View key={`w-${weekIndex}`} style={styles.weekRow}>
                  {week.map((date, dayIndex) => {
                    const count = getCompletionCount(date);
                    const color = getColorForCount(count);
                    const dayKey = dateKeys.getDayKey(date);
                    const selected = selectedDayKey === dayKey;
                    return (
                      <TouchableOpacity
                        key={`d-${weekIndex}-${dayIndex}`}
                        style={[
                          styles.dayCell,
                          { backgroundColor: color },
                          !isCurrentMonth(date) && styles.dayCellOtherMonth,
                          selected && styles.dayCellSelected,
                        ]}
                        onPress={() => setSelectedDayKey(dayKey)}
                      >
                        <Text
                          style={[
                            styles.dayCellText,
                            !isCurrentMonth(date) && styles.dayCellTextOtherMonth,
                            count > 0 && styles.dayCellTextWithData,
                          ]}
                        >
                          {date.getDate()}
                        </Text>
                        {isToday(date) && <View style={styles.todayIndicator} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>

            <View style={styles.legend}>
              <Text style={styles.legendText}>Less</Text>
              <View style={[styles.legendBox, { backgroundColor: '#F0F0F0' }]} />
              <View style={[styles.legendBox, { backgroundColor: '#FFE5DC' }]} />
              <View style={[styles.legendBox, { backgroundColor: '#FFB088' }]} />
              <View style={[styles.legendBox, { backgroundColor: '#FF6B35' }]} />
              <Text style={styles.legendText}>More</Text>
            </View>

            {selectedDayKey && (
              <View style={styles.selectedDaySection}>
                <Text style={styles.selectedDayTitle}>
                  {selectedDayKey === dateKeys.getDayKey(new Date())
                    ? 'Today'
                    : dateKeys.parseKey(selectedDayKey).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </Text>
                {challengesForSelectedDay.length === 0 ? (
                  <Text style={styles.emptySection}>No check-ins this day</Text>
                ) : (
                  challengesForSelectedDay.map(({ checkIn, challenge }) => {
                    const raw = checkIn.createdAt;
                    const timeStr = !raw ? '' : (raw instanceof Date ? raw : new Date(raw)).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
                    return (
                      <View key={checkIn.id} style={styles.calendarRow}>
                        <Ionicons
                          name={checkIn.status === 'completed' ? 'checkmark-circle' : 'ellipse-outline'}
                          size={20}
                          color={checkIn.status === 'completed' ? '#4CAF50' : '#999'}
                        />
                        <View style={styles.calendarRowText}>
                          <Text style={styles.calendarRowTitle} numberOfLines={1}>
                            {challenge.title ?? challenge.name ?? 'Challenge'}
                          </Text>
                          <Text style={styles.calendarRowSub}>
                            {checkIn.status === 'completed' ? 'Completed' : checkIn.status}
                            {timeStr ? ` • ${timeStr}` : ''}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}
              </>
            )}
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
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
    paddingTop: 12,
    paddingBottom: 6,
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
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 48,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  userSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 4,
    textAlign: 'center',
    color: '#000',
  },
  userTitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666666',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  calendarSection: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  emptySection: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  cardIcon: {
    marginRight: 12,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: 4,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B35',
  },
  navButton: {
    padding: 8,
    minWidth: 40,
    alignItems: 'center',
  },
  calendarContainer: {
    marginBottom: 8,
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayNameCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
  },
  dayNameText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#666',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 3,
    height: 32,
  },
  dayCell: {
    flex: 1,
    marginHorizontal: 1,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayCellOtherMonth: {
    opacity: 0.35,
  },
  dayCellSelected: {
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  dayCellText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#999',
  },
  dayCellTextOtherMonth: {
    color: '#CCC',
  },
  dayCellTextWithData: {
    color: '#000',
  },
  todayIndicator: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FF6B35',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 4,
    gap: 3,
  },
  legendText: {
    fontSize: 10,
    color: '#666',
    marginHorizontal: 2,
  },
  legendBox: {
    width: 10,
    height: 10,
    borderRadius: 2,
    marginHorizontal: 1,
  },
  selectedDaySection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  selectedDayTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6B35',
    marginBottom: 10,
  },
  calendarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  calendarRowText: {
    flex: 1,
    marginLeft: 10,
  },
  calendarRowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  calendarRowSub: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  bottomSpacer: {
    height: 24,
  },
  loadingSection: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    paddingVertical: 10,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
  },
});
