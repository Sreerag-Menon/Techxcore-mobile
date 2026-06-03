import type { PropsWithChildren, ReactNode } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';
import {
  SafeAreaView,
  type Edge,
} from 'react-native-safe-area-context';

import { useTheme } from '@/theme';
import { useResponsive } from '@/hooks';

interface ScreenLayoutProps extends PropsWithChildren {
  scrollable?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  maxContentWidth?: number;
  /** Safe area edges to respect. Use `['left','right']` to let content extend under the status bar. */
  safeAreaEdges?: Edge[];
}

export default function ScreenLayout({
  children,
  scrollable = true,
  header,
  footer,
  refreshing = false,
  onRefresh,
  contentContainerStyle,
  style,
  maxContentWidth,
  safeAreaEdges = ['top', 'left', 'right'],
}: ScreenLayoutProps) {
  const { colors } = useTheme();
  const { horizontalPadding } = useResponsive();
  const omitTopSafeArea = !safeAreaEdges.includes('top');

  const refreshControl = onRefresh ? (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.primary}
      colors={[colors.primary]}
    />
  ) : undefined;

  const content = scrollable ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[
        {
          paddingHorizontal: horizontalPadding,
          paddingTop: omitTopSafeArea ? 0 : 16,
          paddingBottom: 32,
        },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      <View
        style={{
          maxWidth: maxContentWidth ?? 1200,
          width: '100%',
          alignSelf: 'center',
          gap: 16,
        }}
      >
        {header}
        {children}
        {footer}
      </View>
    </ScrollView>
  ) : (
    <View
      style={[
        {
          flex: 1,
          paddingHorizontal: horizontalPadding,
          paddingTop: omitTopSafeArea ? 0 : 16,
          paddingBottom: 24,
        },
        contentContainerStyle,
      ]}
    >
      <View
        style={{
          maxWidth: maxContentWidth ?? 1200,
          width: '100%',
          alignSelf: 'center',
          flex: 1,
        }}
      >
        {header}
        {children}
        {footer}
      </View>
    </View>
  );

  return (
    <SafeAreaView
      edges={safeAreaEdges}
      style={[
        {
          flex: 1,
          backgroundColor: colors.background,
        },
        style,
      ]}
    >
      {content}
    </SafeAreaView>
  );
}

