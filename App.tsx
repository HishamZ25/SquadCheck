import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ColorModeProvider, useColorMode } from './src/theme/ColorModeContext';

function StatusBarThemed() {
  const { mode } = useColorMode();
  return <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />;
}

export default function App() {
  return (
    <ColorModeProvider>
      <StatusBarThemed />
      <AppNavigator />
    </ColorModeProvider>
  );
} 