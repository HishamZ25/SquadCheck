import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../constants/theme';

type ChallengeType = "standard" | "progress" | "elimination" | "deadline";
type CadenceUnit = "daily" | "weekly";

interface ChallengeHeaderProps {
  title: string;
  groupName: string;
  groupId: string;
  cadence: {
    unit: CadenceUnit;
    requiredCount?: number;
  };
  type: ChallengeType;
  onBack: () => void;
  navigation?: any;
}

export const ChallengeHeader: React.FC<ChallengeHeaderProps> = ({
  title,
  groupName,
  groupId,
  cadence,
  type,
  onBack,
  navigation,
}) => {
  const getCadenceText = () => {
    if (cadence.unit === 'daily') {
      return 'Daily';
    } else {
      const count = cadence.requiredCount || 1;
      return `${count}x/week`;
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'progress':
        return 'Progress';
      case 'elimination':
        return 'Elimination';
      case 'deadline':
        return 'Deadline';
      default:
        return 'Standard';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text 
            style={styles.title} 
            numberOfLines={1} 
            adjustsFontSizeToFit 
            minimumFontScale={0.7}
          >
            {title}
          </Text>
          <TouchableOpacity 
            onPress={() => navigation && groupId && navigation.navigate('GroupChat', { groupId })}
            disabled={!navigation || !groupId}
            activeOpacity={0.7}
          >
            <Text 
              style={styles.metaText} 
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {groupName} • {getTypeLabel()} • {getCadenceText()}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.placeholder} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F1F0ED',
    paddingHorizontal: Theme.layout.screenPadding,
    paddingTop: 16,
    paddingBottom: 12,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },

  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },

  title: {
    ...Theme.typography.h2,
    color: '#FF6B35',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },

  metaText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 10,
  },

  placeholder: {
    width: 48,
  },
});
