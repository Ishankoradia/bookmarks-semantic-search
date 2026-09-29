import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors, amoledColors, type ColorScheme } from './colors';
import { getThemeMode, saveThemeMode } from '../lib/storage';

export type ThemeMode = 'system' | 'light' | 'dark' | 'amoled';

interface ThemeContextValue {
  colors: ColorScheme;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors,
  isDark: false,
  themeMode: 'system',
  setThemeMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');

  // Load the persisted preference on mount.
  useEffect(() => {
    getThemeMode().then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'amoled' || stored === 'system') {
        setThemeModeState(stored);
      }
    });
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    saveThemeMode(mode);
  };

  const value = useMemo<ThemeContextValue>(() => {
    const resolved = themeMode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : themeMode;
    const colors =
      resolved === 'amoled' ? amoledColors : resolved === 'dark' ? darkColors : lightColors;
    return {
      colors,
      isDark: resolved === 'dark' || resolved === 'amoled',
      themeMode,
      setThemeMode,
    };
  }, [themeMode, systemScheme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
