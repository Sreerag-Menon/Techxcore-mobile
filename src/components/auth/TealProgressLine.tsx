/**
 * TealProgressLine — Animated progress indicator for auth flow steps.
 *
 * A 3px teal line across the top of the GlassCard that grows from
 * 33% → 66% → 100% as the user progresses through the auth flow.
 * Step 0 = select-tenant (33%), Step 1 = login (66%), Step 2 = forgot-password (100%).
 *
 * Uses Reanimated withSpring for smooth width animation.
 */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useReducedMotion,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

interface TealProgressLineProps {
  step: 0 | 1 | 2;
}

const STEP_WIDTHS = ['33%', '66%', '100%'] as const;

export function TealProgressLine({ step }: TealProgressLineProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();

  // Progress as a 0–1 value per step
  const progress = useSharedValue(step === 0 ? 0.33 : step === 1 ? 0.66 : 1.0);

  useEffect(() => {
    const target = step === 0 ? 0.33 : step === 1 ? 0.66 : 1.0;
    if (reduceMotion) {
      progress.value = target;
    } else {
      progress.value = withSpring(target, { damping: 22, stiffness: 200 });
    }
  }, [step, reduceMotion, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View
      style={{
        height: 3,
        backgroundColor: colors.border,
        borderRadius: 999,
        overflow: 'hidden',
        marginBottom: 24,
      }}
    >
      <Animated.View
        style={[
          {
            height: 3,
            backgroundColor: colors.primary,
            borderRadius: 999,
          },
          animatedStyle,
        ]}
      />
    </View>
  );
}
