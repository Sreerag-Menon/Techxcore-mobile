/**
 * useResponsive — Production-grade responsive hook.
 *
 * Uses useWindowDimensions (reactive) instead of Dimensions.get() (snapshot).
 * Never import Dimensions.get() for layout decisions — this hook is the single
 * source of truth for all breakpoint and size information.
 *
 * Breakpoints are aligned with standard device classes:
 *   xs   < 390   phones portrait (small)
 *   sm   390–767 phones landscape / standard phones
 *   md   768–1023 tablets portrait
 *   lg   1024–1279 tablets landscape / small laptops
 *   xl   ≥ 1280  desktops / large tablets
 */
import { useWindowDimensions } from 'react-native';

// ---------------------------------------------------------------------------
// Breakpoints
// ---------------------------------------------------------------------------

export const BREAKPOINTS = {
  xs: 0,
  sm: 390,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const breakpoint = deriveBreakpoint(width);
  const isPhone = width < BREAKPOINTS.md;
  const isTablet = width >= BREAKPOINTS.md;
  const isLandscape = width > height;

  /**
   * fluid(phoneValue, tabletValue)
   * Linearly interpolates between two values based on screen width.
   * Phone anchor: 390dp, tablet anchor: 768dp.
   * Returns phoneValue for phones, tabletValue for tablets, interpolated in between.
   */
  function fluid(phone: number, tablet: number): number {
    if (width <= BREAKPOINTS.sm) return phone;
    if (width >= BREAKPOINTS.md) return tablet;
    const t = (width - BREAKPOINTS.sm) / (BREAKPOINTS.md - BREAKPOINTS.sm);
    return Math.round(phone + (tablet - phone) * t);
  }

  /**
   * responsive<T>(values, fallback)
   * Picks the value for the current breakpoint, walking down from the
   * current breakpoint until it finds a defined value or returns fallback.
   */
  function responsive<T>(values: Partial<Record<Breakpoint, T>>, fallback: T): T {
    const order: Breakpoint[] = ['xl', 'lg', 'md', 'sm', 'xs'];
    const currentIndex = order.indexOf(breakpoint);
    for (let i = currentIndex; i < order.length; i++) {
      const bp = order[i];
      if (values[bp] !== undefined) return values[bp] as T;
    }
    return fallback;
  }

  // Auth-specific layout constants — used by KeyboardLayout and auth screens
  const formMaxWidth = isTablet ? 480 : undefined;
  const horizontalPadding = fluid(20, 40);
  const verticalPadding = fluid(24, 48);

  // Content container constraints for tablet-centered single-column layouts
  const contentConstraints = isTablet
    ? { alignSelf: 'center' as const, width: '100%' as const, maxWidth: 560 }
    : undefined;

  return {
    width,
    height,
    breakpoint,
    isPhone,
    isTablet,
    isLandscape,
    fluid,
    responsive,
    // Layout helpers
    formMaxWidth,
    horizontalPadding,
    verticalPadding,
    contentConstraints,
  };
}
