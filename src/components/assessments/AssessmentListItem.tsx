import { Ionicons } from '@expo/vector-icons';
import { memo, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Badge, Button } from '@/components';
import { useTheme, fontSize, fontWeight } from '@/theme';
import type { Assessment, AssessmentStatus, HomeAssessment } from '@/types/assessment.types';
import {
  formatAssessmentStatus,
  getDaysUntilDue,
  getDueLabel,
  normalizeAssessmentStatus,
} from '@/utils/assessments';

export type AssessmentListItemVariant = 'dashboard' | 'list';

export interface AssessmentListItemProps {
  assessment: Assessment | HomeAssessment;
  variant?: AssessmentListItemVariant;
  onStartOrContinue?: () => void;
  onOpenResults?: () => void;
}

function badgeVariantForStatus(
  status: AssessmentStatus,
): 'primary' | 'success' | 'warning' | 'neutral' {
  switch (status) {
    case 'completed':
      return 'success';
    case 'in_progress':
      return 'warning';
    case 'expired':
      return 'neutral';
    case 'pending':
    default:
      return 'primary';
  }
}

function iconForStatus(status: AssessmentStatus): keyof typeof Ionicons.glyphMap {
  switch (status) {
    case 'completed':
      return 'checkmark-circle';
    case 'in_progress':
      return 'play-circle';
    case 'expired':
      return 'lock-closed';
    case 'pending':
    default:
      return 'time';
  }
}

function primaryActionForStatus(status: AssessmentStatus): {
  label: string;
  kind: 'attempt' | 'results' | 'none';
} {
  switch (status) {
    case 'pending':
      return { label: 'Start', kind: 'attempt' };
    case 'in_progress':
      return { label: 'Continue', kind: 'attempt' };
    case 'completed':
      return { label: 'Results', kind: 'results' };
    case 'expired':
    default:
      return { label: 'Expired', kind: 'none' };
  }
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const AssessmentListItem = memo(function AssessmentListItem({
  assessment,
  variant = 'list',
  onStartOrContinue,
  onOpenResults,
}: AssessmentListItemProps) {
  const { colors, isDark } = useTheme();
  const reduceMotion = useReducedMotion();

  const status = normalizeAssessmentStatus(assessment.status);
  const due = useMemo(() => {
    const days = getDaysUntilDue(assessment.due_date);
    return getDueLabel(days);
  }, [assessment.due_date]);

  const action = primaryActionForStatus(status);
  const badgeVariant = badgeVariantForStatus(status);

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isInteractive = action.kind !== 'none';
  const handlePressIn = () => {
    if (!isInteractive) return;
    if (reduceMotion) return;
    scale.value = withSpring(0.98, { damping: 18, stiffness: 350 });
  };
  const handlePressOut = () => {
    if (!isInteractive) return;
    if (reduceMotion) return;
    scale.value = withSpring(1, { damping: 18, stiffness: 350 });
  };

  const metaParts: string[] = [];
  if (typeof assessment.total_questions === 'number') {
    metaParts.push(`${assessment.total_questions} qns`);
  }
  if (typeof assessment.total_marks === 'number') {
    metaParts.push(`${assessment.total_marks} marks`);
  }
  if (typeof assessment.duration_minutes === 'number' && assessment.duration_minutes > 0) {
    metaParts.push(`${assessment.duration_minutes} min`);
  }
  if ('attempts_used' in assessment && 'attempts_allowed' in assessment) {
    if (
      typeof assessment.attempts_used === 'number' &&
      typeof assessment.attempts_allowed === 'number' &&
      assessment.attempts_allowed > 0
    ) {
      metaParts.push(`${assessment.attempts_used}/${assessment.attempts_allowed} attempts`);
    }
  }
  if ('percentage' in assessment && typeof assessment.percentage === 'number') {
    metaParts.push(`Score ${Math.round(assessment.percentage)}%`);
  }

  const nodeTint =
    status === 'completed'
      ? colors.success
      : status === 'in_progress'
        ? colors.warning
        : status === 'expired'
          ? colors.textTertiary
          : colors.primary;

  const handlePrimary = () => {
    if (action.kind === 'attempt') onStartOrContinue?.();
    if (action.kind === 'results') onOpenResults?.();
  };

  const handlePress = () => {
    if (!isInteractive) return;
    handlePrimary();
  };

  const dense = variant === 'dashboard';

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`${assessment.test_name}. ${formatAssessmentStatus(status)}.${due.label ? ` ${due.label}.` : ''}`}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!isInteractive}
      style={[
        animatedStyle,
        {
          flexDirection: 'row',
          gap: 12,
          alignItems: 'flex-start',
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: dense ? 12 : 14,
          // @ts-ignore
          borderCurve: 'continuous',
          // @ts-ignore
          boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.28)' : '0 2px 8px rgba(13,17,23,0.06)',
          opacity: status === 'expired' ? 0.85 : 1,
        },
      ]}
    >
      {/* Timeline node */}
      <View style={{ paddingTop: 2 }}>
        <View
          style={{
            width: dense ? 38 : 42,
            height: dense ? 38 : 42,
            borderRadius: 14,
            backgroundColor: `${nodeTint}1A`,
            alignItems: 'center',
            justifyContent: 'center',
            // @ts-ignore
            borderCurve: 'continuous',
          }}
        >
          <Ionicons name={iconForStatus(status)} size={22} color={nodeTint} />
        </View>
        {/* Connector hint (timeline feel) */}
        <View
          pointerEvents="none"
          style={{
            alignSelf: 'center',
            width: 2,
            height: dense ? 18 : 22,
            marginTop: 8,
            borderRadius: 1,
            backgroundColor: colors.divider,
            opacity: 0.8,
          }}
        />
      </View>

      {/* Content */}
      <View style={{ flex: 1, gap: dense ? 8 : 10 }}>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <Text
            style={{
              flex: 1,
              color: colors.text,
              fontSize: dense ? fontSize.sm : fontSize.base,
              fontWeight: fontWeight.bold,
              lineHeight: dense ? 20 : 22,
            }}
            numberOfLines={dense ? 1 : 2}
          >
            {assessment.test_name || 'Assessment'}
          </Text>
          <Badge label={formatAssessmentStatus(status)} variant={badgeVariant} size="sm" />
        </View>

        {due.label ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {due.urgent ? (
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: colors.warning,
                }}
              />
            ) : null}
            <Text
              style={{
                color: due.urgent ? colors.warning : colors.textSecondary,
                fontSize: fontSize.xs,
                fontWeight: due.urgent ? fontWeight.semibold : fontWeight.regular,
              }}
              numberOfLines={1}
            >
              {due.label}
            </Text>
          </View>
        ) : null}

        {metaParts.length ? (
          <Text
            style={{
              color: colors.textTertiary,
              fontSize: 12,
              lineHeight: 16,
              fontVariant: ['tabular-nums'],
            }}
            numberOfLines={dense ? 1 : 2}
          >
            {metaParts.join(' · ')}
          </Text>
        ) : null}

        {variant === 'list' ? (
          <View style={{ alignSelf: 'flex-start' }}>
            <Button
              title={action.label}
              onPress={handlePrimary}
              size="sm"
              variant={action.kind === 'none' ? 'outline' : 'primary'}
              disabled={action.kind === 'none'}
              pill
            />
          </View>
        ) : null}
      </View>
    </AnimatedPressable>
  );
});

export default AssessmentListItem;

