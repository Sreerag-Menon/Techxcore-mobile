import { memo } from 'react';
import { View } from 'react-native';

import type { DashboardStats } from '@/types/dashboard.types';
import { useTheme } from '@/theme';

import StatCard from './StatCard';

export interface StatCardRowProps {
  stats: DashboardStats | null;
  isLoading?: boolean;
  /** `card` = 2×2 grid (default). `chip` = 2×2 stat grid for the hero gradient. */
  variant?: 'card' | 'chip';
}

const StatCardRow = memo(function StatCardRow({
  stats,
  isLoading = false,
  variant = 'card',
}: StatCardRowProps) {
  const { colors } = useTheme();

  const cards = [
    {
      label: 'Open Courses',
      value: isLoading ? '—' : String(stats?.openCourseCount ?? 0),
      icon: 'book-outline' as const,
      iconTint: colors.primary,
    },
    {
      label: 'Avg Score',
      value: isLoading ? '—' : String(stats?.avgAssessmentScore ?? 0),
      icon: 'bar-chart-outline' as const,
      iconTint: colors.info,
    },
    {
      label: 'Completion',
      value: isLoading ? '—' : `${stats?.avgCompletionRate ?? 0}%`,
      icon: 'checkmark-circle-outline' as const,
      iconTint: colors.success,
    },
    {
      label: 'PLE Credits',
      value: isLoading ? '—' : String(stats?.pleCredits ?? 0),
      icon: 'ribbon-outline' as const,
      iconTint: colors.secondary,
    },
  ];

  if (variant === 'chip') {
    return (
      // 2×2 locked grid — all 4 stats visible at once, no scroll affordance needed
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        {cards.map((card, index) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            icon={card.icon}
            iconTint={card.iconTint}
            index={index}
            variant="chip"
          />
        ))}
      </View>
    );
  }

  // Default: card grid
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'space-between',
      }}
    >
      {cards.map((card, index) => (
        <StatCard
          key={card.label}
          label={card.label}
          value={card.value}
          icon={card.icon}
          iconTint={card.iconTint}
          index={index}
          variant="card"
        />
      ))}
    </View>
  );
});

export default StatCardRow;
