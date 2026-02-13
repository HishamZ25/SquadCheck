import React, { createContext, useContext, useMemo, useState, ReactNode } from 'react';
import { Appearance } from 'react-native';

type Mode = 'light' | 'dark';

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
};

const ColorModeContext = createContext<ColorModeContextValue | undefined>(undefined);

export const ColorModeProvider = ({ children }: { children: ReactNode }) => {
  const system = Appearance.getColorScheme();
  const initialMode: Mode = system === 'dark' ? 'dark' : 'light';
  const [mode, setMode] = useState<Mode>(initialMode);

  const value = useMemo(
    () => ({
      mode,
      colors: palettes[mode],
      toggleMode: () => setMode((prev) => (prev === 'light' ? 'dark' : 'light')),
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

