import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../constants/theme';

type StoreCategory = 'profilePictures' | 'titles' | 'icons';

export const StoreScreen: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<StoreCategory | null>(null);

  const handleCategorySelect = (category: StoreCategory) => {
    setSelectedCategory(category);
  };

  const renderCategoryOptions = () => (
    <View style={styles.categoryOptionsContainer}>
      <TouchableOpacity
        style={[
          styles.categoryOption,
          selectedCategory === 'profilePictures' && styles.selectedCategoryOption
        ]}
        onPress={() => handleCategorySelect('profilePictures')}
      >
        <View style={styles.categoryHeader}>
          <Ionicons 
            name="image" 
            size={32} 
            color={selectedCategory === 'profilePictures' ? '#FF6B35' : '#9CA3AF'} 
          />
          <Text style={[
            styles.categoryTitle,
            selectedCategory === 'profilePictures' && styles.selectedCategoryTitle
          ]}>
            Profile Pictures
          </Text>
        </View>
        <Text style={styles.categorySubtitle}>
          Unlock new profile pictures to customize your avatar
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.categoryOption,
          selectedCategory === 'titles' && styles.selectedCategoryOption
        ]}
        onPress={() => handleCategorySelect('titles')}
      >
        <View style={styles.categoryHeader}>
          <Ionicons 
            name="text" 
            size={32} 
            color={selectedCategory === 'titles' ? '#FF6B35' : '#9CA3AF'} 
          />
          <Text style={[
            styles.categoryTitle,
            selectedCategory === 'titles' && styles.selectedCategoryTitle
          ]}>
            Titles
          </Text>
        </View>
        <Text style={styles.categorySubtitle}>
          Earn special titles to display under your name
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.categoryOption,
          selectedCategory === 'icons' && styles.selectedCategoryOption
        ]}
        onPress={() => handleCategorySelect('icons')}
      >
        <View style={styles.categoryHeader}>
          <Ionicons 
            name="star" 
            size={32} 
            color={selectedCategory === 'icons' ? '#FF6B35' : '#9CA3AF'} 
          />
          <Text style={[
            styles.categoryTitle,
            selectedCategory === 'icons' && styles.selectedCategoryTitle
          ]}>
            Icons
          </Text>
        </View>
        <Text style={styles.categorySubtitle}>
          Collect unique icons and badges for your profile
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.mainTitle}>Store</Text>
        <Text style={styles.mainSubtitle}>
          Browse and unlock new items for your profile
        </Text>

        {renderCategoryOptions()}
      </ScrollView>
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
    padding: Theme.spacing.md,
  },
  
  contentContainer: {
    paddingBottom: 90, // Account for tab bar
    flexGrow: 1,
  },
  
  mainTitle: {
    ...Theme.typography.h2,
    color: '#000000',
    textAlign: 'center',
    marginBottom: Theme.spacing.xs,
  },
  
  mainSubtitle: {
    ...Theme.typography.body,
    color: '#000000',
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
  },
  
  categoryOptionsContainer: {
    marginBottom: Theme.spacing.xl,
  },
  
  categoryOption: {
    backgroundColor: '#F5F5F5',
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  
  selectedCategoryOption: {
    borderColor: '#FF6B35',
    backgroundColor: '#F5F5F5',
  },
  
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  
  categoryTitle: {
    ...Theme.typography.h4,
    color: '#666666',
    fontWeight: '600',
    marginLeft: Theme.spacing.sm,
  },
  
  selectedCategoryTitle: {
    color: '#FF6B35',
  },
  
  categorySubtitle: {
    ...Theme.typography.body,
    color: '#000000',
    lineHeight: 20,
  },
});

