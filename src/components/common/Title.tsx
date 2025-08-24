import React from 'react';
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { Theme } from '../../constants/theme';

interface TitleProps {
  text: string;
  color?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  fontFamily?: string;
  onPress?: () => void;
  style?: TextStyle;
  containerStyle?: ViewStyle;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

export const Title: React.FC<TitleProps> = ({
  text,
  color = Theme.colors.text,
  fontSize = 18,
  fontWeight = '600',
  fontFamily,
  onPress,
  style,
  containerStyle,
  rarity,
}) => {
  const getRarityShadow = () => {
    switch (rarity) {
      case 'common': return Theme.shadows.sm;
      case 'rare': return Theme.shadows.md;
      case 'epic': return Theme.shadows.lg;
      case 'legendary': return {
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
        elevation: 8,
      };
      default: return {};
    }
  };

  const titleStyle = [
    styles.title,
    {
      color,
      fontSize,
      fontWeight,
      fontFamily,
      ...getRarityShadow(),
    },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} style={containerStyle}>
        <Text style={titleStyle}>{text}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <Text style={[titleStyle, containerStyle]}>
      {text}
    </Text>
  );
};

const styles = StyleSheet.create({
  title: {
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
}); 