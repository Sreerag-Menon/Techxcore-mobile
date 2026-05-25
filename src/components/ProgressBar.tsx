/**
 * ProgressBar component.
 *
 * An animated progress bar with optional percentage label.
 * Smooth width animation via react-native-reanimated.
 */
import React, { memo, useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProgressBarProps {
  /** Progress value 0–100 */
  progress: number;
  color?: string;
  height?: 'sm' | 'md';
  showLabel?: boolean;
  animated?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ProgressBar = memo(function ProgressBar({
  progress,
  color,
  height = 'md',
  showLabel = false,
  animated = true,
}: ProgressBarProps) {
  const { colors } = useTheme();
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const width = useSharedValue(animated ? 0 : clampedProgress);

  useEffect(() => {
    if (animated) {
      width.value = withTiming(clampedProgress, { duration: 600 });
    } else {
      width.value = clampedProgress;
    }
  }, [clampedProgress, animated, width]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  const trackHeight = height === 'sm' ? 6 : 10;
  const barColor = color ?? colors.primary;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View
        style={{
          flex: 1,
          height: trackHeight,
          backgroundColor: colors.border,
          borderRadius: trackHeight / 2,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={[
            animatedStyle,
            {
              height: trackHeight,
              backgroundColor: barColor,
              borderRadius: trackHeight / 2,
            },
          ]}
        />
      </View>

      {showLabel && (
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 12,
            fontWeight: '600',
            minWidth: 36,
            textAlign: 'right',
          }}
        >
          {Math.round(clampedProgress)}%
        </Text>
      )}
    </View>
  );
});

export default ProgressBar;
