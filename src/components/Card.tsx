/**
 * Card component.
 *
 * A container card with three visual variants (default, elevated, outlined),
 * configurable padding, and optional press-to-scale animation.
 * Uses CSS boxShadow (not legacy elevation/shadow props).
 */
import React, { memo } from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Pressable } from 'react-native';

import { useTheme } from '@/theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const paddingMap = {
  none: 0,
  sm: 8,
  md: 16,
  lg: 24,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Card = memo(function Card({
  children,
  onPress,
  variant = 'default',
  padding = 'md',
  style,
}: CardProps) {
  const { colors, isDark } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) scale.value = withSpring(0.97, { damping: 18, stiffness: 350 });
  };

  const handlePressOut = () => {
    if (onPress) scale.value = withSpring(1, { damping: 18, stiffness: 350 });
  };

  const variantStyle = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: colors.surfaceRaised,
          // CSS boxShadow — no legacy elevation/shadow props
          // @ts-ignore
          boxShadow: isDark
            ? '0 4px 16px rgba(0, 0, 0, 0.4)'
            : '0 2px 12px rgba(13, 17, 23, 0.08)',
        };
      case 'outlined':
        return {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        };
      default:
        return { backgroundColor: colors.surface };
    }
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!onPress}
      style={[
        animatedStyle,
        variantStyle(),
        {
          borderRadius: 16,
          // @ts-ignore
          borderCurve: 'continuous',
          padding: paddingMap[padding],
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </AnimatedPressable>
  );
});

export default Card;
