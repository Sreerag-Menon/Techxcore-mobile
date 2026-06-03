import { memo, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components';
import { useAppSelector } from '@/redux';
import { useTheme, fontSize, fontWeight, letterSpacing } from '@/theme';
import {
  formatDashboardDateTime,
  getGreetingInfo,
} from '@/utils/greeting';
import { useResponsive } from '@/hooks';
import type { DashboardStats } from '@/types/dashboard.types';
import { BellIcon, SunIcon, CloudSunIcon, MoonIcon } from '@/components/icons/ui';

import StatCardRow from './StatCardRow';

export interface GreetingHeaderProps {
  stats?: DashboardStats | null;
  isLoading?: boolean;
}

/** Returns the correct SVG icon for the time of day */
function GreetingIcon({
  timeOfDay,
  color,
  size,
}: {
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  color: string;
  size: number;
}) {
  if (timeOfDay === 'morning') return <SunIcon size={size} color={color} />;
  if (timeOfDay === 'afternoon') return <CloudSunIcon size={size} color={color} />;
  return <MoonIcon size={size} color={color} />;
}

const GreetingHeader = memo(function GreetingHeader({
  stats = null,
  isLoading = false,
}: GreetingHeaderProps) {
  const { colors, isDark } = useTheme();
  const { horizontalPadding } = useResponsive();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const unreadCount = useAppSelector((state) => state.notification.unreadCount);
  const profile = useAppSelector((state) => state.user.profile);
  const authUser = useAppSelector((state) => state.auth.user);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const greeting = useMemo(() => getGreetingInfo(now), [now]);
  const displayName = useMemo(() => {
    const source = profile ?? authUser;
    return [source?.first_name, (source as { last_name?: string })?.last_name]
      .filter(Boolean)
      .join(' ');
  }, [profile, authUser]);

  const avatarUrl =
    profile?.avatar_url ?? authUser?.profile_image ?? undefined;

  const entering = reduceMotion ? undefined : FadeInDown.springify().damping(20);
  const iconEntering = reduceMotion ? undefined : FadeIn.delay(200);

  // Dark mode: deep dark teal fading into background; light mode: vibrant teal
  const heroGradient = isDark
    ? ([colors.primaryLight, colors.background] as const)
    : ([colors.primary, colors.primaryDark] as const);

  const textColor = isDark ? colors.text : '#FFFFFF';
  const textMutedColor = isDark ? colors.textTertiary : 'rgba(255, 255, 255, 0.6)';
  const iconBgColor = isDark ? colors.surfaceOverlay : 'rgba(255, 255, 255, 0.15)';
  const iconBorderColor = isDark ? colors.border : 'rgba(255, 255, 255, 0.2)';
  // Icon color: white on coloured hero, or theme text in dark mode
  const iconColor = isDark ? colors.textSecondary : 'rgba(255, 255, 255, 0.9)';

  return (
    <Animated.View entering={entering}>
      <LinearGradient
        colors={heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          marginHorizontal: -horizontalPadding,
          paddingHorizontal: horizontalPadding,
          paddingTop: insets.top + 20,
          paddingBottom: 28,
          // Reduced from 32 — matches card-level rounding, avoids the balloon effect
          borderBottomLeftRadius: 20,
          borderBottomRightRadius: 20,
          gap: 18,
        }}
      >
        {/* ── Row 1: Utility Bar ── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          {/* Left: Date + Time */}
          <Text
            style={{
              color: textMutedColor,
              fontSize: fontSize.xs,
              fontWeight: fontWeight.medium,
            }}
          >
            {formatDashboardDateTime(now)}
          </Text>

          {/* Right: Notification + Avatar */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable
              onPress={() => router.push('/(student)/notifications')}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: iconBgColor,
                borderWidth: 1,
                borderColor: iconBorderColor,
                alignItems: 'center',
                justifyContent: 'center',
                // @ts-ignore
                borderCurve: 'continuous',
              }}
            >
              <BellIcon size={18} color={iconColor} />
              {unreadCount > 0 ? (
                <View
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: colors.error,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 4,
                  }}
                >
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: 10,
                      fontWeight: '700',
                    }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>

            <Pressable
              onPress={() => router.push('/(student)/(tabs)/profile')}
              accessibilityRole="button"
              accessibilityLabel="Profile"
            >
              <Avatar
                imageUrl={avatarUrl}
                name={displayName || 'Student'}
                size="md"
              />
            </Pressable>
          </View>
        </View>

        {/* ── Row 2: Greeting with SVG icon ── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            width: '100%',
          }}
        >
          <Animated.View entering={iconEntering}>
            <GreetingIcon
              timeOfDay={greeting.timeOfDay}
              color={iconColor}
              size={22}
            />
          </Animated.View>
          <Text
            style={{
              color: textColor,
              fontSize: fontSize['2xl'] ?? 24,
              fontWeight: fontWeight.bold,
              letterSpacing: letterSpacing['2xl'] ?? -0.3,
              flex: 1,
            }}
          >
            {greeting.message}
            {displayName ? `, ${displayName.split(' ')[0]}` : ''}
          </Text>
        </View>

        {/* ── Row 3: Stat chips row ── */}
        <StatCardRow
          stats={stats}
          isLoading={isLoading}
          variant="chip"
        />
      </LinearGradient>
    </Animated.View>
  );
});

export default GreetingHeader;
