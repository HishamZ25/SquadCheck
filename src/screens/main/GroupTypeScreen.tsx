import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Theme } from '../../constants/theme';
import { useNavigation } from '@react-navigation/native';

type GroupType = 'elimination' | 'deadline' | 'progression';

interface GroupTypeConfig {
  type: GroupType;
  eliminationRule?: string;
  startDate?: Date;
  endDate?: Date;
  progressionDuration?: number; // in days
  intervalType?: string;
  assessmentTime?: Date;
}

export const GroupTypeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [selectedType, setSelectedType] = useState<GroupType | null>(null);
  const [config, setConfig] = useState<GroupTypeConfig>({
    type: 'elimination',
    assessmentTime: new Date(new Date().setHours(0, 0, 0, 0)), // Default to midnight
  });
  
  // Date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleTypeSelect = (type: GroupType) => {
    setSelectedType(type);
    setConfig(prev => ({ ...prev, type }));
  };

  const handleContinue = () => {
    if (!selectedType) {
      Alert.alert('Error', 'Please select a group type');
      return;
    }

    // Validate required fields based on type
    if (selectedType === 'elimination' && !config.eliminationRule?.trim()) {
      Alert.alert('Error', 'Please enter an elimination rule');
      return;
    }

    if (selectedType === 'deadline' && (!config.startDate || !config.endDate)) {
      Alert.alert('Error', 'Please select both start and end dates');
      return;
    }

    if (selectedType === 'progression' && (!config.progressionDuration || !config.intervalType?.trim())) {
      Alert.alert('Error', 'Please fill in all progression fields');
      return;
    }

    // Navigate to CreateGroupScreen with the config
    navigation.navigate('CreateGroup' as never);
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setConfig(prev => ({ ...prev, startDate: selectedDate }));
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      // Ensure end date is after start date
      if (config.startDate && selectedDate <= config.startDate) {
        Alert.alert('Invalid Date', 'End date must be after start date');
        return;
      }
      setConfig(prev => ({ ...prev, endDate: selectedDate }));
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setConfig(prev => ({ ...prev, assessmentTime: selectedTime }));
    }
  };

  const renderTypeOptions = () => (
    <View style={styles.typeOptionsContainer}>
      <TouchableOpacity
        style={[
          styles.typeOption,
          selectedType === 'elimination' && styles.selectedTypeOption
        ]}
        onPress={() => handleTypeSelect('elimination')}
      >
        <View style={styles.typeHeader}>
          <Ionicons 
            name="close-circle" 
            size={32} 
            color={selectedType === 'elimination' ? '#FF6B35' : '#9CA3AF'} 
          />
          <Text style={[
            styles.typeTitle,
            selectedType === 'elimination' && styles.selectedTypeTitle
          ]}>
            Elimination
          </Text>
        </View>
        <Text style={styles.typeSubtitle}>
          A competition with no deadline where a user is eliminated if they miss 1 requirement
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.typeOption,
          selectedType === 'deadline' && styles.selectedTypeOption
        ]}
        onPress={() => handleTypeSelect('deadline')}
      >
        <View style={styles.typeHeader}>
          <Ionicons 
            name="time" 
            size={32} 
            color={selectedType === 'deadline' ? '#FF6B35' : '#9CA3AF'} 
          />
          <Text style={[
            styles.typeTitle,
            selectedType === 'deadline' && styles.selectedTypeTitle
          ]}>
            Deadline
          </Text>
        </View>
        <Text style={styles.typeSubtitle}>
          Set a deadline goal and date and have users post daily updates to their progress. Winners get a share of the reward
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.typeOption,
          selectedType === 'progression' && styles.selectedTypeOption
        ]}
        onPress={() => handleTypeSelect('progression')}
      >
        <View style={styles.typeHeader}>
          <Ionicons 
            name="trending-up" 
            size={32} 
            color={selectedType === 'progression' ? '#FF6B35' : '#9CA3AF'} 
          />
          <Text style={[
            styles.typeTitle,
            selectedType === 'progression' && styles.selectedTypeTitle
          ]}>
            Progression
          </Text>
        </View>
        <Text style={styles.typeSubtitle}>
          A challenge where the requirements increase at regular intervals
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderEliminationConfig = () => (
    <View style={styles.configSection}>
      <Text style={styles.configTitle}>Elimination Rule</Text>
      <Text style={styles.configSubtitle}>
        Define what happens when a user misses a requirement
      </Text>
      <TouchableOpacity style={styles.textInput}>
        <Text style={styles.textInputText}>
          {config.eliminationRule || 'Enter elimination rule...'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderDeadlineConfig = () => (
    <View style={styles.configSection}>
      <Text style={styles.configTitle}>Challenge Timeline</Text>
      <Text style={styles.configSubtitle}>
        Set when the challenge starts and ends
      </Text>
      
              <View style={styles.dateRow}>
          <View style={styles.dateInput}>
            <Text style={styles.dateLabel}>Start Date</Text>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowStartDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {config.startDate ? config.startDate.toLocaleDateString() : 'Select start date'}
              </Text>
              <Ionicons name="calendar" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.dateInput}>
            <Text style={styles.dateLabel}>End Date</Text>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowEndDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {config.endDate ? config.endDate.toLocaleDateString() : 'Select end date'}
              </Text>
              <Ionicons name="calendar" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>
    </View>
  );

  const renderProgressionConfig = () => (
    <View style={styles.configSection}>
      <Text style={styles.configTitle}>Progression Settings</Text>
      
      <View style={styles.progressionRow}>
        <View style={styles.progressionInput}>
          <Text style={styles.progressionLabel}>Progression Duration</Text>
          <Text style={styles.progressionSubtitle}>
            Choose the amount of time between each interval progression
          </Text>
          <TouchableOpacity style={styles.numberInput}>
            <Text style={styles.numberInputText}>
              {config.progressionDuration || '7'} days
            </Text>
            <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.progressionInput}>
          <Text style={styles.progressionLabel}>Interval Type</Text>
          <Text style={styles.progressionSubtitle}>
            What needs to increase? Cardio done? Time spent coding?
          </Text>
          <TouchableOpacity style={styles.textInput}>
            <Text style={styles.textInputText}>
              {config.intervalType || 'Enter interval type...'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderAssessmentTime = () => (
    <View style={styles.configSection}>
      <Text style={styles.configTitle}>AI Assessment Time</Text>
      <Text style={styles.configSubtitle}>
        Choose when the AI will assess what users posted (default: midnight)
      </Text>
      <TouchableOpacity 
        style={styles.timeInput}
        onPress={() => setShowTimePicker(true)}
      >
        <Text style={styles.timeInputText}>
          {config.assessmentTime?.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          }) || '12:00 AM'}
        </Text>
        <Ionicons name="time" size={20} color="#9CA3AF" />
      </TouchableOpacity>
    </View>
  );

  const renderConfigOptions = () => {
    if (!selectedType) return null;

    return (
      <View style={styles.configContainer}>
        <Text style={styles.configHeaderTitle}>
          Configure {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Challenge
        </Text>
        
        {selectedType === 'elimination' && renderEliminationConfig()}
        {selectedType === 'deadline' && renderDeadlineConfig()}
        {selectedType === 'progression' && renderProgressionConfig()}
        
        {renderAssessmentTime()}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={Theme.colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create New Group</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.mainTitle}>Choose Group Type</Text>
        <Text style={styles.mainSubtitle}>
          Select the type of challenge you want to create
        </Text>

        {renderTypeOptions()}
        {renderConfigOptions()}
      </ScrollView>

      {selectedType && (
        <View style={styles.bottomContainer}>
          <TouchableOpacity 
            style={styles.continueButton}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>Continue to Group Setup</Text>
            <Ionicons name="arrow-forward" size={20} color={Theme.colors.white} />
          </TouchableOpacity>
        </View>
      )}

      {/* Date and Time Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={config.startDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleStartDateChange}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={config.endDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleEndDateChange}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={config.assessmentTime || new Date()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#212529',
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.layout.screenPadding,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    backgroundColor: '#374151',
  },
  
  backButton: {
    padding: Theme.spacing.sm,
  },
  
  headerTitle: {
    ...Theme.typography.h4,
    color: Theme.colors.white,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  
  headerPlaceholder: {
    width: 48,
  },
  
  content: {
    flex: 1,
    padding: Theme.spacing.md,
  },
  
  mainTitle: {
    ...Theme.typography.h2,
    color: Theme.colors.white,
    textAlign: 'center',
    marginBottom: Theme.spacing.xs,
  },
  
  mainSubtitle: {
    ...Theme.typography.body,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
  },
  
  typeOptionsContainer: {
    marginBottom: Theme.spacing.xl,
  },
  
  typeOption: {
    backgroundColor: '#374151',
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  
  selectedTypeOption: {
    borderColor: '#FF6B35',
    backgroundColor: '#374151',
  },
  
  typeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  
  typeTitle: {
    ...Theme.typography.h4,
    color: '#9CA3AF',
    fontWeight: '600',
    marginLeft: Theme.spacing.sm,
  },
  
  selectedTypeTitle: {
    color: '#FF6B35',
  },
  
  typeSubtitle: {
    ...Theme.typography.body,
    color: Theme.colors.textSecondary,
    lineHeight: 20,
  },
  
  configContainer: {
    backgroundColor: '#374151',
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.xl,
  },
  
  configHeaderTitle: {
    ...Theme.typography.h3,
    color: Theme.colors.white,
    textAlign: 'center',
    marginBottom: Theme.spacing.lg,
  },
  
  configSection: {
    marginBottom: Theme.spacing.lg,
  },
  
  configTitle: {
    ...Theme.typography.h4,
    color: Theme.colors.white,
    fontWeight: '600',
    marginBottom: Theme.spacing.xs,
  },
  
  configSubtitle: {
    ...Theme.typography.bodySmall,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.md,
    lineHeight: 18,
  },
  
  textInput: {
    backgroundColor: '#2D3748',
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: '#4B5563',
    minHeight: 50,
    justifyContent: 'center',
  },
  
  textInputText: {
    ...Theme.typography.body,
    color: Theme.colors.textSecondary,
  },
  
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Theme.spacing.sm,
  },
  
  dateInput: {
    flex: 1,
  },
  
  dateLabel: {
    ...Theme.typography.bodySmall,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.xs,
  },
  
  dateButton: {
    backgroundColor: '#2D3748',
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: '#4B5563',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 50,
  },
  
  dateButtonText: {
    ...Theme.typography.body,
    color: Theme.colors.textSecondary,
  },
  
  progressionRow: {
    gap: Theme.spacing.md,
  },
  
  progressionInput: {
    marginBottom: Theme.spacing.md,
  },
  
  progressionLabel: {
    ...Theme.typography.bodySmall,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.xs,
  },
  
  progressionSubtitle: {
    ...Theme.typography.caption,
    color: Theme.colors.textTertiary,
    marginBottom: Theme.spacing.sm,
    lineHeight: 16,
  },
  
  numberInput: {
    backgroundColor: '#2D3748',
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: '#4B5563',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  numberInputText: {
    ...Theme.typography.body,
    color: Theme.colors.textSecondary,
  },
  
  timeInput: {
    backgroundColor: '#2D3748',
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: '#4B5563',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  timeInputText: {
    ...Theme.typography.body,
    color: Theme.colors.white,
  },
  
  bottomContainer: {
    padding: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    backgroundColor: '#212529',
  },
  
  continueButton: {
    backgroundColor: '#FF6B35',
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadows.sm,
  },
  
  continueButtonText: {
    ...Theme.typography.button,
    color: Theme.colors.white,
    fontWeight: '600',
    marginRight: Theme.spacing.sm,
  },
}); 