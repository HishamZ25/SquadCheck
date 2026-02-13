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

type GroupType = 'elimination' | 'deadline' | 'progression';

export const GroupTypeScreen: React.FC = ({ route }: any) => {
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
          selectedType === 'elimination' && styles.selectedTypeOption
        ]}
        onPress={() => handleTypeSelect('elimination')}
      >
        <View style={styles.typeHeader}>
          <Ionicons 
            name="close-circle" 
            size={32} 
            color={selectedType === 'elimination' ? '#FF6B35' : '#666666'} 
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
            color={selectedType === 'deadline' ? '#FF6B35' : '#666666'} 
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
            color={selectedType === 'progression' ? '#FF6B35' : '#666666'} 
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


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#000" />
          </TouchableOpacity>
          <Text style={styles.mainTitle}>Choose Challenge Type</Text>
          <View style={styles.placeholder} />
        </View>
        
        <Text style={styles.mainSubtitle}>
          Select the type of challenge you want to create
        </Text>

        {renderTypeOptions()}
      </ScrollView>

      {selectedType && (
        <View style={styles.bottomContainer}>
          <TouchableOpacity 
            style={styles.continueButton}
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