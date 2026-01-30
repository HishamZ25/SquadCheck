import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../constants/theme';

interface GroupHeaderProps {
  name: string;
  onBack: () => void;
}

export const GroupHeader: React.FC<GroupHeaderProps> = ({
  name,
  onBack,
}) => {
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
            {name}
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F1F0ED',
    paddingTop: 8,
    paddingBottom: 12,
  },
  
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
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
  },
  
  placeholder: {
    width: 48,
  },
});
