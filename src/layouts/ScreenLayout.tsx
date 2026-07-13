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
  useSafeAreaInsets,
  type Edge,
} from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPadding } from '@/components/ui';
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
  /**
   * When true, bottom padding clears the floating tab bar
   * (height + gap + safe-area inset). Use on student/parent tab roots.
   */
  floatingTabBar?: boolean;
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
  floatingTabBar = false,
}: ScreenLayoutProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { horizontalPadding, fluid } = useResponsive();
  const omitTopSafeArea = !safeAreaEdges.includes('top');

  const defaultBottomPadding = floatingTabBar
    ? getFloatingTabBarScrollPadding(insets.bottom)
    : 32;
  const resolvedMaxWidth = maxContentWidth ?? 1200;
  const contentGap = fluid(16, 20);

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
          paddingTop: omitTopSafeArea ? 0 : fluid(16, 24),
          paddingBottom: defaultBottomPadding,
        },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      <View
        style={{
          maxWidth: resolvedMaxWidth,
          width: '100%',
          alignSelf: 'center',
          gap: contentGap,
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
          paddingTop: omitTopSafeArea ? 0 : fluid(16, 24),
          paddingBottom: floatingTabBar
            ? getFloatingTabBarScrollPadding(insets.bottom)
            : 24,
        },
        contentContainerStyle,
      ]}
    >
      <View
        style={{
          maxWidth: resolvedMaxWidth,
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

