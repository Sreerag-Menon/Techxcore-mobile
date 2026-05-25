import type { PropsWithChildren, ReactNode } from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '@/theme';

interface TabLayoutProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  rightAction?: ReactNode;
}

export default function TabLayout({
  title,
  subtitle,
  rightAction,
  children,
}: TabLayoutProps) {
  const { colors } = useTheme();

  return (
    <View style={{ gap: 16 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            style={{
              color: colors.text,
              fontSize: 28,
              fontWeight: '700',
            }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 14,
                lineHeight: 20,
              }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {rightAction}
      </View>
      {children}
    </View>
  );
}
