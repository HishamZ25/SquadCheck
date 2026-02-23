import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../constants/theme';
import { useNavigation } from '@react-navigation/native';
import { useColorMode } from '../../theme/ColorModeContext';

type GroupType = 'elimination' | 'deadline' | 'progress';

export const GroupTypeScreen: React.FC = ({ route }: any) => {
  const { colors } = useColorMode();
  const navigation = useNavigation();
  const [selectedType, setSelectedType] = useState<GroupType | null>(null);
  const isSolo = route?.params?.isSolo || false;
  const groupId = route?.params?.groupId;

  const handleTypeSelect = (type: GroupType) => {
    setSelectedType(type);
  };

  const handleContinue = () => {
    if (!selectedType) {
      Alert.alert('Error', 'Please select a challenge type');
      return;
    }

    // Navigate to CreateChallengeScreen
    (navigation as any).navigate('CreateChallenge', { 
      challengeType: selectedType,
      isSolo: isSolo,
      groupId: groupId
    });
  };

  const renderTypeOptions = () => (
    <View style={styles.typeOptionsContainer}>
      <TouchableOpacity
        style={[
          styles.typeOption,
          { backgroundColor: colors.surface },
          selectedType === 'elimination' && [styles.selectedTypeOption, { backgroundColor: colors.surface }]
        ]}
        onPress={() => handleTypeSelect('elimination')}
      >
        <View style={styles.typeHeader}>
          <Ionicons
            name="close-circle"
            size={32}
            color={selectedType === 'elimination' ? colors.accent : colors.textSecondary}
          />
          <Text style={[
            styles.typeTitle,
            { color: colors.textSecondary },
            selectedType === 'elimination' && { color: colors.accent }
          ]}>
            Elimination
          </Text>
        </View>
        <Text style={[styles.typeSubtitle, { color: colors.textSecondary }]}>
          A competition with no deadline where a user is eliminated if they miss 1 requirement
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.typeOption,
          { backgroundColor: colors.surface },
          selectedType === 'deadline' && [styles.selectedTypeOption, { backgroundColor: colors.surface }]
        ]}
        onPress={() => handleTypeSelect('deadline')}
      >
        <View style={styles.typeHeader}>
          <Ionicons
            name="time"
            size={32}
            color={selectedType === 'deadline' ? colors.accent : colors.textSecondary}
          />
          <Text style={[
            styles.typeTitle,
            { color: colors.textSecondary },
            selectedType === 'deadline' && { color: colors.accent }
          ]}>
            Deadline
          </Text>
        </View>
        <Text style={[styles.typeSubtitle, { color: colors.textSecondary }]}>
          Set a deadline goal and date and have users post daily updates to their progress. Winners get a share of the reward
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.typeOption,
          { backgroundColor: colors.surface },
          selectedType === 'progress' && [styles.selectedTypeOption, { backgroundColor: colors.surface }]
        ]}
        onPress={() => handleTypeSelect('progress')}
      >
        <View style={styles.typeHeader}>
          <Ionicons
            name="trending-up"
            size={32}
            color={selectedType === 'progress' ? colors.accent : colors.textSecondary}
          />
          <Text style={[
            styles.typeTitle,
            { color: colors.textSecondary },
            selectedType === 'progress' && { color: colors.accent }
          ]}>
            Progress
          </Text>
        </View>
        <Text style={[styles.typeSubtitle, { color: colors.textSecondary }]}>
          A challenge where the requirements increase at regular intervals
        </Text>
      </TouchableOpacity>
    </View>
  );


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.mainTitle, { color: colors.text }]}>Choose Challenge Type</Text>
          <View style={styles.placeholder} />
        </View>

        <Text style={[styles.mainSubtitle, { color: colors.textSecondary }]}>
          Select the type of challenge you want to create
        </Text>

        {renderTypeOptions()}
      </ScrollView>

      {selectedType && (
        <View style={[styles.bottomContainer, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.continueButton, { backgroundColor: colors.accent }]}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>
              Continue to Challenge Setup
            </Text>
            <Ionicons name="arrow-forward" size={20} color={Theme.colors.white} />
          </TouchableOpacity>
        </View>
      )}
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
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#F1F0ED',
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: 8,
  },
  placeholder: {
    width: 48,
  },
  content: {
    flex: 1,
    padding: Theme.spacing.md,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    flex: 1,
  },
  
  mainSubtitle: {
    ...Theme.typography.body,
    color: '#666666',
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
  },
  
  typeOptionsContainer: {
    marginBottom: Theme.spacing.xl,
  },
  
  typeOption: {
    backgroundColor: '#F5F5F5',
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  
  selectedTypeOption: {
    borderColor: '#FF6B35',
    backgroundColor: '#F5F5F5',
  },
  
  typeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  
  typeTitle: {
    ...Theme.typography.h4,
    color: '#666666',
    fontWeight: '600',
    marginLeft: Theme.spacing.sm,
  },
  
  selectedTypeTitle: {
    color: '#FF6B35',
  },
  
  typeSubtitle: {
    ...Theme.typography.body,
    color: '#666666',
    lineHeight: 20,
  },
  
  bottomContainer: {
    padding: Theme.spacing.md,
    backgroundColor: '#F1F0ED',
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
    color: '#FFFFFF',
    fontWeight: '600',
    marginRight: Theme.spacing.sm,
  },
}); 