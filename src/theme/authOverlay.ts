import type { ColorScheme } from './colors';

/**
 * Text colors for headers rendered on the AuthShell gradient.
 *
 * Light mode (teal gradient): near-white tones — high contrast on teal.
 * Dark mode (near-black gradient): design-system tokens — feels native to the
 * slate palette instead of floating disconnected whites.
 *
 * @param isDark — pass `isDark` from `useTheme()`. Defaults to false (light).
 */
export function getAuthOverlayColors(colors: ColorScheme, isDark = false) {
  if (isDark) {
    return {
      // Teal 300 at 85% opacity — brand accent, vibrant on #0D1117 background
      eyebrow: `${colors.primary}D9`,
      // #E6EDF3 — full off-white text, WCAG AA on dark gradient
      title: colors.text,
      // #8B949E — muted but readable secondary
      subtitle: colors.textSecondary,
      // #6E7681 — subtle footer links
      link: colors.textTertiary,
      // #2DD4BF — teal accent for highlighted/actionable links
      linkAccent: colors.primary,
    };
  }

  // Light mode — teal-to-slate gradient; whites read cleanly on the teal surface
  return {
    eyebrow: 'rgba(255, 255, 255, 0.72)',
    title: colors.onPrimary,         // '#FFFFFF'
    subtitle: 'rgba(255, 255, 255, 0.78)',
    link: 'rgba(255, 255, 255, 0.60)',
    linkAccent: 'rgba(255, 255, 255, 0.90)',
  };
}

/** Glass card surface RGBA — matches GlassCard backgrounds for floating label cutouts. */
export const authGlassSurface = {
  light: 'rgba(255, 255, 255, 0.92)',
  dark: 'rgba(22, 27, 34, 0.88)',
} as const;

