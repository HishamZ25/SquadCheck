export const Colors = {
  // Primary colors - Lighter dark grey theme
  primary: '#374151', // Medium dark grey
  primaryLight: '#4B5563',
  primaryDark: '#1F2937',
  
  // Secondary colors - Orange accents
  secondary: '#FF6B35', // Claude orange
  secondaryLight: '#FF8A65',
  secondaryDark: '#E55A2B',
  
  // Accent colors
  accent: '#FF8C42', // Light orange
  accentLight: '#FFA726',
  accentDark: '#F57C00',
  
  // Success/Error colors
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
  info: '#2196F3',
  
  // Neutral colors - Lighter dark theme
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  
  // Background colors - Lighter dark grey theme
  background: '#1F2937', // Dark grey (lighter than before)
  surface: '#374151', // Medium dark grey
  card: '#4B5563', // Lighter grey for cards
  
  // Text colors
  text: '#FFFFFF', // White text on dark background
  textSecondary: '#E6E6E6', // Light gray text
  textTertiary: '#B3B3B3', // Medium gray text
  
  // Border colors
  border: '#404040', // Dark gray borders
  borderLight: '#2D2D2D', // Very dark gray borders
  
  // Shadow colors
  shadow: 'rgba(0, 0, 0, 0.3)',
  shadowLight: 'rgba(0, 0, 0, 0.2)',
  
  // Status colors
  pending: '#FF9800',
  approved: '#4CAF50',
  rejected: '#F44336',
  aiVerified: '#9C27B0',
  
  // Special colors
  gold: '#FFD700', // For badges
  streak: '#FF6B35', // Orange for streak
  points: '#FF8C42', // Light orange for points
} as const; 