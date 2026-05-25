/** Design-system color palette for light and dark themes */

/** Structural shape of any color palette (keys only, values are plain strings) */
export type ColorScheme = {
  primary: string;
  primaryLight: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  error: string;
  success: string;
  warning: string;
  info: string;
};

export type ThemeVariant = 'light' | 'dark';

export const colors: Record<ThemeVariant, ColorScheme> = {
  light: {
    primary: '#4F46E5',
    primaryLight: '#EEF2FF',
    secondary: '#14B8A6',
    background: '#F9FAFB',
    surface: '#FFFFFF',
    text: '#111827',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    border: '#E5E7EB',
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
    info: '#3B82F6',
  },
  dark: {
    primary: '#818CF8',
    primaryLight: '#312E81',
    secondary: '#2DD4BF',
    background: '#111827',
    surface: '#1F2937',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    textTertiary: '#6B7280',
    border: '#374151',
    error: '#F87171',
    success: '#34D399',
    warning: '#FBBF24',
    info: '#60A5FA',
  },
};
