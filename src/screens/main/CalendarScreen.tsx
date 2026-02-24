import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../constants/theme';
import { ChallengeService } from '../../services/challengeService';
import { CheckInService } from '../../services/checkInService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Challenge, CheckIn, User } from '../../types';
import { dateKeys } from '../../utils/dateKeys';
import { useColorMode } from '../../theme/ColorModeContext';
import { useCurrentUser } from '../../contexts/UserContext';
import { MONTHS, DAY_NAMES } from '../../constants/calendar';
import { generateMonthGrid, getColorForCount } from '../../utils/calendarGrid';

interface ChallengeOption {
  id: string;
  title: string;
}

export const CalendarScreen: React.FC = () => {
  const { mode, colors } = useColorMode();
  const { user } = useCurrentUser();
  const isDark = mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [checkInsForMonth, setCheckInsForMonth] = useState<CheckIn[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [showChallengeDropdown, setShowChallengeDropdown] = useState(false);
  const [viewMode, setViewMode] = useState<'challenges' | 'pictures'>('challenges');
  const [viewerImage, setViewerImage] = useState<string | null>(null);

  // Load challenges once user is available
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        setLoading(true);
        const userChallenges = await ChallengeService.getUserChallenges(user.id);
        setChallenges(userChallenges);
      } catch (error) {
        if (__DEV__) console.error('Error loading calendar data:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  const loadCheckInsForMonth = useCallback(async (month: Date) => {
    if (!user?.id) return;

    try {
      const year = month.getFullYear();
      const monthNum = month.getMonth();

      // First and last day of month
      const firstDay = new Date(year, monthNum, 1);
      const lastDay = new Date(year, monthNum + 1, 0);

      if (challenges.length === 0) {
        setCheckInsForMonth([]);
        return;
      }

      // Single batched request for all challenges (fast refetch after check-in)
      const challengeIds = challenges.map(c => c.id);
      const allCheckIns = await CheckInService.getChallengeCheckIns(challengeIds);

      const monthCheckIns = allCheckIns.filter((ci) => {
        if (!ci.period?.dayKey) return false;
        if (ci.userId !== user.id) return false;
        const checkInDate = new Date(ci.period.dayKey + 'T12:00:00');
        return checkInDate >= firstDay && checkInDate <= lastDay;
      });

      setCheckInsForMonth(monthCheckIns);
    } catch (error) {
      if (__DEV__) console.error('Error loading check-ins for month:', error);
    }
  }, [user?.id, challenges]);

  // Reload when screen comes into focus or month changes
  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadCheckInsForMonth(currentMonth);
      }
    }, [user, currentMonth, loadCheckInsForMonth])
  );

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  const goToNextMonth = () => {
    const today = new Date();
    const isCurrentMonth = currentMonth.getMonth() === today.getMonth() && 
                           currentMonth.getFullYear() === today.getFullYear();
    
    // Don't allow going to future months
    if (isCurrentMonth) return;
    
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  // Get completion count for a specific day
  const getCompletionCount = (date: Date): number => {
    const dayKey = dateKeys.getDayKey(date);
    
    const relevantCheckIns = checkInsForMonth.filter(ci => {
      if (!ci.period?.dayKey) return false;
      if (ci.period.dayKey !== dayKey) return false;
      if (ci.userId !== user?.id) return false;
      if (ci.status !== 'completed') return false;
      
      // Filter by selected challenge if not "all"
      if (selectedChallenge !== 'all' && ci.challengeId !== selectedChallenge) {
        return false;
      }
      
      return true;
    });
    
    return relevantCheckIns.length;
  };

  // Get challenges for selected date. Check-ins are keyed by period.dayKey (challenge creator TZ).
  // We match by calendar day (local); if creator TZ differs, a check-in may appear on adjacent day.
  const getChallengesForDate = (date: Date): Array<{ challenge: Challenge; checkIn: CheckIn }> => {
    const dayKey = dateKeys.getDayKey(date);

    const relevantCheckIns = checkInsForMonth.filter(ci => {
      if (!ci.period?.dayKey) return false;
      if (ci.period.dayKey !== dayKey) return false;
      if (ci.userId !== user?.id) return false;
      
      // Filter by selected challenge if not "all"
      if (selectedChallenge !== 'all' && ci.challengeId !== selectedChallenge) {
        return false;
      }
      
      return true;
    });
    
    return relevantCheckIns.map(ci => {
      const challenge = challenges.find(c => c.id === ci.challengeId);
      return { challenge: challenge!, checkIn: ci };
    }).filter(item => item.challenge);
  };

  // Get photos for selected date
  const getPhotosForDate = (date: Date): Array<{ uri: string; challengeTitle: string; checkIn: CheckIn }> => {
    const dayKey = dateKeys.getDayKey(date);
    const photos: Array<{ uri: string; challengeTitle: string; checkIn: CheckIn }> = [];

    const relevantCheckIns = checkInsForMonth.filter(ci => {
      if (!ci.period?.dayKey) return false;
      if (ci.period.dayKey !== dayKey) return false;
      if (ci.userId !== user?.id) return false;
      if (selectedChallenge !== 'all' && ci.challengeId !== selectedChallenge) return false;
      return true;
    });

    for (const ci of relevantCheckIns) {
      const attachments = (ci as any).attachments || [];
      const challenge = challenges.find(c => c.id === ci.challengeId);
      const title = challenge?.title || 'Challenge';
      for (const att of attachments) {
        const uri = att.uri || att.url;
        if (uri) photos.push({ uri, challengeTitle: title, checkIn: ci });
      }
    }
    return photos;
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return dateKeys.getDayKey(date) === dateKeys.getDayKey(today);
  };

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentMonth.getMonth() && 
           date.getFullYear() === currentMonth.getFullYear();
  };

  const isSelected = (date: Date): boolean => {
    return dateKeys.getDayKey(date) === dateKeys.getDayKey(selectedDate);
  };

  const formatSelectedDate = (): string => {
    const today = new Date();
    const dayKey = dateKeys.getDayKey(selectedDate);
    const todayKey = dateKeys.getDayKey(today);
    
    if (dayKey === todayKey) {
      return 'Today';
    }
    
    return selectedDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const monthGrid = generateMonthGrid(currentMonth);
  const challengesForSelectedDate = getChallengesForDate(selectedDate);
  
  const challengeOptions: ChallengeOption[] = [
    { id: 'all', title: 'All Challenges' },
    ...challenges.map(c => ({ id: c.id, title: c.title }))
  ];
  
  const selectedChallengeTitle = challengeOptions.find(c => c.id === selectedChallenge)?.title || 'All Challenges';

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingSpinner text="Loading calendar..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            onPress={() => setViewMode(viewMode === 'challenges' ? 'pictures' : 'challenges')}
            style={[styles.picturesButton, { backgroundColor: colors.accent }]}
          >
            <Text style={styles.picturesButtonText}>
              {viewMode === 'challenges' ? 'Pictures' : 'Challenges'}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Calendar</Text>
          <TouchableOpacity onPress={goToToday} style={[styles.todayButton, { backgroundColor: colors.accent }]}>
            <Text style={styles.todayButtonText}>Today</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterContainer}>
          <TouchableOpacity 
            style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.dividerLineTodo + '80' }]}
            onPress={() => setShowChallengeDropdown(!showChallengeDropdown)}
          >
            <Text style={[styles.dropdownText, { color: colors.text }]} numberOfLines={1}>
              {selectedChallengeTitle}
            </Text>
            <Ionicons 
              name={showChallengeDropdown ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color={colors.textSecondary} 
            />
          </TouchableOpacity>
          
          {showChallengeDropdown && (
            <View style={[styles.dropdownMenu, { backgroundColor: colors.surface, borderColor: colors.dividerLineTodo + '80' }]}>
              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
                {challengeOptions.map(option => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.dropdownItem,
                      { borderBottomColor: colors.dividerLineTodo + '40' },
                      selectedChallenge === option.id && [styles.dropdownItemSelected, { backgroundColor: colors.card }]
                    ]}
                    onPress={() => {
                      setSelectedChallenge(option.id);
                      setShowChallengeDropdown(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownItemText,
                      { color: colors.text },
                      selectedChallenge === option.id && [styles.dropdownItemTextSelected, { color: colors.accent }]
                    ]}>
                      {option.title}
                    </Text>
                    {selectedChallenge === option.id && (
                      <Ionicons name="checkmark" size={20} color={colors.accent} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <View style={styles.monthHeader}>
          <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
            <Ionicons name="chevron-back" size={24} color={colors.accent} />
          </TouchableOpacity>
          
          <Text style={[styles.monthText, { color: colors.accent }]}>
            {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </Text>
          
          <TouchableOpacity 
            onPress={goToNextMonth} 
            style={styles.navButton}
            disabled={currentMonth.getMonth() === new Date().getMonth() && 
                     currentMonth.getFullYear() === new Date().getFullYear()}
          >
            <Ionicons 
              name="chevron-forward" 
              size={24} 
              color={currentMonth.getMonth() === new Date().getMonth() && 
                     currentMonth.getFullYear() === new Date().getFullYear() 
                     ? colors.textSecondary : colors.accent} 
            />
          </TouchableOpacity>
        </View>

        <View style={styles.calendarContainer}>
          <View style={styles.dayNamesRow}>
            {DAY_NAMES.map((day, index) => (
              <View key={`day-name-${index}`} style={styles.dayNameCell}>
                <Text style={[styles.dayNameText, { color: colors.textSecondary }]}>{day}</Text>
              </View>
            ))}
          </View>
          
          {/* Calendar grid */}
          {monthGrid.map((week, weekIndex) => (
            <View key={`week-${weekIndex}`} style={styles.weekRow}>
              {week.map((date, dayIndex) => {
                const count = getCompletionCount(date);
                const color = getColorForCount(count, isDark);
                const isTodayDate = isToday(date);
                const isCurrentMonthDate = isCurrentMonth(date);
                const isSelectedDate = isSelected(date);
                
                return (
                  <TouchableOpacity
                    key={`day-${weekIndex}-${dayIndex}`}
                    style={[
                      styles.dayCell,
                      { backgroundColor: color },
                      !isCurrentMonthDate && styles.dayCellOtherMonth,
                      isSelectedDate && [styles.dayCellSelected, { borderColor: colors.accent }],
                    ]}
                    onPress={() => setSelectedDate(date)}
                  >
                    <Text style={[
                      styles.dayCellText,
                      { color: colors.text },
                      !isCurrentMonthDate && { opacity: 0.4 },
                      count > 0 && styles.dayCellTextWithData,
                    ]}>
                      {date.getDate()}
                    </Text>
                    {isTodayDate && <View style={[styles.todayIndicator, { backgroundColor: colors.accent }]} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        <View style={styles.legend}>
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Less</Text>
          <View style={[styles.legendBox, { backgroundColor: getColorForCount(0, isDark) }]} />
          <View style={[styles.legendBox, { backgroundColor: getColorForCount(1, isDark) }]} />
          <View style={[styles.legendBox, { backgroundColor: getColorForCount(2, isDark) }]} />
          <View style={[styles.legendBox, { backgroundColor: getColorForCount(3, isDark) }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>More</Text>
        </View>

        <View style={[styles.challengesSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.challengesSectionTitle, { color: colors.text }]}>{formatSelectedDate()}</Text>

          {viewMode === 'challenges' ? (
            // Challenges view
            challengesForSelectedDate.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>No check-ins on this day</Text>
              </View>
            ) : (
              <View style={styles.challengesList}>
                {challengesForSelectedDate.map(({ challenge, checkIn }) => (
                  <View key={checkIn.id} style={[styles.challengeItem, { backgroundColor: colors.card, borderColor: colors.dividerLineTodo + '50' }]}>
                    <View style={styles.challengeItemIcon}>
                      <Ionicons
                        name={checkIn.status === 'completed' ? 'checkmark-circle' : 'ellipse-outline'}
                        size={24}
                        color={checkIn.status === 'completed' ? '#4CAF50' : colors.textSecondary}
                      />
                    </View>
                    <View style={styles.challengeItemContent}>
                      <Text style={[styles.challengeItemTitle, { color: colors.text }]}>{challenge.title}</Text>
                      <Text style={[styles.challengeItemSubtitle, { color: colors.textSecondary }]}>
                        {checkIn.status === 'completed' ? 'Completed' : 'Pending'}
                        {(() => {
                          const raw = checkIn.createdAt;
                          if (!raw) return '';
                          const date = raw instanceof Date ? raw
                            : typeof raw === 'number' ? new Date(raw)
                            : (raw as any)?.toMillis ? new Date((raw as any).toMillis())
                            : new Date(raw as any);
                          return ` • ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
                        })()}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )
          ) : (
            // Pictures view — chat-style cards with full-screen viewer
            (() => {
              const photos = getPhotosForDate(selectedDate);
              if (photos.length === 0) {
                return (
                  <View style={styles.emptyState}>
                    <Ionicons name="images-outline" size={48} color={colors.textSecondary} />
                    <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>No photos on this day</Text>
                  </View>
                );
              }
              return (
                <View style={styles.photoList}>
                  {photos.map((photo, idx) => (
                    <View key={idx} style={[styles.photoCard, { backgroundColor: colors.card, borderColor: colors.dividerLineTodo + '50' }]}>
                      <View style={styles.photoCardHeader}>
                        <Ionicons name="trophy" size={16} color={colors.accent} />
                        <Text style={[styles.photoCardTitle, { color: colors.accent }]} numberOfLines={1}>{photo.challengeTitle}</Text>
                      </View>
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => setViewerImage(photo.uri)}
                        style={styles.photoImageTouchable}
                      >
                        <Image source={{ uri: photo.uri }} style={styles.photoImage} resizeMode="cover" />
                      </TouchableOpacity>
                      <Text style={[styles.photoTime, { color: colors.textSecondary }]}>
                        {(() => {
                          const raw = photo.checkIn.createdAt;
                          if (!raw) return '';
                          const date = raw instanceof Date ? raw
                            : typeof raw === 'number' ? new Date(raw)
                            : (raw as any)?.toMillis ? new Date((raw as any).toMillis())
                            : new Date(raw as any);
                          return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                        })()}
                      </Text>
                    </View>
                  ))}
                </View>
              );
            })()
          )}

          {/* Full-screen image viewer modal */}
          <Modal
            visible={!!viewerImage}
            transparent
            animationType="fade"
            onRequestClose={() => setViewerImage(null)}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={styles.imageModalOverlay}
              onPress={() => setViewerImage(null)}
            >
              <View style={styles.imageModalContent}>
                <TouchableOpacity
                  style={styles.imageModalClose}
                  onPress={() => setViewerImage(null)}
                  hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                >
                  <Ionicons name="close" size={32} color="#FFF" />
                </TouchableOpacity>
                {viewerImage && (
                  <Image
                    source={{ uri: viewerImage }}
                    style={styles.imageModalImage}
                    resizeMode="contain"
                  />
                )}
              </View>
            </TouchableOpacity>
          </Modal>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  picturesButton: {
    position: 'absolute',
    left: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  picturesButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  todayButton: {
    position: 'absolute',
    right: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  todayButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  filterContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
    zIndex: 1000,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  dropdownText: {
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 48,
    left: 20,
    right: 20,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    maxHeight: 300,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  dropdownItemSelected: {},
  dropdownItemText: {
    fontSize: 16,
    flex: 1,
  },
  dropdownItemTextSelected: {
    fontWeight: '600',
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 4,
  },
  monthText: {
    fontSize: 20,
    fontWeight: '700',
  },
  navButton: {
    padding: 8,
    minWidth: 40,
    alignItems: 'center',
  },
  calendarContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
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
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 3,
    height: 36,
  },
  dayCell: {
    flex: 1,
    marginHorizontal: 2,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayCellOtherMonth: {
    opacity: 0.3,
  },
  dayCellSelected: {
    borderWidth: 2,
  },
  dayCellText: {
    fontSize: 10,
    fontWeight: '600',
  },
  dayCellTextOtherMonth: {},
  dayCellTextWithData: {},
  todayIndicator: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 4,
    gap: 3,
  },
  legendText: {
    fontSize: 10,
    marginHorizontal: 2,
  },
  legendBox: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginHorizontal: 2,
  },
  challengesSection: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 80,
    minHeight: 1000,
    marginTop: 8,
  },
  challengesSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    marginTop: 12,
  },
  challengesList: {
    gap: 12,
    paddingBottom: 40,
  },
  challengeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  challengeItemIcon: {
    marginRight: 12,
  },
  challengeItemContent: {
    flex: 1,
  },
  challengeItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  challengeItemSubtitle: {
    fontSize: 14,
  },
  photoList: {
    gap: 12,
    paddingBottom: 40,
  },
  photoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  photoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  photoCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  photoImageTouchable: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: 280,
    borderRadius: 12,
  },
  photoTime: {
    fontSize: 11,
    marginTop: 8,
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContent: {
    width: Dimensions.get('window').width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  imageModalImage: {
    width: Dimensions.get('window').width,
    height: '80%',
  },
});
