/**
 * Skeleton component.
 *
 * Shimmer placeholder for loading states. Offers preset variants for
 * common shapes and a SkeletonCard composite for course/assessment cards.
 */
import React, { memo, useEffect, useRef } from 'react';
import { Animated, DimensionValue, View, ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  style?: ViewStyle;
}

// ---------------------------------------------------------------------------
// Preset dimensions
// ---------------------------------------------------------------------------

const variantDefaults: Record<
  NonNullable<SkeletonProps['variant']>,
  Pick<SkeletonProps, 'width' | 'height' | 'borderRadius'>
> = {
  text:        { width: '80%', height: 14, borderRadius: 6 },
  circular:    { width: 44,    height: 44, borderRadius: 22 },
  rectangular: { width: '100%', height: 120, borderRadius: 8 },
  card:        { width: '100%', height: 180, borderRadius: 16 },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Skeleton = memo(function Skeleton({
  width,
  height,
  borderRadius,
  variant = 'rectangular',
  style,
}: SkeletonProps) {
  const { isDark } = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  const defaults = variantDefaults[variant];
  const resolvedWidth = width ?? defaults.width;
  const resolvedHeight = height ?? defaults.height;
  const resolvedRadius = borderRadius ?? defaults.borderRadius;

  const baseColor   = isDark ? '#374151' : '#E5E7EB';
  const shineColor  = isDark ? '#4B5563' : '#F3F4F6';

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const bgColor = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [baseColor, shineColor],
  });

  return (
    <Animated.View
      style={[
        {
          width: resolvedWidth,
          height: resolvedHeight,
          borderRadius: resolvedRadius,
          backgroundColor: bgColor,
        },
        style,
      ]}
    />
  );
});

// ---------------------------------------------------------------------------
// SkeletonCard – composite placeholder for course/assessment cards
// ---------------------------------------------------------------------------

export function SkeletonCard() {
  return (
    <View style={{ gap: 12 }}>
      {/* Thumbnail */}
      <Skeleton variant="card" />
      {/* Title row */}
      <Skeleton variant="text" width="90%" height={16} />
      {/* Subtitle */}
      <Skeleton variant="text" width="60%" height={12} />
      {/* Bottom row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <Skeleton variant="circular" width={32} height={32} borderRadius={16} />
        <Skeleton variant="text" width="40%" height={12} />
      </View>
    </View>
  );
}

export default Skeleton;
