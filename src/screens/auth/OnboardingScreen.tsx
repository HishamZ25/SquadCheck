import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Dimensions,
  ViewToken,
  TouchableOpacity,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '../../components/common/Button';
import { Pagination } from '../../components/common/Pagination';
import { RadialIntro } from '../../components/common/RadialIntro';
import { AnimatedBell } from '../../components/common/AnimatedBell';
import { AnimatedProgressGraph } from '../../components/common/AnimatedProgressGraph';
import { DicebearService } from '../../services/dicebearService';
import { RootStackParamList } from '../../navigation/AppNavigator';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type OnboardingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Onboarding'>;

interface OnboardingScreenProps {
  navigation: OnboardingScreenNavigationProp;
  route?: {
    params?: {
      fromSettings?: boolean;
    };
  };
}

interface OnboardingPage {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  color: string;
}

const SAMPLE_USERS = ['Alex', 'Jordan', 'Sam', 'Taylor', 'Morgan'];

const ONBOARDING_PAGES: OnboardingPage[] = [
  {
    id: '1',
    icon: 'people',
    title: 'Build Your Squad',
    description: 'Create or join groups with friends who share your goals and keep each other accountable.',
    color: '#FF6B35',
  },
  {
    id: '2',
    icon: 'trophy',
    title: 'Track Your Progress',
    description: 'Set challenges, check in daily, and watch your consistency streaks grow over time.',
    color: '#FF8A65',
  },
  {
    id: '3',
    icon: 'notifications',
    title: 'Stay Consistent',
    description: 'Get reminders, celebrate wins with your squad, and never miss a check-in again.',
    color: '#E55A2B',
  },
];

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation, route }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [orbitItems, setOrbitItems] = useState<any[]>([]);
  const [showBell, setShowBell] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const fromSettings = route?.params?.fromSettings || false;

  useEffect(() => {
    // Generate profile pictures for the radial intro
    const items = SAMPLE_USERS.map((username, index) => ({
      id: index + 1,
      src: DicebearService.generateAvatarUrl(username, 200),
    }));
    setOrbitItems(items);
    
    // Auto-expand after a short delay
    const timer = setTimeout(() => setExpanded(true), 500);
    return () => clearTimeout(timer);
  }, []);

  // Trigger graph animation when on page 2
  useEffect(() => {
    if (currentIndex === 1) {
      setShowGraph(false);
      const timer = setTimeout(() => setShowGraph(true), 300);
      return () => clearTimeout(timer);
    }
  }, [currentIndex]);

  // Trigger bell animation when on page 3
  useEffect(() => {
    if (currentIndex === 2) {
      setShowBell(false);
      const timer = setTimeout(() => setShowBell(true), 300);
      return () => clearTimeout(timer);
    }
  }, [currentIndex]);

  const handleIndexChange = (index: number) => {
    setCurrentIndex(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  const handleGetStarted = async () => {
    if (fromSettings) {
      // If accessed from settings, just go back
      navigation.goBack();
    } else {
      // If first-time onboarding, mark complete and go to Main
      try {
        await AsyncStorage.setItem('onboardingComplete', 'true');
        navigation.replace('Main');
      } catch (error) {
        if (__DEV__) console.error('Error saving onboarding completion:', error);
        navigation.replace('Main');
      }
    }
  };

  const handleSkip = async () => {
    await handleGetStarted();
  };

  const handleViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderPage = ({ item }: { item: OnboardingPage }) => {
    // First page uses RadialIntro
    if (item.id === '1') {
      return (
        <View style={styles.page}>
          {orbitItems.length > 0 && (
            <RadialIntro
              orbitItems={orbitItems}
              expanded={expanded}
              stageSize={280}
              imageSize={70}
              spinDuration={20}
              revealOnFanOut={false}
              onCenterPress={() => setExpanded(!expanded)}
            />
          )}
          <View style={[styles.pageContent, { marginTop: 40 }]}>
            <Text style={styles.pageTitle}>{item.title}</Text>
            <Text style={styles.pageDescription}>{item.description}</Text>
          </View>
        </View>
      );
    }
    
    // Second page uses animated progress graph
    if (item.id === '2') {
      return (
        <View style={styles.page}>
          <View style={[styles.iconCircle, { backgroundColor: `${item.color}15` }]}>
            <AnimatedProgressGraph size={140} shouldAnimate={showGraph} />
          </View>
          <View style={styles.pageContent}>
            <Text style={styles.pageTitle}>{item.title}</Text>
            <Text style={styles.pageDescription}>{item.description}</Text>
          </View>
        </View>
      );
    }
    
    // Third page uses animated bell
    if (item.id === '3') {
      return (
        <View style={styles.page}>
          <View style={[styles.iconCircle, { backgroundColor: `${item.color}15` }]}>
            <AnimatedBell size={80} color={item.color} shouldAnimate={showBell} />
          </View>
          <View style={styles.pageContent}>
            <Text style={styles.pageTitle}>{item.title}</Text>
            <Text style={styles.pageDescription}>{item.description}</Text>
          </View>
        </View>
      );
    }
    
    // Other pages use icon circles
    return (
      <View style={styles.page}>
        <View style={[styles.iconCircle, { backgroundColor: `${item.color}15` }]}>
          <Ionicons name={item.icon} size={80} color={item.color} />
        </View>
        <View style={styles.pageContent}>
          <Text style={styles.pageTitle}>{item.title}</Text>
          <Text style={styles.pageDescription}>{item.description}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.background} />
      <SafeAreaView style={styles.safeArea}>
        {/* Header with Skip button */}
        <View style={styles.header}>
          {fromSettings ? (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 60 }} />
          )}
          <Button
            title="Skip"
            onPress={handleSkip}
            variant="ghost"
            style={styles.skipButton}
          />
        </View>

        {/* Pages */}
        <FlatList
          ref={flatListRef}
          data={ONBOARDING_PAGES}
          renderItem={renderPage}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={handleViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          bounces={false}
          style={styles.flatList}
        />

        {/* Footer with Pagination and CTA */}
        <View style={styles.footer}>
          <Pagination
            activeIndex={currentIndex}
            totalItems={ONBOARDING_PAGES.length}
            inactiveColor="#E0E0E0"
            activeColor="#FFB399"
            currentColor="#FF6B35"
            dotSize={8}
            borderRadius={4}
            dotContainer={24}
            containerStyle={{ backgroundColor: 'transparent' }}
            onIndexChange={handleIndexChange}
          />

          <Button
            title={currentIndex === ONBOARDING_PAGES.length - 1 ? 'Get Started' : 'Next'}
            onPress={
              currentIndex === ONBOARDING_PAGES.length - 1
                ? handleGetStarted
                : () => handleIndexChange(currentIndex + 1)
            }
            fullWidth
            variant="secondary"
            style={styles.ctaButton}
          />
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F0ED',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F1F0ED',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  logo: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF6B35',
  },
  backButton: {
    width: 60,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  skipButton: {
    paddingHorizontal: 0,
    minWidth: 60,
  },
  flatList: {
    flex: 1,
  },
  page: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
  },
  pageContent: {
    alignItems: 'center',
    maxWidth: 320,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 16,
  },
  pageDescription: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    padding: 24,
    gap: 24,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  ctaButton: {
    minWidth: 200,
  },
});
