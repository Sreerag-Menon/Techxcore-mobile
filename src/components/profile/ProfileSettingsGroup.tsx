import { memo, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '@/theme';

export interface ProfileSettingsGroupProps {
  title?: string;
  children: ReactNode;
}

const ProfileSettingsGroup = memo(function ProfileSettingsGroup({
  title,
  children,
}: ProfileSettingsGroupProps) {
  const { colors, fontFamily } = useTheme();

  return (
    <View style={{ gap: 8 }}>
      {title ? (
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 12,
            fontFamily: fontFamily.medium,
            letterSpacing: 0.4,
            textTransform: 'uppercase',
            paddingHorizontal: 4,
          }}
        >
          {title}
        </Text>
      ) : null}
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
    </View>
  );
});

export default ProfileSettingsGroup;
