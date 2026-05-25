/**
 * Input component.
 *
 * A versatile text input with floating-label animation, error display,
 * left/right icon support, focus state highlight, and password toggle.
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

import { useTheme } from '@/theme';

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
}

// ---------------------------------------------------------------------------
// Eye icon (inline SVG-free substitute using Text glyphs)
// ---------------------------------------------------------------------------

function EyeIcon({ visible, color }: { visible: boolean; color: string }) {
  return (
    <Text style={{ fontSize: 18, color, lineHeight: 22 }}>
      {visible ? '🙈' : '👁'}
    </Text>
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
}: InputProps) {
  const { colors, isDark } = useTheme();
  const [focused, setFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

  const handleFocus = () => {
    setFocused(true);
    Animated.timing(labelAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setFocused(false);
    if (!value) {
      Animated.timing(labelAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: false,
      }).start();
    }
  };

  const labelStyle = label
    ? {
        position: 'absolute' as const,
        left: leftIcon ? 40 : 14,
        top: labelAnim.interpolate({ inputRange: [0, 1], outputRange: [14, -8] }),
        fontSize: labelAnim.interpolate({ inputRange: [0, 1], outputRange: [15, 12] }),
        color: error
          ? colors.error
          : focused
          ? colors.primary
          : colors.textSecondary,
        backgroundColor: colors.surface,
        paddingHorizontal: 2,
        zIndex: 1,
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
    <View className="w-full">
      <View
        style={{
          borderWidth: 1.5,
          borderColor,
          borderRadius: 12,
          backgroundColor: disabled
            ? isDark ? '#1F2937' : '#F3F4F6'
            : colors.surface,
          minHeight: multiline ? 100 : 52,
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          paddingHorizontal: 14,
          paddingTop: multiline ? 16 : 0,
          paddingBottom: multiline ? 10 : 0,
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
            <EyeIcon visible={passwordVisible} color={colors.textSecondary} />
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
          className="text-xs mt-1 ml-1"
          style={{ color: colors.error }}
          accessibilityRole="alert"
        >
          {error}
        </Text>
      )}
    </View>
  );
});

export default Input;
