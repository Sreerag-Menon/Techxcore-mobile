/**
 * Avatar component.
 *
 * Displays a user avatar image. Falls back to coloured initials when no
 * image URL is provided. Supports four sizes and an optional status badge dot.
 */
import React, { memo, useState } from 'react';
import { Image, Text, View, ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import { getInitials } from '@/utils/helpers';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AvatarProps {
  imageUrl?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
  badgeColor?: string;
  style?: ViewStyle;
}

// ---------------------------------------------------------------------------
// Size map
// ---------------------------------------------------------------------------

const sizeMap = {
  sm: { container: 32, fontSize: 12, badge: 9 },
  md: { container: 44, fontSize: 16, badge: 11 },
  lg: { container: 60, fontSize: 22, badge: 14 },
  xl: { container: 80, fontSize: 30, badge: 18 },
};

// Simple hue-based background for initials avatar
const AVATAR_COLORS = [
  '#4F46E5', '#7C3AED', '#DB2777', '#DC2626',
  '#D97706', '#059669', '#0891B2', '#2563EB',
];

function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Avatar = memo(function Avatar({
  imageUrl,
  name = '',
  size = 'md',
  showBadge = false,
  badgeColor,
  style,
}: AvatarProps) {
  const { colors } = useTheme();
  const [imgError, setImgError] = useState(false);
  const { container, fontSize, badge } = sizeMap[size];
  const initials = getInitials(name) || '?';
  const bgColor = colorFromName(name || 'user');

  const showImage = !!imageUrl && !imgError;

  return (
    <View style={[{ width: container, height: container }, style]}>
      {showImage ? (
        <Image
          source={{ uri: imageUrl }}
          onError={() => setImgError(true)}
          style={{
            width: container,
            height: container,
            borderRadius: container / 2,
          }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: container,
            height: container,
            borderRadius: container / 2,
            backgroundColor: bgColor,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              color: '#FFFFFF',
              fontSize,
              fontWeight: '700',
              letterSpacing: 0.5,
            }}
          >
            {initials}
          </Text>
        </View>
      )}

      {/* Status badge */}
      {showBadge && (
        <View
          style={{
            position: 'absolute',
            bottom: 1,
            right: 1,
            width: badge,
            height: badge,
            borderRadius: badge / 2,
            backgroundColor: badgeColor ?? colors.success,
            borderWidth: 2,
            borderColor: colors.surface,
          }}
        />
      )}
    </View>
  );
});

export default Avatar;
