/**
 * Typography scale for consistent text styling across the app.
 * Font: Satoshi (loaded via expo-font from assets/fonts/).
 * Falls back to System font until fonts are loaded.
 */

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  display: 40,  // Auth screen headings
  hero: 48,     // Large display moments
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  black: '900',
} as const;

/**
 * Satoshi font family map.
 * Keys match the `fontFamily` names registered in useFonts().
 * `system` is the fallback for any component that hasn't loaded fonts yet.
 */
export const fontFamily = {
  regular: 'Satoshi-Regular',
  medium: 'Satoshi-Medium',
  semibold: 'Satoshi-Medium', // Satoshi doesn't have a semibold slice; medium is closest
  bold: 'Satoshi-Bold',
  black: 'Satoshi-Black',
  system: 'System',
} as const;

/** Line heights paired with the font-size scale (1.5× ratio, snapped) */
export const lineHeight = {
  xs: 18,
  sm: 20,
  base: 24,
  lg: 28,
  xl: 30,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  display: 48,
  hero: 56,
} as const;

/**
 * Letter spacing per size scale.
 * Display/hero sizes use slight tightening (-0.02em→-0.03em), never below -0.04em.
 * Body/small sizes use tracking 0 or slight open.
 */
export const letterSpacing = {
  xs: 0.2,
  sm: 0.1,
  base: 0,
  lg: -0.1,
  xl: -0.2,
  '2xl': -0.3,
  '3xl': -0.5,
  '4xl': -0.8,
  display: -0.8,  // -0.02em at 40px
  hero: -0.96,    // -0.02em at 48px
} as const;

export const typography = {
  fontSize,
  fontWeight,
  fontFamily,
  lineHeight,
  letterSpacing,
} as const;
