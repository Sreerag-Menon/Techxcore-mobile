/**
 * Theme context.
 *
 * Provides the active color scheme and helpers to toggle or query the current theme.
 * Defaults to the system preference; the user's manual choice is persisted in AsyncStorage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';

import { APP_CONFIG } from '../constants/config';
import { colors, ColorScheme } from './colors';
import { spacing } from './spacing';
import { typography } from './typography';

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Theme {
  colors: ColorScheme;
  spacing: typeof spacing;
  typography: typeof typography;
}

export interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  isDark: boolean;
  /** Active color palette (shortcut for theme.colors) */
  colors: ColorScheme;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

// --------------------------------------------------------------------------
// Context
// --------------------------------------------------------------------------

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// --------------------------------------------------------------------------
// Provider
// --------------------------------------------------------------------------

export function ThemeProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const [mode, setMode] = useState<ThemeMode>('system');

  /** Load persisted preference on mount */
  useEffect(() => {
    AsyncStorage.getItem(APP_CONFIG.THEME_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setMode(saved);
        }
      })
      .catch(() => {/* ignore */});
  }, []);

  const isDark = useMemo((): boolean => {
    if (mode === 'system') return systemScheme === 'dark';
    return mode === 'dark';
  }, [mode, systemScheme]);

  const activeColors: ColorScheme = useMemo(
    () => (isDark ? colors.dark : colors.light),
    [isDark],
  );

  const theme: Theme = useMemo(
    () => ({ colors: activeColors, spacing, typography }),
    [activeColors],
  );

  const setThemeMode = useCallback((newMode: ThemeMode) => {
    setMode(newMode);
    AsyncStorage.setItem(APP_CONFIG.THEME_KEY, newMode).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeMode(isDark ? 'light' : 'dark');
  }, [isDark, setThemeMode]);

  const value: ThemeContextValue = useMemo(
    () => ({ theme, mode, isDark, colors: activeColors, toggleTheme, setThemeMode }),
    [theme, mode, isDark, activeColors, toggleTheme, setThemeMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// --------------------------------------------------------------------------
// Hook
// --------------------------------------------------------------------------

/**
 * Access the active theme inside any component.
 * Must be used within a `<ThemeProvider>`.
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
