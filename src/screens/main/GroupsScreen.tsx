import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Theme } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface GroupsScreenProps {
  navigation: any;
}

export const GroupsScreen: React.FC<GroupsScreenProps> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons name="people" size={48} color={Theme.colors.secondary} />
          <Text style={styles.title}>Groups</Text>
          <Text style={styles.subtitle}>Manage your accountability groups</Text>
        </View>
        
        <View style={styles.placeholder}>
          <Ionicons name="construct-outline" size={64} color={Theme.colors.gray500} />
          <Text style={styles.placeholderText}>Groups Screen</Text>
          <Text style={styles.placeholderSubtext}>Coming soon...</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.layout.screenPadding,
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
    color: Theme.colors.text,
  },
  
  subtitle: {
    ...Theme.typography.bodySmall,
    textAlign: 'center',
    color: Theme.colors.textSecondary,
  },
  
  placeholder: {
    alignItems: 'center',
  },
  
  placeholderText: {
    ...Theme.typography.h3,
    marginTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.sm,
    color: Theme.colors.textSecondary,
  },
  
  placeholderSubtext: {
    ...Theme.typography.bodySmall,
    color: Theme.colors.textTertiary,
  },
}); 