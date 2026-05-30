/**
 * Input component.
 *
 * A versatile text input with floating-label animation, error display,
 * left/right icon support, focus state highlight, and password toggle.
 * Uses Satoshi font and the new inputBackground / borderCurve tokens.
 */
import React, { memo, useRef, useState } from 'react';
import {
  Animated,
  KeyboardTypeOptions,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTheme, authGlassSurface } from '@/theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  leftIcon?: React.ReactElement;
  rightIcon?: React.ReactElement;
  secureTextEntry?: boolean;
  multiline?: boolean;
  disabled?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  numberOfLines?: number;
  maxLength?: number;
  testID?: string;
  /** Floating-label cutout background — use `glass` on auth GlassCard fields */
  labelBackground?: 'surface' | 'glass';
}

// ---------------------------------------------------------------------------
// SVG Eye Icons — proper icons, not emoji
// ---------------------------------------------------------------------------

function EyeOpenIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function EyeOffIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17.94 17.94C16.2306 19.243 14.1491 19.9649 12 20C5 20 1 12 1 12C2.24389 9.68192 3.96914 7.65661 6.06 6.06M9.9 4.24C10.5883 4.07888 11.2931 3.99834 12 4C19 4 23 12 23 12C22.393 13.1356 21.6691 14.2048 20.84 15.19M1 1L23 23"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Input = memo(function Input({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  leftIcon,
  rightIcon,
  secureTextEntry = false,
  multiline = false,
  disabled = false,
  keyboardType,
  autoCapitalize,
  numberOfLines,
  maxLength,
  testID,
  labelBackground = 'surface',
}: InputProps) {
  const { colors, fontFamily, isDark } = useTheme();
  const [focused, setFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

  const handleFocus = () => {
    setFocused(true);
    Animated.timing(labelAnim, {
      toValue: 1,
      duration: 160,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setFocused(false);
    if (!value) {
      Animated.timing(labelAnim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: false,
      }).start();
    }
  };

  const labelStyle = label
    ? {
        position: 'absolute' as const,
        left: leftIcon ? 42 : 14,
        top: labelAnim.interpolate({ inputRange: [0, 1], outputRange: [15, -8] }),
        fontSize: labelAnim.interpolate({ inputRange: [0, 1], outputRange: [15, 11] }),
        color: error
          ? colors.error
          : focused
          ? colors.primary
          : colors.textSecondary,
        backgroundColor:
          focused || value
            ? labelBackground === 'glass'
              ? isDark
                ? authGlassSurface.dark
                : authGlassSurface.light
              : colors.surface
            : 'transparent',
        paddingHorizontal: 2,
        zIndex: 1,
        fontFamily: fontFamily.medium,
      }
    : null;

  const borderColor = error
    ? colors.error
    : focused
    ? colors.primary
    : colors.border;

  const showPasswordToggle = secureTextEntry;
  const effectiveSecure = secureTextEntry && !passwordVisible;
  const effectiveRightIcon = showPasswordToggle ? undefined : rightIcon;

  return (
    <View style={{ width: '100%' }}>
      <View
        style={{
          borderWidth: 1.5,
          borderColor,
          borderRadius: 12,
          // @ts-ignore — borderCurve is iOS 13+, silenced for cross-platform
          borderCurve: 'continuous',
          backgroundColor: disabled
            ? colors.divider
            : colors.inputBackground,
          minHeight: multiline ? 100 : 52,
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          paddingHorizontal: 14,
          paddingTop: multiline ? 16 : 0,
          paddingBottom: multiline ? 10 : 0,
          // Subtle inset shadow for depth when focused
          ...(focused
            ? {
                boxShadow: `inset 0 1px 3px ${colors.primary}14, 0 0 0 3px ${colors.primaryLight}`,
              }
            : {}),
        }}
      >
        {/* Left icon */}
        {leftIcon && (
          <View style={{ marginRight: 10, opacity: disabled ? 0.5 : 1 }}>
            {React.cloneElement(leftIcon, {
              width: 18,
              height: 18,
              color: focused ? colors.primary : colors.textSecondary,
            } as object)}
          </View>
        )}

        {/* Floating label */}
        {label && (
          <Animated.Text style={labelStyle}>{label}</Animated.Text>
        )}

        {/* TextInput */}
        <TextInput
          testID={testID}
          value={value}
          onChangeText={disabled ? undefined : onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={label ? (focused || value ? placeholder : undefined) : placeholder}
          placeholderTextColor={colors.textTertiary}
          secureTextEntry={effectiveSecure}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines ?? 4 : 1}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
          editable={!disabled}
          style={{
            flex: 1,
            color: colors.text,
            fontSize: 15,
            fontFamily: fontFamily.regular,
            paddingTop: label ? 10 : 0,
            paddingRight: (showPasswordToggle || effectiveRightIcon) ? 8 : 0,
            textAlignVertical: multiline ? 'top' : 'center',
          }}
        />

        {/* Right icon / password toggle */}
        {showPasswordToggle ? (
          <Pressable
            onPress={() => setPasswordVisible((v) => !v)}
            hitSlop={8}
            style={{ marginLeft: 6 }}
          >
            {passwordVisible ? (
              <EyeOffIcon color={colors.textSecondary} />
            ) : (
              <EyeOpenIcon color={colors.textSecondary} />
            )}
          </Pressable>
        ) : effectiveRightIcon ? (
          <View style={{ marginLeft: 6 }}>
            {React.cloneElement(effectiveRightIcon, {
              width: 18,
              height: 18,
              color: colors.textSecondary,
            } as object)}
          </View>
        ) : null}
      </View>

      {/* Error message */}
      {!!error && (
        <Text
          style={{
            fontSize: 12,
            marginTop: 4,
            marginLeft: 4,
            color: colors.error,
            fontFamily: fontFamily.regular,
          }}
          accessibilityRole="alert"
        >
          {error}
        </Text>
      )}
    </View>
  );
});

export default Input;
