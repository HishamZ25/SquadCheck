import React from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  ImageStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../constants/theme';
import { DicebearService } from '../../services/dicebearService';

interface ProfileIconProps {
  imageUrl?: string;
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onPress?: () => void;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  isUnlocked?: boolean;
  isSelected?: boolean;
}

export const ProfileIcon: React.FC<ProfileIconProps> = ({
  imageUrl,
  fallbackIcon = 'person',
  size = 'md',
  onPress,
  style,
  imageStyle,
  rarity,
  isUnlocked = true,
  isSelected = false,
}) => {
  const iconSize = size === 'sm' ? 32 : size === 'md' ? 48 : size === 'lg' ? 64 : 96;
  const fallbackIconSize = size === 'sm' ? 16 : size === 'md' ? 24 : size === 'lg' ? 32 : 48;
  
  const getRarityColor = () => {
    switch (rarity) {
      case 'common': return '#9CA3AF'; // Gray
      case 'rare': return '#3B82F6';   // Blue
      case 'epic': return '#8B5CF6';   // Purple
      case 'legendary': return '#F59E0B'; // Gold
      default: return Theme.colors.border;
    }
  };

  const getRarityBorder = () => {
    if (!rarity || rarity === 'common') return null;
    
    return {
      borderWidth: 3,
      borderColor: getRarityColor(),
    };
  };

  const getSelectionBorder = () => {
    if (!isSelected) return null;
    
    return {
      borderWidth: 3,
      borderColor: Theme.colors.secondary,
    };
  };

  const getLockOverlay = () => {
    if (isUnlocked) return null;
    
    return (
      <View style={styles.lockOverlay}>
        <Ionicons name="lock-closed" size={fallbackIconSize / 2} color={Theme.colors.white} />
      </View>
    );
  };

  const IconContent = () => (
    <View style={[
      styles.container,
      {
        width: iconSize,
        height: iconSize,
        borderRadius: iconSize / 2,
        backgroundColor: isUnlocked ? Theme.colors.card : Theme.colors.gray600,
        ...getRarityBorder(),
        ...getSelectionBorder(),
      },
      style
    ]}>
      {imageUrl && isUnlocked ? (
        <Image
          source={{ uri: imageUrl }}
          style={[
            styles.image,
            { width: iconSize, height: iconSize, borderRadius: iconSize / 2 },
            imageStyle,
          ]}
          resizeMode="cover"
        />
      ) : isUnlocked ? (
        // Generate Dicebear avatar if no custom image
        <Image
          source={{ uri: DicebearService.generateAvatarUrl('User', iconSize) }}
          style={[
            styles.image,
            { width: iconSize, height: iconSize, borderRadius: iconSize / 2 },
            imageStyle,
          ]}
          resizeMode="cover"
        />
      ) : (
        <Ionicons 
          name={fallbackIcon} 
          size={fallbackIconSize} 
          color={Theme.colors.gray400} 
        />
      )}
      
      {getLockOverlay()}
      
      {isSelected && (
        <View style={styles.selectedIndicator}>
          <Ionicons name="checkmark-circle" size={fallbackIconSize / 2} color={Theme.colors.secondary} />
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <IconContent />
      </TouchableOpacity>
    );
  }

  return <IconContent />;
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadows.sm,
  },
  
  image: {
    resizeMode: 'cover',
  },
  
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  selectedIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: Theme.colors.background,
    borderRadius: 999,
    padding: 2,
  },
}); 