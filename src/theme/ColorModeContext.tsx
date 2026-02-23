import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Mode = 'light' | 'dark';

const COLOR_MODE_KEY = '@squadcheck_color_mode';

type Palette = {
  background: string;
  surface: string;
  card: string;
  text: string;
  textSecondary: string;
  dividerLineTodo: string;
  dividerLineFinished: string;
  accent: string;
};

const palettes: Record<Mode, Palette> = {
  light: {
    background: '#F5F3F0',
    surface: '#FFFFFF',
    card: '#FFF9F5',
    text: '#111827',
    textSecondary: '#6B7280',
    dividerLineTodo: 'rgba(255,107,53,0.55)',
    dividerLineFinished: 'rgba(34,197,94,0.55)',
    accent: '#FF6B35',
  },
  dark: {
    background: '#111827',
    surface: '#1F2937',
    card: '#111827',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    dividerLineTodo: 'rgba(255,159,112,0.8)',
    dividerLineFinished: 'rgba(74,222,128,0.8)',
    accent: '#FF6B35',
  },
};

type ColorModeContextValue = {
  mode: Mode;
  colors: Palette;
  toggleMode: () => void;
  setMode: (mode: Mode) => void;
};

const ColorModeContext = createContext<ColorModeContextValue | undefined>(undefined);

export const ColorModeProvider = ({ children }: { children: ReactNode }) => {
  const system = Appearance.getColorScheme();
  const initialMode: Mode = system === 'dark' ? 'dark' : 'light';
  const [mode, setModeState] = useState<Mode>(initialMode);

  // Load saved preference on mount
  useEffect(() => {
    AsyncStorage.getItem(COLOR_MODE_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark') {
        setModeState(saved);
      }
    }).catch(() => {});
  }, []);

  const setMode = (newMode: Mode) => {
    setModeState(newMode);
    AsyncStorage.setItem(COLOR_MODE_KEY, newMode).catch(() => {});
  };

  const value = useMemo(
    () => ({
      mode,
      colors: palettes[mode],
      toggleMode: () => setMode(mode === 'light' ? 'dark' : 'light'),
      setMode,
    }),
    [mode]
  );

  return <ColorModeContext.Provider value={value}>{children}</ColorModeContext.Provider>;
};

export const useColorMode = () => {
  const ctx = useContext(ColorModeContext);
  if (!ctx) {
    throw new Error('useColorMode must be used within ColorModeProvider');
  }
  return ctx;
};
