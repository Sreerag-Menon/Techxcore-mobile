/**
 * ErrorState component.
 *
 * Full-screen or inline error display with icon, message, and retry button.
 */
import React, { memo } from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '@/theme';
import Button from './Button';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ErrorState = memo(function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
  retryLabel = 'Try Again',
}: ErrorStateProps) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingVertical: 48,
        gap: 16,
      }}
    >
      {/* Error icon */}
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: `${colors.error}18`,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 8,
        }}
      >
        <Text style={{ fontSize: 34 }}>⚠️</Text>
      </View>

      <Text
        style={{
          color: colors.text,
          fontSize: 18,
          fontWeight: '700',
          textAlign: 'center',
          letterSpacing: -0.3,
        }}
      >
        {title}
      </Text>

      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 14,
          lineHeight: 22,
          textAlign: 'center',
        }}
      >
        {message}
      </Text>

      {!!onRetry && (
        <View style={{ marginTop: 8 }}>
          <Button title={retryLabel} onPress={onRetry} variant="primary" />
        </View>
      )}
    </View>
  );
});

export default ErrorState;
