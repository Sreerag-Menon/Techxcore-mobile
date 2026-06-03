import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Badge } from '@/components';
import { useTheme, fontSize, fontWeight } from '@/theme';
import type { AssessmentStatus, HomeAssessment } from '@/types/assessment.types';
import { formatDate } from '@/utils';
import { getDaysUntilDue, getDueLabel } from '@/utils/assessments';

// ─── Status helpers ──────────────────────────────────────────────────────────

function formatAssessmentStatus(status?: AssessmentStatus): string {
  return status ? status.replace(/_/g, ' ') : 'scheduled';
}

type BadgeVariant = 'primary' | 'success' | 'warning' | 'neutral';

function getStatusBadgeVariant(status?: AssessmentStatus): BadgeVariant {
  switch (status) {
    case 'completed': return 'success';
    case 'in_progress': return 'warning';
    case 'expired': return 'neutral';
    case 'pending': return 'primary';
    default: return 'neutral';
  }
}

/**
 * Returns a fully-opaque accent color for the left status rail.
 * This is an intentional semantic indicator — not a decorative stripe.
 */
function getStatusRailColor(
  status: AssessmentStatus | undefined,
  colors: { success: string; warning: string; primary: string; border: string },
): string {
  switch (status) {
    case 'completed': return colors.success;
    case 'in_progress': return colors.warning;
    case 'pending': return colors.primary;
    default: return colors.border;
  }
}

// ─── Urgency helpers ─────────────────────────────────────────────────────────

// ─── Component ───────────────────────────────────────────────────────────────

export interface DashboardAssessmentCardProps {
  assessment: HomeAssessment;
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const DashboardAssessmentCard = memo(function DashboardAssessmentCard({
  assessment,
  onPress,
}: DashboardAssessmentCardProps) {
  const { colors, isDark } = useTheme();

  // Emil Kowalski: scale(0.97) on press for tactile feedback
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const handlePressIn = () => {
    if (onPress) scale.value = withSpring(0.97, { damping: 18, stiffness: 350 });
  };
  const handlePressOut = () => {
    if (onPress) scale.value = withSpring(1, { damping: 18, stiffness: 350 });
  };

  // Data
  const railColor = getStatusRailColor(assessment.status, colors);
  const badgeVariant = getStatusBadgeVariant(assessment.status);
  const daysUntilDue = getDaysUntilDue(assessment.due_date);
  const { label: dueBadgeLabel, urgent } = getDueLabel(daysUntilDue);

  const metrics: { label: string; value: string }[] = [];
  if (typeof assessment.total_questions === 'number') {
    metrics.push({ label: 'questions', value: String(assessment.total_questions) });
  }
  if (typeof assessment.total_marks === 'number') {
    metrics.push({ label: 'marks', value: String(assessment.total_marks) });
  }

  const cardBg = isDark ? colors.surface : colors.surface;
  const cardBorder = isDark ? colors.border : colors.border;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={assessment.test_name}
      style={[
        animatedStyle,
        {
          flexDirection: 'row',
          backgroundColor: cardBg,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: cardBorder,
          overflow: 'hidden',
          // @ts-ignore
          borderCurve: 'continuous',
          // @ts-ignore
          boxShadow: isDark
            ? '0 2px 8px rgba(0,0,0,0.3)'
            : '0 1px 4px rgba(13,17,23,0.06)',
        },
      ]}
    >
      {/* ── Left status rail — semantic, not decorative ── */}
      <View
        style={{
          width: 4,
          backgroundColor: railColor,
          borderTopLeftRadius: 16,
          borderBottomLeftRadius: 16,
        }}
      />

      {/* ── Card body ── */}
      <View style={{ flex: 1, padding: 14, gap: 10 }}>
        {/* Row 1: Title + Status badge */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 10,
          }}
        >
          <Text
            style={{
              flex: 1,
              color: colors.text,
              fontSize: fontSize.base,
              fontWeight: fontWeight.bold,
              lineHeight: 22,
            }}
            numberOfLines={2}
          >
            {assessment.test_name}
          </Text>
          <Badge
            label={formatAssessmentStatus(assessment.status)}
            variant={badgeVariant}
            size="sm"
          />
        </View>

        {/* Row 2: Metric pills — questions · marks */}
        {metrics.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {metrics.map((m) => (
              <View
                key={m.label}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: isDark
                    ? colors.surfaceRaised
                    : colors.surfaceOverlay,
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 12,
                    fontWeight: fontWeight.bold,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {m.value}
                </Text>
                <Text
                  style={{
                    color: colors.textTertiary,
                    fontSize: 12,
                  }}
                >
                  {m.label}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Row 3: Due date chip — urgent = warning tint */}
        {dueBadgeLabel ? (
          <View
            style={{
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              backgroundColor: urgent
                ? `${colors.warning}1A`
                : isDark
                  ? colors.surfaceRaised
                  : colors.surfaceOverlay,
              borderRadius: 6,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderWidth: urgent ? 1 : 0,
              borderColor: urgent ? `${colors.warning}40` : 'transparent',
            }}
          >
            {/* Pulse dot for urgent items */}
            {urgent && (
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: colors.warning,
                }}
              />
            )}
            <Text
              style={{
                color: urgent ? colors.warning : colors.textSecondary,
                fontSize: 12,
                fontWeight: urgent ? fontWeight.semibold : fontWeight.regular,
              }}
            >
              {dueBadgeLabel}
            </Text>
          </View>
        ) : null}
      </View>
    </AnimatedPressable>
  );
});

export default DashboardAssessmentCard;
