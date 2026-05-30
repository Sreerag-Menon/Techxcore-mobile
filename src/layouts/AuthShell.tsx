/**
 * AuthShell — Persistent visual container for all auth screens.
 *
 * The gradient background and glass card never re-mount between auth screens —
 * only the content inside animates. This creates the Framer-like "liquid flow"
 * feel as screens transition: the background remains stable while content
 * slides/fades within the card.
 *
 * Light: soft teal-to-slate gradient
 * Dark: deep slate-to-dark-teal gradient (matching GitHub Dark base)
 */
import React from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/theme';
import { useResponsive } from '@/hooks';

interface AuthShellProps {
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Step 0 = select-tenant, 1 = login, 2 = forgot-password */
  step?: 0 | 1 | 2;
}

export default function AuthShell({
  children,
  contentContainerStyle,
  step = 0,
}: AuthShellProps) {
  const { colors, isDark } = useTheme();
  const { horizontalPadding, verticalPadding, isTablet, contentConstraints } = useResponsive();

  // Gradient stops per theme
  const gradientColors = isDark
    ? ['#0D1117', '#0A2828', '#0D3D3A'] as const
    : ['#0D9488', '#0E7B70', '#F5F7F9'] as const;

  // Gradient locations — teal fades in from top, slate takes over lower half
  const gradientLocations: [number, number, number] = isDark
    ? [0, 0.35, 1]
    : [0, 0.3, 1];

  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      style={{ flex: 1, backgroundColor: isDark ? '#0D1117' : '#0D9488' }}
    >
      {/* Full-screen gradient background — never re-mounts between auth screens */}
      <LinearGradient
        colors={gradientColors}
        locations={gradientLocations}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />

      {/* Subtle noise texture overlay (decorative circles for depth) */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -80,
          right: -80,
          width: 300,
          height: 300,
          borderRadius: 150,
          backgroundColor: isDark
            ? 'rgba(45, 212, 191, 0.06)'
            : 'rgba(255, 255, 255, 0.12)',
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: -60,
          left: -60,
          width: 200,
          height: 200,
          borderRadius: 100,
          backgroundColor: isDark
            ? 'rgba(45, 212, 191, 0.04)'
            : 'rgba(255, 255, 255, 0.08)',
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            {
              flexGrow: 1,
              justifyContent: 'center',
              paddingHorizontal: horizontalPadding,
              paddingVertical: verticalPadding,
            },
            contentContainerStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Content constrained for tablet-centered layout */}
          <View
            style={[
              contentConstraints,
              isTablet && { alignSelf: 'center', width: '100%', maxWidth: 560 },
            ]}
          >
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
