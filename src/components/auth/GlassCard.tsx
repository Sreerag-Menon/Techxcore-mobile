/**
 * GlassCard — Frosted glass card for auth screens.
 *
 * Matches the web portal's glassmorphism login panel (backdrop-filter: blur)
 * using React Native's equivalent: semi-transparent backgroundColor + boxShadow.
 * Provides the "floating form" feel on top of the gradient background.
 */
import React from 'react';
import { View, ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function GlassCard({ children, style }: GlassCardProps) {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        {
          borderRadius: 20,
          // @ts-ignore
          borderCurve: 'continuous',
          overflow: 'hidden',
          padding: 24,
          // Glass effect — semi-transparent surface
          backgroundColor: isDark
            ? 'rgba(22, 27, 34, 0.88)'
            : 'rgba(255, 255, 255, 0.92)', // sync with authGlassSurface in theme/authOverlay.ts
          // Subtle border highlight (refraction effect)
          borderWidth: 1,
          borderColor: isDark
            ? 'rgba(255, 255, 255, 0.08)'
            : 'rgba(255, 255, 255, 0.6)',
          // Depth shadow — primary tint in light mode
          // @ts-ignore
          boxShadow: isDark
            ? '0 8px 32px rgba(0, 0, 0, 0.48), 0 1px 0 rgba(255,255,255,0.06) inset'
            : `0 8px 32px ${colors.primary}29, 0 1px 0 rgba(255,255,255,0.8) inset`,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
