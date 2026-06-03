import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { memo, useCallback, useEffect } from 'react';
import { Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme, fontSize, fontWeight } from '@/theme';

import { LiquidGlassView } from './LiquidGlassView';

const TAB_BAR_MARGIN_H = 24;
const TAB_BAR_HEIGHT = 56;
const TAB_BAR_BOTTOM_GAP = 12;
const PILL_INSET = 4;

type TabRouteName = 'index' | 'courses' | 'assessments' | 'profile';

const TAB_CONFIG: Record<
  TabRouteName,
  { icon: keyof typeof Ionicons.glyphMap; label: string }
> = {
  index: { icon: 'home', label: 'Home' },
  courses: { icon: 'book', label: 'Courses' },
  assessments: { icon: 'clipboard', label: 'Assessments' },
  profile: { icon: 'person', label: 'Profile' },
};

function getTabConfig(routeName: string) {
  return TAB_CONFIG[routeName as TabRouteName] ?? TAB_CONFIG.index;
}

const FloatingTabBar = memo(function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { colors, fontFamily, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const reduceMotion = useReducedMotion();

  const barWidth = screenWidth - TAB_BAR_MARGIN_H * 2;
  const tabCount = state.routes.length;
  const tabWidth = barWidth / tabCount;
  const pillWidth = tabWidth - PILL_INSET * 2;

  const pillX = useSharedValue(state.index * tabWidth + PILL_INSET);

  useEffect(() => {
    const target = state.index * tabWidth + PILL_INSET;
    if (reduceMotion) {
      pillX.value = target;
    } else {
      pillX.value = withSpring(target, { damping: 20, stiffness: 300 });
    }
  }, [state.index, tabWidth, pillX, reduceMotion]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value }],
  }));

  const onTabPress = useCallback(
    (routeKey: string, routeName: string, isFocused: boolean) => {
      const event = navigation.emit({
        type: 'tabPress',
        target: routeKey,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        if (Platform.OS === 'ios') {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        navigation.navigate(routeName);
      }
    },
    [navigation],
  );

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: TAB_BAR_MARGIN_H,
        right: TAB_BAR_MARGIN_H,
        bottom: insets.bottom + TAB_BAR_BOTTOM_GAP,
        height: TAB_BAR_HEIGHT,
      }}
    >
      <LiquidGlassView
        borderRadius={36}
        intensity={70}
        tintColor={isDark ? 'rgba(22, 27, 34, 0.85)' : 'rgba(255, 255, 255, 0.85)'}
        style={{
          flex: 1,
          overflow: 'hidden',
          // @ts-ignore
          borderCurve: 'continuous',
          // @ts-ignore
          boxShadow: isDark
            ? '0 4px 24px rgba(0, 0, 0, 0.4)'
            : '0 4px 24px rgba(13, 17, 23, 0.1)',
        }}
      >
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isDark ? 'rgba(22, 27, 34, 0.55)' : 'rgba(255, 255, 255, 0.65)',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
            borderRadius: 36,
          }}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                top: PILL_INSET,
                bottom: PILL_INSET,
                width: pillWidth,
                borderRadius: 28,
                backgroundColor: isDark ? colors.surfaceRaised : colors.primaryLight,
                // @ts-ignore
                borderCurve: 'continuous',
              },
              pillStyle,
            ]}
          />

          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            const config = getTabConfig(route.name);
            const label =
              options.title !== undefined && options.title !== ''
                ? String(options.title)
                : config.label;

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
                onPress={() => onTabPress(route.key, route.name, isFocused)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 6,
                  paddingHorizontal: 4,
                }}
              >
                <Ionicons
                  name={config.icon}
                  size={22}
                  color={
                    isFocused
                      ? isDark
                        ? colors.primary
                        : colors.primaryDark
                      : colors.textTertiary
                  }
                />
                {/* {isFocused ? (
                  <Text
                    style={{
                      color: '#0D1117',
                      fontSize: fontSize.xs,
                      fontWeight: fontWeight.semibold,
                      fontFamily: fontFamily.medium,
                    }}
                    numberOfLines={1}
                  >
                    {label === 'Dashboard' ? 'Home' : label}
                  </Text>
                ) : null} */}
              </Pressable>
            );
          })}
        </View>
      </LiquidGlassView>
    </View>
  );
});

export default FloatingTabBar;

/** Bottom padding for scroll content above the floating tab bar */
export function getFloatingTabBarScrollPadding(bottomInset: number): number {
  return TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_GAP + bottomInset + 16;
}
