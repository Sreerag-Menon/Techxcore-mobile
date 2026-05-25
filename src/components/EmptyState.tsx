/**
 * EmptyState component.
 *
 * Displays a centered illustration/icon, title, descriptive message,
 * and an optional call-to-action button when a list or screen has no data.
 */
import React, { memo } from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '@/theme';
import Button from './Button';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: React.ReactElement;
  actionLabel?: string;
  onAction?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const EmptyState = memo(function EmptyState({
  title,
  message,
  icon,
  actionLabel,
  onAction,
}: EmptyStateProps) {
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
      {icon && (
        <View style={{ marginBottom: 8, opacity: 0.6 }}>
          {React.cloneElement(icon, { width: 72, height: 72, color: colors.textTertiary } as object)}
        </View>
      )}

      {!icon && (
        // Default empty box visual using text
        <Text style={{ fontSize: 56, marginBottom: 8 }}>📭</Text>
      )}

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

      {!!message && (
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
      )}

      {!!actionLabel && !!onAction && (
        <View style={{ marginTop: 8 }}>
          <Button title={actionLabel} onPress={onAction} variant="primary" />
        </View>
      )}
    </View>
  );
});

export default EmptyState;
