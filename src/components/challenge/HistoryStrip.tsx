import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { dateKeys } from '../../utils/dateKeys';

type CadenceUnit = "daily" | "weekly";

type CheckIn = {
  id: string;
  period: {
    unit: CadenceUnit;
    dayKey?: string;
    weekKey?: string;
  };
  payload: {
    booleanValue?: boolean;
    numberValue?: number;
    textValue?: string;
    timerSeconds?: number;
  };
  status: "completed" | "pending" | "missed" | "failed";
  attachments?: Array<{ type: "photo"|"screenshot"; uri: string }>;
  createdAt: number;
};

interface HistoryStripProps {
  cadenceUnit: CadenceUnit;
  weekStartsOn?: number;
  requiredCount?: number;
  myRecentCheckIns: CheckIn[];
  unitLabel?: string;
  navigation?: any;
  onDaySelected?: (dayKey: string) => void;
  challengeCreatedAt: Date | number;
}

export const HistoryStrip: React.FC<HistoryStripProps> = ({
  cadenceUnit,
  weekStartsOn = 1,
  requiredCount = 1,
  myRecentCheckIns,
  unitLabel,
  navigation,
  onDaySelected,
  challengeCreatedAt,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  const getPeriodKeys = () => {
    if (cadenceUnit === 'daily') {
      // Get 7 days starting from Sunday of the current week (with offset)
      const today = new Date();
      today.setDate(today.getDate() + (weekOffset * 7));
      
      // Find the Sunday of this week
      const dayOfWeek = today.getDay();
      const sunday = new Date(today);
      sunday.setDate(today.getDate() - dayOfWeek);
      
      // Generate 7 days from Sunday to Saturday
      const days = [];
      for (let i = 0; i < 7; i++) {
        const day = new Date(sunday);
        day.setDate(sunday.getDate() + i);
        days.push(dateKeys.getDayKey(day));
      }
      return days;
    } else {
      return dateKeys.getLastNWeeks(4, weekStartsOn);
    }
  };

  const canGoBack = () => {
    // Allow going back up to 12 weeks
    return weekOffset > -12;
  };

  const canGoForward = () => {
    // Can't go forward past the current week
    return weekOffset < 0;
  };

  const getCheckInsForPeriod = (periodKey: string): CheckIn[] => {
    return myRecentCheckIns.filter(ci => {
      if (cadenceUnit === 'daily') {
        return ci.period.dayKey === periodKey;
      } else {
        return ci.period.weekKey === periodKey;
      }
    });
  };

  const isValidChallengePeriod = (periodKey: string): boolean => {
    const creationDate = typeof challengeCreatedAt === 'number' 
      ? new Date(challengeCreatedAt) 
      : challengeCreatedAt;
    creationDate.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    if (cadenceUnit === 'daily') {
      const periodDate = new Date(periodKey);
      return periodDate >= creationDate && periodDate <= today;
    } else {
      const weekStart = dateKeys.parseKey(periodKey);
      return weekStart >= creationDate && weekStart <= today;
    }
  };

  const getPeriodStatus = (periodKey: string): 'completed' | 'partial' | 'missed' | 'empty' | 'invalid' => {
    if (!isValidChallengePeriod(periodKey)) {
      return 'invalid';
    }
    
    const checkIns = getCheckInsForPeriod(periodKey);
    const completedCount = checkIns.filter(ci => ci.status === 'completed').length;

    if (cadenceUnit === 'daily') {
      if (completedCount > 0) return 'completed';
      
      const periodDate = new Date(periodKey);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      return periodDate < today ? 'missed' : 'empty';
    } else {
      if (completedCount >= requiredCount) return 'completed';
      if (completedCount > 0) return 'partial';
      
      const currentWeekKey = dateKeys.getWeekKey(new Date(), weekStartsOn);
      return periodKey < currentWeekKey ? 'missed' : 'empty';
    }
  };

  const getStatusConfig = (status: 'completed' | 'partial' | 'missed' | 'empty' | 'invalid') => {
    switch (status) {
      case 'completed':
        return { backgroundColor: '#4CAF50', icon: 'checkmark' as const, textColor: '#FFF' };
      case 'partial':
        return { backgroundColor: '#FF9800', icon: 'remove' as const, textColor: '#FFF' };
      case 'missed':
        return { backgroundColor: '#F44336', icon: 'close' as const, textColor: '#FFF' };
      case 'empty':
        return { backgroundColor: '#F0F0F0', icon: null, textColor: '#999' };
      case 'invalid':
        return { backgroundColor: '#E0E0E0', icon: null, textColor: '#CCC' };
    }
  };

  const formatDayLabel = (periodKey: string): { dayName: string; dayNumber: number } => {
    const date = dateKeys.parseKey(periodKey);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return {
      dayName: days[date.getDay()],
      dayNumber: date.getDate(),
    };
  };

  const formatPeriodLabel = (periodKey: string): string => {
    if (cadenceUnit === 'daily') {
      const date = dateKeys.parseKey(periodKey);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } else {
      return dateKeys.formatWeekLabel(periodKey);
    }
  };

  const handlePeriodPress = (periodKey: string) => {
    if (onDaySelected) {
      // Call the callback to reload data for this day
      onDaySelected(periodKey);
    } else {
      // Fallback: open modal to show details
      setSelectedPeriod(periodKey);
      setModalVisible(true);
    }
  };

  const periodKeys = getPeriodKeys();

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>History</Text>
          
          {cadenceUnit === 'daily' && (
            <View style={styles.navigationRow}>
              <TouchableOpacity 
                style={[styles.navButton, !canGoBack() && styles.navButtonDisabled]}
                onPress={() => canGoBack() && setWeekOffset(weekOffset - 1)}
                disabled={!canGoBack()}
              >
                <Ionicons name="chevron-back" size={20} color={canGoBack() ? '#666' : '#CCC'} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.navButton, !canGoForward() && styles.navButtonDisabled]}
                onPress={() => canGoForward() && setWeekOffset(weekOffset + 1)}
                disabled={!canGoForward()}
              >
                <Ionicons name="chevron-forward" size={20} color={canGoForward() ? '#666' : '#CCC'} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.daysContainer}>
          {periodKeys.map(periodKey => {
            const status = getPeriodStatus(periodKey);
            const statusConfig = getStatusConfig(status);
            const checkIns = getCheckInsForPeriod(periodKey);

            if (cadenceUnit === 'daily') {
              const { dayName, dayNumber } = formatDayLabel(periodKey);
              const today = dateKeys.getDayKey(new Date());
              const isToday = periodKey === today;

              return (
                <TouchableOpacity
                  key={periodKey}
                  style={styles.dayItem}
                  onPress={() => handlePeriodPress(periodKey)}
                  activeOpacity={status === 'invalid' ? 1 : 0.7}
                  disabled={status === 'invalid'}
                >
                  <Text style={[styles.dayName, isToday && styles.todayDayName]}>
                    {dayName}
                  </Text>
                  <View style={[
                    styles.dayCircle,
                    { backgroundColor: statusConfig.backgroundColor },
                    isToday && styles.todayCircle,
                  ]}>
                    {statusConfig.icon ? (
                      <Ionicons name={statusConfig.icon} size={14} color={statusConfig.textColor} />
                    ) : (
                      <Text style={[styles.dayNumber, { color: statusConfig.textColor }]}>
                        {dayNumber}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            } else {
              // Weekly view (shouldn't render here but keep for completeness)
              const label = dateKeys.formatWeekLabel(periodKey);
              return (
                <TouchableOpacity
                  key={periodKey}
                  style={styles.weekItem}
                  onPress={() => handlePeriodPress(periodKey)}
                  activeOpacity={status === 'invalid' ? 1 : 0.7}
                  disabled={status === 'invalid'}
                >
                  <View style={[styles.weekCircle, { backgroundColor: statusConfig.backgroundColor }]}>
                    {statusConfig.icon ? (
                      <Ionicons name={statusConfig.icon} size={16} color={statusConfig.textColor} />
                    ) : (
                      <Text style={[styles.weekLabel, { color: statusConfig.textColor }]}>W</Text>
                    )}
                  </View>
                  <Text style={styles.weekText} numberOfLines={1}>{label}</Text>
                  {status === 'partial' && (
                    <Text style={styles.weekCount}>
                      {checkIns.filter(ci => ci.status === 'completed').length}/{requiredCount}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            }
          })}
        </View>
      </View>

      {/* Modal for Period Details */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            {selectedPeriod && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {formatPeriodLabel(selectedPeriod)}
                  </Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                {getCheckInsForPeriod(selectedPeriod).length > 0 ? (
                  <ScrollView style={styles.checkInsList}>
                    {getCheckInsForPeriod(selectedPeriod).map(checkIn => (
                      <View key={checkIn.id} style={styles.checkInItem}>
                        <View style={styles.checkInHeader}>
                          <Text style={styles.checkInTime}>
                            {new Date(checkIn.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                          <View
                            style={[
                              styles.checkInStatusBadge,
                              {
                                backgroundColor:
                                  checkIn.status === 'completed'
                                    ? '#E8F5E9'
                                    : checkIn.status === 'failed'
                                    ? '#FFEBEE'
                                    : '#FFF9C4',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.checkInStatusText,
                                {
                                  color:
                                    checkIn.status === 'completed'
                                      ? '#4CAF50'
                                      : checkIn.status === 'failed'
                                      ? '#F44336'
                                      : '#F57C00',
                                },
                              ]}
                            >
                              {checkIn.status}
                            </Text>
                          </View>
                        </View>

                        {checkIn.payload.numberValue !== undefined && (
                          <Text style={styles.checkInPayload}>
                            Value: {checkIn.payload.numberValue} {unitLabel || ''}
                          </Text>
                        )}
                        {checkIn.payload.timerSeconds !== undefined && (
                          <Text style={styles.checkInPayload}>
                            Time: {Math.floor(checkIn.payload.timerSeconds / 60)} minutes
                          </Text>
                        )}
                        {checkIn.payload.textValue && (
                          <Text style={styles.checkInPayload} numberOfLines={3}>
                            "{checkIn.payload.textValue}"
                          </Text>
                        )}

                        {checkIn.attachments && checkIn.attachments.length > 0 && (
                          <View style={styles.attachmentsRow}>
                            <Ionicons name="image" size={16} color="#4CAF50" />
                            <Text style={styles.attachmentsText}>
                              {checkIn.attachments.length} attachment{checkIn.attachments.length > 1 ? 's' : ''}
                            </Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="calendar-outline" size={48} color="#E0E0E0" />
                    <Text style={styles.emptyText}>No check-ins for this period</Text>
                  </View>
                )}
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },

  navigationRow: {
    flexDirection: 'row',
    gap: 8,
  },

  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  navButtonDisabled: {
    backgroundColor: '#F9F9F9',
  },

  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  dayItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 45,
    minHeight: 60,
  },

  dayName: {
    fontSize: 10,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },

  todayDayName: {
    color: '#FF6B35',
    fontWeight: '700',
  },

  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  todayCircle: {
    borderWidth: 2,
    borderColor: '#FF6B35',
  },

  dayNumber: {
    fontSize: 14,
    fontWeight: '700',
  },

  weekItem: {
    alignItems: 'center',
    gap: 4,
    minWidth: 50,
  },

  weekCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  weekLabel: {
    fontSize: 14,
    fontWeight: '700',
  },

  weekText: {
    fontSize: 9,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },

  weekCount: {
    fontSize: 9,
    color: '#FF6B35',
    fontWeight: '700',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },

  checkInsList: {
    maxHeight: 400,
  },

  checkInItem: {
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },

  checkInHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  checkInTime: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },

  checkInStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },

  checkInStatusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },

  checkInPayload: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },

  attachmentsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },

  attachmentsText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },

  emptyText: {
    fontSize: 15,
    color: '#999',
    marginTop: 12,
  },
});
