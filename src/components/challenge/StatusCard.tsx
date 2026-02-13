import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { challengeEval, type UserStatus } from '../../utils/challengeEval';
import { CountdownTimer } from '../common/CountdownTimer';
import { useColorMode } from '../../theme/ColorModeContext';

interface StatusCardProps {
  status: UserStatus;
  currentCheckIn?: any; // The check-in data for completed status
  /** When status is pending, pass target date for live countdown */
  countdownTargetDate?: Date | null;
}

export const StatusCard: React.FC<StatusCardProps> = ({ status, currentCheckIn, countdownTargetDate }) => {
  const { colors } = useColorMode();
  const getStatusConfig = () => {
    switch (status.type) {
      case 'completed':
        return {
          backgroundColor: '#22C55E',
          icon: 'checkmark-circle' as const,
          title: 'Completed',
          subtitle: challengeEval.formatTimestamp(status.timestamp),
        };
      case 'pending':
        return {
          backgroundColor: '#FF6B35', // Orange for pending
          icon: 'time-outline' as const,
          title: 'Pending',
          subtitle: status.timeRemaining + ' left',
        };
      case 'missed':
        return {
          backgroundColor: '#6B7280',
          icon: 'ellipse-outline' as const,
          title: 'Missed',
          subtitle: 'Due at ' + status.missedAt,
        };
      case 'eliminated':
        return {
          backgroundColor: '#666',
          icon: 'skull-outline' as const,
          title: 'Eliminated',
          subtitle: status.strikes + ' strikes',
        };
    }
  };

  const config = getStatusConfig();
  const isCompleted = status.type === 'completed';
  const isPending = status.type === 'pending';
  const showCountdown = isPending && countdownTargetDate && countdownTargetDate.getTime() > Date.now();

  return (
    <View style={[
      styles.container,
      { backgroundColor: config.backgroundColor, borderWidth: 1, borderColor: colors.dividerLineTodo + '60' },
      isPending && styles.containerPending,
    ]}>
      {isPending ? (
        <>
          <Text style={styles.pendingTitle}>PENDING</Text>
          {showCountdown ? (
            <View style={styles.countdownWrap}>
              <CountdownTimer
                targetDate={countdownTargetDate}
                label=""
                numberColor="#FFF"
                labelColor="rgba(255,255,255,0.95)"
                size="small"
                showLabels={true}
                finishText="Time's up!"
              />
            </View>
          ) : (
            <Text style={styles.subtitle}>{config.subtitle}</Text>
          )}
        </>
      ) : (
        <>
          <View style={styles.header}>
            <Ionicons name={config.icon} size={24} color="#FFF" style={styles.icon} />
            <View style={styles.headerText}>
              <Text style={styles.title}>{config.title}</Text>
              <Text style={styles.subtitle}>{config.subtitle}</Text>
            </View>
          </View>
        </>
      )}
      
      {/* Show submission details when completed */}
      {isCompleted && currentCheckIn && (
        <View style={styles.submissionDetails}>
          {/* Show image if available */}
          {currentCheckIn.attachments && currentCheckIn.attachments.length > 0 && (
            <Image 
              source={{ uri: currentCheckIn.attachments[0].uri || currentCheckIn.attachments[0].url }} 
              style={styles.submissionImage} 
              resizeMode="cover"
            />
          )}
          
          {/* Show text/note if available */}
          {currentCheckIn.payload?.textValue && (
            <Text style={styles.submissionNote}>{currentCheckIn.payload.textValue}</Text>
          )}
          
          {/* Show number value if available */}
          {currentCheckIn.payload?.numberValue !== undefined && (
            <Text style={styles.submissionNote}>Value: {currentCheckIn.payload.numberValue}</Text>
          )}
          
          {/* Show timer if available */}
          {currentCheckIn.payload?.timerSeconds !== undefined && (
            <Text style={styles.submissionNote}>
              Time: {Math.floor(currentCheckIn.payload.timerSeconds / 60)}m {currentCheckIn.payload.timerSeconds % 60}s
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
  },
  containerPending: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  pendingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 10,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '500',
  },
  countdownWrap: {
    marginTop: 2,
  },
  
  submissionDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.3)',
  },
  
  submissionImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 8,
  },
  
  submissionNote: {
    fontSize: 13,
    color: '#FFF',
    fontWeight: '500',
    marginTop: 4,
  },
});
