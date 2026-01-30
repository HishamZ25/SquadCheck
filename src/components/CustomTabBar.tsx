import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { TabBar, TabsType } from '@mindinventory/react-native-tab-bar-interaction';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const tabs: TabsType[] = [
    {
      name: 'Groups',
      activeIcon: (
        <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="people-outline" color="#FF6B35" size={20} />
        </View>
      ),
      inactiveIcon: <Ionicons name="people-outline" color="#FF6B35" size={25} />,
    },
    {
      name: 'Calendar',
      activeIcon: (
        <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="calendar-outline" color="#FF6B35" size={20} />
        </View>
      ),
      inactiveIcon: <Ionicons name="calendar-outline" color="#FF6B35" size={25} />,
    },
    {
      name: 'Home',
      activeIcon: (
        <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="home-outline" color="#FF6B35" size={20} />
        </View>
      ),
      inactiveIcon: <Ionicons name="home-outline" color="#FF6B35" size={25} />,
    },
    {
      name: 'Social',
      activeIcon: (
        <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="chatbubbles-outline" color="#FF6B35" size={20} />
        </View>
      ),
      inactiveIcon: <Ionicons name="chatbubbles-outline" color="#FF6B35" size={25} />,
    },
    {
      name: 'Store',
      activeIcon: (
        <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="storefront-outline" color="#FF6B35" size={20} />
        </View>
      ),
      inactiveIcon: <Ionicons name="storefront-outline" color="#FF6B35" size={25} />,
    },
  ];

  const activeIndex = state.index;
  
  // Calculate position for the semicircle border
  const tabWidth = SCREEN_WIDTH / 5;
  const circleX = tabWidth * activeIndex + tabWidth / 2;
  const circleRadius = 28;
  const borderWidth = 3;

  return (
    <View style={styles.outerContainer}>
      <View style={styles.tabBarContainer}>
        <TabBar
          tabs={tabs}
          containerWidth={SCREEN_WIDTH}
          tabBarContainerBackground="#F1F0ED"
          defaultActiveTabIndex={activeIndex}
          onTabChange={(tab: TabsType, index: number) => {
            const route = state.routes[index];
            const isFocused = state.index === index;

            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          }}
          containerTopLeftRadius={0}
          containerTopRightRadius={0}
          containerBottomLeftRadius={0}
          containerBottomRightRadius={0}
          circleFillColor="#FFFFFF"
          transitionSpeed={300}
        />
      </View>
      
      {/* Black border around selected circle - rendered after TabBar to be on top */}
      <View 
        style={[
          styles.circleBorder,
          { 
            left: circleX - circleRadius + 0.5, // Adjust slightly right to cover orange circle
          }
        ]} 
        pointerEvents="none"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabBarContainer: {
    position: 'relative',
    backgroundColor: '#F1F0ED',
  },
  circleBorder: {
    position: 'absolute',
    bottom: -1, // Extend slightly below tab bar
    width: 56, // 2 * circleRadius
    height: 58, // Slightly taller to cover bottom
    borderRadius: 29, // Match new height
    borderWidth: 2, // Match FAB border width
    borderColor: '#FF6B35',
    backgroundColor: 'transparent',
    zIndex: 1001, // Above the circle
    transform: [{ translateY: -28 }], // Shift up by radius to center on circle
  },
});

