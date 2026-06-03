import { memo } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useReducedMotion } from 'react-native-reanimated';

import { useTheme, fontSize, fontWeight } from '@/theme';
import {
  BookIcon,
  BarChartIcon,
  CheckCircleIcon,
  RibbonIcon,
} from '@/components/icons/stat';

/** Maps the Ionicons key previously used to the correct SVG component */
type StatIconKey =
  | 'book-outline'
  | 'bar-chart-outline'
  | 'checkmark-circle-outline'
  | 'ribbon-outline';

type SvgIconComponent = React.ComponentType<{ size?: number; color?: string }>;

const ICON_MAP: Record<StatIconKey, SvgIconComponent> = {
  'book-outline': BookIcon,
  'bar-chart-outline': BarChartIcon,
  'checkmark-circle-outline': CheckCircleIcon,
  'ribbon-outline': RibbonIcon,
};

export interface StatCardProps {
  label: string;
  value: string;
  icon: StatIconKey;
  iconTint: string;
  index?: number;
  /** `card` = full 2×2 grid tile (default). `chip` = compact pill for the hero gradient. */
  variant?: 'card' | 'chip';
}

const StatCard = memo(function StatCard({
  label,
  value,
  icon,
  iconTint,
  index = 0,
  variant = 'card',
}: StatCardProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const entering = reduceMotion
    ? undefined
    : FadeInUp.delay(index * 50).springify().damping(20);

  const IconComponent = ICON_MAP[icon] ?? BookIcon;

  if (variant === 'chip') {
    return (
      <Animated.View
        entering={entering}
        style={{
          // flexBasis 48% fills exactly half the 2×2 grid row in StatCardRow
          flexBasis: '48%',
          flexGrow: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          // Dark overlay on the teal gradient — sits in the hue family,
          // avoids the generic white-glass wash
          backgroundColor: 'rgba(0, 0, 0, 0.18)',
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 10,
          // No border — cleaner on a coloured gradient background
          // @ts-ignore
          borderCurve: 'continuous',
        }}
      >
        {/* Icon: subtle accent, not the visual anchor */}
        <IconComponent size={18} color="rgba(255, 255, 255, 0.6)" />

        {/* Stacked: label above value — scannable at a glance */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: 'rgba(255, 255, 255, 0.55)',
              fontSize: 11,
              fontWeight: fontWeight.medium,
              lineHeight: 14,
              textTransform: 'uppercase',
              letterSpacing: 0.4,
            }}
            numberOfLines={1}
          >
            {label}
          </Text>
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: fontSize.lg,
              fontWeight: fontWeight.bold,
              fontVariant: ['tabular-nums'],
              lineHeight: 24,
              marginTop: 1,
            }}
          >
            {value}
          </Text>
        </View>
      </Animated.View>
    );
  }

  // Default: card variant
  return (
    <Animated.View
      entering={entering}
      style={{
        flexGrow: 1,
        flexBasis: '48%',
        maxWidth: '48%',
        backgroundColor: `${iconTint}0F`,
        borderRadius: 16,
        padding: 14,
        gap: 10,
        // @ts-ignore
        borderCurve: 'continuous',
        // @ts-ignore
        boxShadow: '0 2px 8px rgba(13, 17, 23, 0.06)',
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: `${iconTint}22`,
          alignItems: 'center',
          justifyContent: 'center',
          // @ts-ignore
          borderCurve: 'continuous',
        }}
      >
        <IconComponent size={22} color={iconTint} />
      </View>
      <Text
        style={{
          color: colors.text,
          fontSize: fontSize['2xl'],
          fontWeight: fontWeight.bold,
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: fontSize.xs,
        }}
        numberOfLines={2}
      >
        {label}
      </Text>
    </Animated.View>
  );
});

export default StatCard;
