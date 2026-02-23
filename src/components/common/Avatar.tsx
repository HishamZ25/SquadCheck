import React from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ImageStyle,
  TouchableOpacity,
} from 'react-native';
import { Theme } from '../../constants/theme';
import { DicebearService } from '../../services/dicebearService';

interface AvatarProps {
  source?: string | null;
  initials?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  style?: ViewStyle | ImageStyle;
  textStyle?: TextStyle;
  onPress?: () => void;
}

export const Avatar: React.FC<AvatarProps> = ({
  source,
  initials,
  size = 'md',
  style,
  textStyle,
  onPress,
}) => {
  const avatarSize = Theme.layout.avatarSize[size];
  const fontSize = size === 'xl' ? 32 : size === 'lg' ? 24 : size === 'md' ? 18 : 14;

  if (source) {
    const imageComponent = (
      <Image
        source={{ uri: source }}
        style={[
          styles.image,
          { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
          style as ImageStyle,
        ]}
      />
    );

    return onPress ? (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {imageComponent}
      </TouchableOpacity>
    ) : imageComponent;
  }

  // Generate Dicebear avatar if no custom photo and we have initials
  if (initials) {
    const dicebearUrl = DicebearService.generateAvatarUrl(initials, avatarSize);

    // If Dicebear returns empty string, use fallback UI
    if (!dicebearUrl) {
      const fallbackComponent = (
        <View
          style={[
            styles.container,
            { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
            style as ViewStyle,
          ]}
        >
          <Text style={[styles.initials, { fontSize }, textStyle]}>
            {initials}
          </Text>
        </View>
      );

      return onPress ? (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
          {fallbackComponent}
        </TouchableOpacity>
      ) : fallbackComponent;
    }

    // Use Dicebear PNG URL
    return (
      <Image
        source={{ uri: dicebearUrl }}
        style={[
          styles.image,
          { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
          style as ImageStyle,
        ]}
        resizeMode="cover"
        fadeDuration={0}
      />
    );
  }

  const finalFallbackComponent = (
    <View
      style={[
        styles.container,
        { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
        style as ViewStyle,
      ]}
    >
      <Text style={[styles.initials, { fontSize }, textStyle]}>
        {initials || '?'}
      </Text>
    </View>
  );

  return onPress ? (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      {finalFallbackComponent}
    </TouchableOpacity>
  ) : finalFallbackComponent;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  image: {
    resizeMode: 'cover',
  },

  initials: {
    color: Theme.colors.white,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
