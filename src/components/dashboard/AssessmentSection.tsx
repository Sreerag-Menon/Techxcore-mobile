import { memo, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';

import { useTheme, fontSize, fontWeight } from '@/theme';
import type { HomeAssessment } from '@/types/assessment.types';
import { AssessmentIcon } from '@/components/icons/menu';

import AssessmentListItem from '@/components/assessments/AssessmentListItem';

export interface AssessmentSectionProps {
  assessments: HomeAssessment[];
}

function countUrgent(assessments: HomeAssessment[]): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return assessments.filter((a) => {
    if (!a.due_date || a.status === 'completed' || a.status === 'expired') return false;
    const due = new Date(a.due_date);
    if (isNaN(due.getTime())) return false;
    due.setHours(0, 0, 0, 0);
    const days = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return days <= 3;
  }).length;
}

const AssessmentSection = memo(function AssessmentSection({
  assessments,
}: AssessmentSectionProps) {
  const { colors, isDark } = useTheme();
  const reduceMotion = useReducedMotion();
  const visible = assessments.slice(0, 3);
  const urgentCount = useMemo(() => countUrgent(assessments), [assessments]);

  return (
    <View style={{ gap: 14 }}>
      {/* ── Section header ── */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {/* Icon container — tinted, consistent with the design system */}
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              backgroundColor: `${colors.warning}1A`,
              alignItems: 'center',
              justifyContent: 'center',
              // @ts-ignore
              borderCurve: 'continuous',
            }}
          >
            <AssessmentIcon size={18} color={colors.warning} />
          </View>
          <View>
            <Text
              style={{
                color: colors.text,
                fontSize: fontSize.lg,
                fontWeight: fontWeight.bold,
                lineHeight: 22,
              }}
            >
              Assessments
            </Text>
            {urgentCount > 0 && (
              <Text
                style={{
                  color: colors.warning,
                  fontSize: 11,
                  fontWeight: fontWeight.semibold,
                  lineHeight: 14,
                }}
              >
                {urgentCount} due soon
              </Text>
            )}
          </View>
        </View>
        <Pressable
          onPress={() => router.push('/(student)/(tabs)/assessments')}
          accessibilityRole="button"
          accessibilityLabel="See all assessments"
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 8,
            backgroundColor: isDark ? colors.surfaceRaised : colors.surfaceOverlay,
            // @ts-ignore
            borderCurve: 'continuous',
          }}
        >
          <Text
            style={{
              color: colors.primary,
              fontWeight: fontWeight.semibold,
              fontSize: fontSize.sm,
            }}
          >
            See all
          </Text>
        </Pressable>
      </View>

      {/* ── Cards ── */}
      {visible.length === 0 ? (
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.springify().damping(20)}
          style={{
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            borderStyle: 'dashed',
            padding: 28,
            alignItems: 'center',
            gap: 8,
            // @ts-ignore
            borderCurve: 'continuous',
          }}
        >
          <AssessmentIcon size={28} color={colors.textTertiary} />
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: fontSize.base,
              fontWeight: fontWeight.semibold,
            }}
          >
            No assessments due
          </Text>
          <Text
            style={{
              color: colors.textTertiary,
              fontSize: fontSize.sm,
              textAlign: 'center',
            }}
          >
            You're all caught up for now.
          </Text>
        </Animated.View>
      ) : (
        <View style={{ gap: 10 }}>
          {visible.map((assessment, index) => {
            const canOpen =
              typeof assessment.test_id === 'number' &&
              Number.isFinite(assessment.test_id);
            const entering = reduceMotion
              ? undefined
              : FadeInDown.delay(index * 80).springify().damping(22);

            return (
              <Animated.View
                key={assessment.test_id ?? `${assessment.test_name}-${index}`}
                entering={entering}
              >
                <AssessmentListItem
                  assessment={assessment}
                  variant="dashboard"
                  onStartOrContinue={
                    canOpen
                      ? () =>
                          router.push({
                            pathname: '/(student)/assessment/[id]',
                            params: { id: String(assessment.test_id) },
                          })
                      : undefined
                  }
                  onOpenResults={
                    canOpen
                      ? () =>
                          router.push({
                            pathname: '/(student)/assessment/[id]',
                            params: { id: String(assessment.test_id), mode: 'results' },
                          })
                      : undefined
                  }
                />
              </Animated.View>
            );
          })}
        </View>
      )}
    </View>
  );
});

export default AssessmentSection;
