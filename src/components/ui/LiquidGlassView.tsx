/**
 * LiquidGlassView — Platform-aware glass surface primitive.
 *
 * Tier 1 (iOS 26+): Native liquid glass via expo-glass-effect (UIVisualEffectView)
 * Tier 2 (iOS / Android): Frosted blur via expo-blur
 * Tier 3 (fallback): Semi-transparent rgba faux glass (matches GlassCard / auth tokens)
 *
 * Does not alter theme tokens; tint uses existing `colors.primary` at low opacity.
 */
import { BlurView } from 'expo-blur';
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';
import React, { useMemo } from 'react';
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { authGlassSurface } from '@/theme/authOverlay';
import { useTheme } from '@/theme';

export type GlassTier = 'native' | 'blur' | 'faux';

export type LiquidGlassVariant = 'default' | 'sheet';

export interface LiquidGlassViewProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** `sheet` adds a stronger frosted overlay so panels read clearly over modals */
  variant?: LiquidGlassVariant;
  /** Blur intensity 1–100 (tier 2). Default 80 */
  intensity?: number;
  /** iOS 26 native glass style. Default 'regular' */
  glassEffectStyle?: 'clear' | 'regular';
  /** Corner radius; clips blur and applies to container */
  borderRadius?: number;
  /** Optional brand tint on native glass (tier 1) */
  tintColor?: string;
  /** Interactive press highlight on iOS 26 native glass */
  interactive?: boolean;
}

export function resolveGlassTier(): GlassTier {
  if (Platform.OS === 'web') {
    return 'faux';
  }
  if (
    Platform.OS === 'ios' &&
    isGlassEffectAPIAvailable() &&
    isLiquidGlassAvailable()
  ) {
    return 'native';
  }
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return 'blur';
  }
  return 'faux';
}

export function useGlassTier(): GlassTier {
  return useMemo(() => resolveGlassTier(), []);
}

function SheetGlassOverlay({ isDark }: { isDark: boolean }) {
  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: isDark
            ? 'rgba(22, 27, 34, 0.62)'
            : 'rgba(255, 255, 255, 0.78)',
          borderTopWidth: 1,
          borderColor: isDark
            ? 'rgba(255, 255, 255, 0.14)'
            : 'rgba(255, 255, 255, 0.9)',
        },
      ]}
    />
  );
}

export function LiquidGlassView({
  children,
  style,
  variant = 'default',
  intensity: intensityProp,
  glassEffectStyle = 'regular',
  borderRadius,
  tintColor,
  interactive = false,
}: LiquidGlassViewProps) {
  const { isDark, colors } = useTheme();
  const tier = useGlassTier();
  const intensity = intensityProp ?? (variant === 'sheet' ? 90 : 80);
  const sheetOverlay =
    variant === 'sheet' ? <SheetGlassOverlay isDark={isDark} /> : null;

  const roundedStyle: ViewStyle | undefined =
    borderRadius != null
      ? { borderRadius, overflow: 'hidden' }
      : undefined;

  const containerStyle: StyleProp<ViewStyle> = [
    styles.fill,
    roundedStyle,
    style,
  ];

  const blurTint = isDark
    ? 'systemChromeMaterialDark'
    : 'systemChromeMaterialLight';

  if (tier === 'native') {
    return (
      <GlassView
        style={containerStyle}
        glassEffectStyle={glassEffectStyle}
        colorScheme={isDark ? 'dark' : 'light'}
        tintColor={tintColor ?? `${colors.primary}33`}
        isInteractive={interactive}
      >
        {sheetOverlay}
        {children}
      </GlassView>
    );
  }

  if (tier === 'blur') {
    return (
      <View style={containerStyle}>
        <BlurView
          intensity={intensity}
          tint={blurTint}
          experimentalBlurMethod={
            Platform.OS === 'android' ? 'dimezisBlurView' : undefined
          }
          style={StyleSheet.absoluteFill}
        />
        {sheetOverlay}
        {children}
      </View>
    );
  }

  const fauxBackground =
    variant === 'sheet'
      ? isDark
        ? 'rgba(22, 27, 34, 0.82)'
        : 'rgba(255, 255, 255, 0.85)'
      : isDark
        ? authGlassSurface.dark
        : authGlassSurface.light;

  return (
    <View
      style={[
        containerStyle,
        {
          backgroundColor: fauxBackground,
          borderWidth: 1,
          borderColor: isDark
            ? 'rgba(255, 255, 255, 0.12)'
            : 'rgba(255, 255, 255, 0.75)',
          // @ts-ignore — RN 0.81 boxShadow
          boxShadow: isDark
            ? '0 -4px 24px rgba(0, 0, 0, 0.35)'
            : `0 -4px 24px ${colors.primary}1F`,
        },
      ]}
    >
      {children}
    </View>
  );
}

/** Tab bar backdrop — use with `tabBarBackground` on Expo Router `Tabs`. */
export function TabBarGlassBackground() {
  return (
    <LiquidGlassView style={StyleSheet.absoluteFillObject} borderRadius={20} />
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
