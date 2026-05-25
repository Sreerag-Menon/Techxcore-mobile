/**
 * Button component.
 *
 * A fully-featured, theme-aware button with multiple variants, sizes,
 * icon support, loading state, and animated press feedback.
 */
import React, { memo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactElement;
  fullWidth?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Button = memo(function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
}: ButtonProps) {
  const { colors, isDark } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const isDisabled = disabled || loading;

  // ---- Size tokens ----
  const sizeClasses = {
    sm: { container: 'h-9 px-4 gap-1.5', text: 'text-sm', icon: 16 },
    md: { container: 'h-11 px-5 gap-2', text: 'text-base', icon: 18 },
    lg: { container: 'h-14 px-6 gap-2', text: 'text-lg', icon: 20 },
  };

  // ---- Variant background + border ----
  const variantContainer: Record<string, string> = {
    primary: 'border-transparent',
    secondary: 'border-transparent',
    outline: 'border bg-transparent',
    ghost: 'border-transparent bg-transparent',
    danger: 'border-transparent',
  };

  // ---- Inline styles for dynamic colors (NativeWind can't reference JS vars) ----
  const bgStyle = () => {
    if (isDisabled) return { backgroundColor: isDark ? '#374151' : '#E5E7EB' };
    switch (variant) {
      case 'primary':   return { backgroundColor: colors.primary };
      case 'secondary': return { backgroundColor: colors.secondary };
      case 'outline':   return { backgroundColor: 'transparent', borderColor: colors.primary, borderWidth: 1.5 };
      case 'ghost':     return { backgroundColor: 'transparent' };
      case 'danger':    return { backgroundColor: colors.error };
    }
  };

  const textColor = () => {
    if (isDisabled) return isDark ? '#6B7280' : '#9CA3AF';
    switch (variant) {
      case 'primary':   return '#FFFFFF';
      case 'secondary': return '#FFFFFF';
      case 'outline':   return colors.primary;
      case 'ghost':     return colors.primary;
      case 'danger':    return '#FFFFFF';
    }
  };

  const { container, text, icon: iconSize } = sizeClasses[size];

  return (
    <AnimatedPressable
      onPress={isDisabled ? undefined : onPress}
      onPressIn={isDisabled ? undefined : handlePressIn}
      onPressOut={isDisabled ? undefined : handlePressOut}
      style={[animatedStyle, bgStyle(), { opacity: isDisabled ? 0.6 : 1 }]}
      className={`flex-row items-center justify-center rounded-xl ${container} ${variantContainer[variant]} ${fullWidth ? 'w-full' : 'self-start'}`}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor()} />
      ) : (
        <>
          {icon && (
            <View style={{ width: iconSize, height: iconSize }}>
              {React.cloneElement(icon, { width: iconSize, height: iconSize, color: textColor() } as object)}
            </View>
          )}
          <Text
            className={`font-semibold ${text}`}
            style={{ color: textColor() }}
          >
            {title}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
});

export default Button;
