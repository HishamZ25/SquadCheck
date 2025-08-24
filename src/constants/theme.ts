import { Colors } from './colors';

export const Theme = {
  colors: Colors,
  
  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  // Border radius
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  
  // Shadows
  shadows: {
    sm: {
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    lg: {
      shadowColor: Colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    },
  },
  
  // Typography
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: 'bold',
      lineHeight: 40,
      color: Colors.text,
    },
    h2: {
      fontSize: 24,
      fontWeight: 'bold',
      lineHeight: 32,
      color: Colors.text,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 28,
      color: Colors.text,
    },
    h4: {
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 24,
      color: Colors.text,
    },
    body: {
      fontSize: 16,
      fontWeight: 'normal',
      lineHeight: 24,
      color: Colors.text,
    },
    bodySmall: {
      fontSize: 14,
      fontWeight: 'normal',
      lineHeight: 20,
      color: Colors.textSecondary,
    },
    caption: {
      fontSize: 12,
      fontWeight: 'normal',
      lineHeight: 16,
      color: Colors.textTertiary,
    },
    button: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 24,
      color: Colors.white,
    },
  },
  
  // Layout
  layout: {
    screenPadding: 16,
    cardPadding: 16,
    buttonHeight: 48,
    inputHeight: 48,
    avatarSize: {
      sm: 32,
      md: 48,
      lg: 64,
      xl: 96,
    },
  },
  
  // Animation
  animation: {
    duration: {
      fast: 200,
      normal: 300,
      slow: 500,
    },
    easing: {
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
    },
  },
} as const; 