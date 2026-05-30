/**
 * AuthHeader — Eyebrow, title, and optional subtitle on the gradient shell.
 *
 * Each text element enters staggered: eyebrow → title → subtitle, 55ms apart.
 * Uses FadeInDown with ease-out-expo (cubic-bezier(0.16, 1, 0.3, 1)) —
 * the 2026 "Confident Deceleration" pattern: fast start, precise rest, no bounce.
 */
import React from 'react';
import { View } from 'react-native';
import Animated, {
  FadeInDown,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';

import { useTheme, getAuthOverlayColors } from '@/theme';

interface AuthHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Title font size — default 36; confirmation screen uses 32 */
  titleSize?: number;
}

export function AuthHeader({
  eyebrow,
  title,
  subtitle,
  titleSize = 36,
}: AuthHeaderProps) {
  const { colors, fontFamily, isDark } = useTheme();
  const overlay = getAuthOverlayColors(colors, isDark);
  const reduceMotion = useReducedMotion();

  // ease-out-expo: fast start → exponential deceleration → precise rest. No bounce.
  const expoEase = Easing.bezier(0.16, 1, 0.3, 1);
  const enterDuration = 260;
  const stagger = 55; // ms between each sibling element

  const eyebrowEnter = reduceMotion
    ? undefined
    : FadeInDown.duration(enterDuration).easing(expoEase).delay(0);

  const titleEnter = reduceMotion
    ? undefined
    : FadeInDown.duration(enterDuration).easing(expoEase).delay(stagger);

  const subtitleEnter = reduceMotion
    ? undefined
    : FadeInDown.duration(enterDuration).easing(expoEase).delay(stagger * 2);

  return (
    <View style={{ gap: 6, marginBottom: 24 }}>
      {eyebrow ? (
        <Animated.Text
          entering={eyebrowEnter}
          style={{
            color: overlay.eyebrow,
            fontSize: 12,
            fontFamily: fontFamily.bold,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
          }}
        >
          {eyebrow}
        </Animated.Text>
      ) : null}
      <Animated.Text
        entering={titleEnter}
        style={{
          color: overlay.title,
          fontSize: titleSize,
          fontFamily: fontFamily.black,
          letterSpacing: titleSize >= 36 ? -0.7 : -0.5,
          lineHeight: titleSize >= 36 ? 42 : 38,
        }}
      >
        {title}
      </Animated.Text>
      {subtitle ? (
        <Animated.Text
          entering={subtitleEnter}
          style={{
            color: overlay.subtitle,
            fontSize: 15,
            fontFamily: fontFamily.regular,
            lineHeight: 22,
            marginTop: 4,
          }}
        >
          {subtitle}
        </Animated.Text>
      ) : null}
    </View>
  );
}
