/**
 * Button component.
 *
 * Fully-featured, theme-aware button with multiple variants, sizes,
 * icon support, loading state, spring press feedback, and haptic touch.
 * Uses Satoshi font and the new teal primary color.
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

// Haptics — iOS only via process.env.EXPO_OS, gracefully absent on Android/web
let Haptics: typeof import('expo-haptics') | undefined;
try {
  // Dynamic require so it doesn't crash if expo-haptics isn't in the bundle
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  if (process.env.EXPO_OS === 'ios') {
    Haptics = require('expo-haptics');
  }
} catch {
  Haptics = undefined;
}

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
  /** Use pill shape (borderRadius 999) for CTAs — default for primary */
  pill?: boolean;
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
  pill = false,
}: ButtonProps) {
  const { colors, fontFamily } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 20, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 20, stiffness: 400 });
  };

  const handlePress = async () => {
    // Haptic feedback on iOS
    if (Haptics && !disabled && !loading) {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // silently ignore
      }
    }
    if (!disabled && !loading) onPress();
  };

  const isDisabled = disabled || loading;

  // ---- Size tokens ----
  const sizeStyles = {
    sm: { height: 36, paddingHorizontal: 16, gap: 6, fontSize: 13 },
    md: { height: 48, paddingHorizontal: 20, gap: 8, fontSize: 15 },
    lg: { height: 56, paddingHorizontal: 24, gap: 8, fontSize: 16 },
  };

  const { height, paddingHorizontal, gap, fontSize } = sizeStyles[size];

  // Pill shape for primary CTA — squircle for others
  const borderRadius = pill || variant === 'primary' ? 999 : 12;

  // ---- Variant background + border ----
  const bgStyle = () => {
    if (isDisabled) return { backgroundColor: colors.skeleton };
    switch (variant) {
      case 'primary':
        return { backgroundColor: colors.primary };
      case 'secondary':
        return { backgroundColor: colors.secondary };
      case 'outline':
        return { backgroundColor: 'transparent', borderColor: colors.primary, borderWidth: 1.5 };
      case 'ghost':
        return { backgroundColor: 'transparent' };
      case 'danger':
        return { backgroundColor: colors.error };
    }
  };

  const textColor = () => {
    if (isDisabled) return colors.textTertiary;
    switch (variant) {
      case 'primary':   return colors.onPrimary;
      case 'secondary': return '#FFFFFF';
      case 'outline':   return colors.primary;
      case 'ghost':     return colors.primary;
      case 'danger':    return '#FFFFFF';
    }
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={isDisabled ? undefined : handlePressIn}
      onPressOut={isDisabled ? undefined : handlePressOut}
      disabled={isDisabled}
      style={[
        animatedStyle,
        bgStyle(),
        {
          height,
          paddingHorizontal,
          borderRadius,
          // @ts-ignore
          borderCurve: 'continuous',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap,
          opacity: isDisabled ? 0.55 : 1,
          alignSelf: fullWidth ? undefined : 'flex-start',
          width: fullWidth ? '100%' : undefined,
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor()} />
      ) : (
        <>
          {icon && (
            <View>
              {React.cloneElement(icon, {
                width: size === 'sm' ? 14 : size === 'md' ? 16 : 18,
                height: size === 'sm' ? 14 : size === 'md' ? 16 : 18,
                color: textColor(),
              } as object)}
            </View>
          )}
          <Text
            style={{
              color: textColor(),
              fontSize,
              fontFamily: fontFamily.bold,
              letterSpacing: 0.1,
            }}
            numberOfLines={1}
          >
            {title}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
});

export default Button;
