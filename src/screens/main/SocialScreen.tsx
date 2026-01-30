import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Theme } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface SocialScreenProps {
  navigation: any;
}

export const SocialScreen: React.FC<SocialScreenProps> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons name="chatbubbles" size={48} color={Theme.colors.secondary} />
          <Text style={styles.title}>Social</Text>
          <Text style={styles.subtitle}>Connect with your accountability partners</Text>
        </View>
        
        <View style={styles.placeholder}>
          <Ionicons name="checkmark-circle-outline" size={48} color={Theme.colors.textSecondary} />
          <Text style={styles.placeholderText}>Coming soon...</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F0ED',
    position: 'relative',
  },
  
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.layout.screenPadding,
    paddingBottom: 90, // Account for tab bar
  },
  
  header: {
    alignItems: 'center',
    marginBottom: Theme.spacing.xxl,
  },
  
  title: {
    ...Theme.typography.h2,
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    textAlign: 'center',
    color: '#000000',
  },
  
  subtitle: {
    ...Theme.typography.bodySmall,
    textAlign: 'center',
    color: '#666666',
  },
  
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.xl * 2,
  },
  
  placeholderText: {
    ...Theme.typography.body,
    color: '#666666',
    marginTop: Theme.spacing.md,
    textAlign: 'center',
  },
});
