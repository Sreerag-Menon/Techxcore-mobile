/**
 * AuthShellContent — Animated content wrapper for auth screen interiors.
 *
 * Content enters from 10px below with opacity 0→1 using ease-out-expo
 * (cubic-bezier 0.16, 1, 0.3, 1) — the 2026 "Confident Deceleration" pattern.
 * No spring, no bounce, no overshoot.
 *
 * Exit accelerates away upward with ease-in-quad (75% of enter duration).
 * Respects useReducedMotion() — immediately visible when preference is set.
 */
import React from 'react';
import Animated, {
  FadeInDown,
  FadeOutUp,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';

interface AuthShellContentProps {
  children: React.ReactNode;
}

export function AuthShellContent({ children }: AuthShellContentProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <>{children}</>;
  }

  return (
    <Animated.View
      entering={FadeInDown
        .duration(280)
        .easing(Easing.bezier(0.16, 1, 0.3, 1))
        .delay(40)}
      exiting={FadeOutUp
        .duration(180)
        .easing(Easing.bezier(0.4, 0, 1, 1))}
    >
      {children}
    </Animated.View>
  );
}

