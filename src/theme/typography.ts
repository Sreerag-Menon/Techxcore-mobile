/** Typography scale for consistent text styling across the app */

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/** Line heights that pair with the font-size scale (1.5× ratio, snapped to integers) */
export const lineHeight = {
  xs: 18,
  sm: 20,
  base: 24,
  lg: 28,
  xl: 30,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
} as const;

export const typography = {
  fontSize,
  fontWeight,
  lineHeight,
} as const;
