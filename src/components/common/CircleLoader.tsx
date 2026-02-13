import React from 'react';
import { ActivityIndicator, ActivityIndicatorProps } from 'react-native';

interface CircleLoaderProps extends Partial<ActivityIndicatorProps> {
  size?: 'small' | 'large';
  dotColor?: string;
}

export const CircleLoader: React.FC<CircleLoaderProps> = ({
  size = 'small',
  dotColor = '#FF6B35',
  color,
  ...props
}) => {
  return (
    <ActivityIndicator 
      size={size} 
      color={color || dotColor} 
      {...props}
    />
  );
};
