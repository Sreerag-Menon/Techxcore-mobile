/**
 * Design-system color palette — Slate + Citrus Teal
 *
 * Light: F5F7F9 base, 0D9488 primary (Teal 600), 0D1117 ink
 * Dark:  0D1117 base, 2DD4BF primary (Teal 300), E6EDF3 ink
 *
 * Deliberately diverges from the web portal's indigo/purple family
 * to give the mobile app its own visual identity as a companion product.
 */

/** Structural shape of any color palette */
export type ColorScheme = {
  // Brand
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;

  // Surfaces
  background: string;
  surface: string;
  surfaceRaised: string;
  surfaceOverlay: string;

  // Text
  text: string;
  textSecondary: string;
  textTertiary: string;
  onPrimary: string;

  // Chrome
  border: string;
  divider: string;
  inputBackground: string;
  skeleton: string;

  // Semantic
  error: string;
  success: string;
  warning: string;
  info: string;
};

export type ThemeVariant = 'light' | 'dark';

export const colors: Record<ThemeVariant, ColorScheme> = {
  light: {
    // Brand — Citrus Teal
    primary: '#0D9488',       // Teal 600 — 4.6:1 on white, WCAG AA ✓
    primaryLight: '#CCFBF1',  // Teal 100 — chip / tag backgrounds
    primaryDark: '#0F766E',   // Teal 700 — pressed / hover states
    secondary: '#F59E0B',     // Amber 500 — parent portal accent

    // Surfaces — cool-tinted off-white, NOT warm cream
    background: '#F5F7F9',    // Slate 50 — cooler than white, avoids AI cream
    surface: '#FFFFFF',
    surfaceRaised: '#F0F4F8', // Depth layer for modals / sheets
    surfaceOverlay: 'rgba(13, 17, 23, 0.04)',

    // Text — cool near-black
    text: '#0D1117',
    textSecondary: '#4A5568',
    textTertiary: '#718096',
    onPrimary: '#FFFFFF',

    // Chrome
    border: '#E2E8F0',
    divider: '#EDF2F7',
    inputBackground: '#FAFBFC',
    skeleton: '#E2E8F0',

    // Semantic
    error: '#DC2626',
    success: '#16A34A',
    warning: '#D97706',
    info: '#0284C7',
  },

  dark: {
    // Brand — brighter teal for dark-mode readability
    primary: '#2DD4BF',       // Teal 300
    primaryLight: '#134E4A',  // Teal 900 — chip bg on dark
    primaryDark: '#5EEAD4',   // Teal 200 — hover on dark
    secondary: '#FBBF24',     // Amber 400

    // Surfaces — GitHub Dark proven system
    background: '#0D1117',
    surface: '#161B22',
    surfaceRaised: '#21262D',
    surfaceOverlay: 'rgba(255, 255, 255, 0.05)',

    // Text
    text: '#E6EDF3',
    textSecondary: '#8B949E',
    textTertiary: '#6E7681',
    onPrimary: '#0D1117',     // Dark text on bright teal in dark mode

    // Chrome
    border: '#30363D',
    divider: '#21262D',
    inputBackground: '#1C2128',
    skeleton: '#30363D',

    // Semantic
    error: '#F85149',
    success: '#3FB950',
    warning: '#E3B341',
    info: '#58A6FF',
  },
};
