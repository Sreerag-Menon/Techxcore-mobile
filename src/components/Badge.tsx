/**
 * Badge component.
 *
 * A small pill-shaped label used for status indicators, tags, and counts.
 * Six semantic variants with automatically contrasting text colors.
 */
import React, { memo } from 'react';
import { Text, View, ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BadgeProps {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const variantBg: Record<string, string> = {
  primary: '#EEF2FF',
  success: '#D1FAE5',
  warning: '#FEF3C7',
  error:   '#FEE2E2',
  info:    '#DBEAFE',
  neutral: '#F3F4F6',
};

const variantBgDark: Record<string, string> = {
  primary: '#312E81',
  success: '#064E3B',
  warning: '#78350F',
  error:   '#7F1D1D',
  info:    '#1E3A8A',
  neutral: '#374151',
};

const variantText: Record<string, string> = {
  primary: '#4338CA',
  success: '#065F46',
  warning: '#92400E',
  error:   '#991B1B',
  info:    '#1D4ED8',
  neutral: '#374151',
};

const variantTextDark: Record<string, string> = {
  primary: '#C7D2FE',
  success: '#A7F3D0',
  warning: '#FDE68A',
  error:   '#FECACA',
  info:    '#BFDBFE',
  neutral: '#D1D5DB',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Badge = memo(function Badge({
  label,
  variant = 'primary',
  size = 'md',
  style,
}: BadgeProps) {
  const { isDark } = useTheme();

  const bg   = isDark ? variantBgDark[variant]   : variantBg[variant];
  const text = isDark ? variantTextDark[variant] : variantText[variant];

  const px = size === 'sm' ? 8 : 10;
  const py = size === 'sm' ? 2 : 4;
  const fs = size === 'sm' ? 11 : 12;

  return (
    <View
      style={[
        {
          backgroundColor: bg,
          borderRadius: 100,
          paddingHorizontal: px,
          paddingVertical: py,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <Text style={{ color: text, fontSize: fs, fontWeight: '600', letterSpacing: 0.2 }}>
        {label}
      </Text>
    </View>
  );
});

export default Badge;
