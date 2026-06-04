import { memo, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme, fontSize, fontWeight } from '@/theme';
import {
  getCoverGradient,
  getCourseCtaLabel,
  getCourseInitials,
} from '@/utils/courseCover';
import type { Course } from '@/types/course.types';

const SPRING = { damping: 18, stiffness: 350 };

export interface CourseListCardProps {
  course: Course;
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const CourseListCard = memo(function CourseListCard({
  course,
  onPress,
}: CourseListCardProps) {
  const { colors, isDark } = useTheme();

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const seed = course.course_publish_id ?? course.course_id ?? 0;
  const [gradStart, gradEnd] = getCoverGradient(seed);
  const initials = useMemo(() => getCourseInitials(course.course_name), [course.course_name]);
  const progress = course.progress_percentage ?? 0;
  const statusLabel = course.status.replace(/_/g, ' ');
  const statusColor =
    course.status === 'completed'
      ? colors.success
      : course.status === 'in_progress'
        ? colors.primary
        : colors.textTertiary;

  const ctaLabel = getCourseCtaLabel(course.status);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.97, SPRING);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SPRING);
      }}
      accessibilityRole="button"
      accessibilityLabel={`${course.course_name}, ${Math.round(progress)} percent complete`}
      style={[
        animatedStyle,
        {
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          // @ts-ignore
          borderCurve: 'continuous',
          // @ts-ignore
          boxShadow: isDark
            ? '0 4px 16px rgba(0,0,0,0.35)'
            : '0 2px 12px rgba(13,17,23,0.06)',
        },
      ]}
    >
      <View style={{ flex: 1, padding: 14, gap: 10 }}>

        {/* ── Title row: gradient avatar chip + course name ── */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>

          {/* Gradient avatar chip — carries per-course color identity */}
          <LinearGradient
            colors={[gradStart, gradEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              // @ts-ignore
              borderCurve: 'continuous',
              flexShrink: 0,
            }}
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 14,
                fontWeight: fontWeight.bold,
                letterSpacing: 0.3,
              }}
            >
              {initials}
            </Text>
          </LinearGradient>

          <View style={{ flex: 1, gap: 3 }}>
            <Text
              style={{
                color: colors.text,
                fontSize: fontSize.lg,
                fontWeight: fontWeight.bold,
                lineHeight: 24,
              }}
              numberOfLines={2}
            >
              {course.course_name}
            </Text>
            {course.course_description ? (
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: fontSize.sm,
                  lineHeight: 18,
                }}
                numberOfLines={1}
              >
                {course.course_description}
              </Text>
            ) : null}
          </View>
        </View>

        {/* ── Progress row: bar + percentage ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.border,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: 4,
                width: `${Math.min(100, Math.max(0, progress))}%`,
                backgroundColor: statusColor,
                borderRadius: 2,
              }}
            />
          </View>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: fontSize.sm,
              fontWeight: fontWeight.semibold,
              fontVariant: ['tabular-nums'],
              minWidth: 36,
              textAlign: 'right',
            }}
          >
            {Math.round(progress)}%
          </Text>
        </View>

        {/* ── Meta row: modules, duration, status chip ── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs }}>
            {course.completed_modules ?? 0}/{course.total_modules ?? 0} modules
            {course.duration ? ` · ${course.duration}` : ''}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              backgroundColor: `${statusColor}22`,
              borderRadius: 6,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: statusColor,
              }}
            />
            <Text
              style={{
                color: statusColor,
                fontSize: 11,
                fontWeight: fontWeight.semibold,
                textTransform: 'capitalize',
              }}
            >
              {statusLabel}
            </Text>
          </View>
        </View>

        {course.pending_test === 1 ? (
          <Text
            style={{
              color: colors.warning,
              fontSize: fontSize.xs,
              fontWeight: fontWeight.medium,
            }}
          >
            Pending assessment — complete before opening
          </Text>
        ) : null}

        {/* ── CTA button ── */}
        <View
          style={{
            backgroundColor: colors.primary,
            borderRadius: 12,
            paddingVertical: 10,
            alignItems: 'center',
            // @ts-ignore
            borderCurve: 'continuous',
          }}
        >
          <Text
            style={{
              color: colors.onPrimary,
              fontSize: fontSize.sm,
              fontWeight: fontWeight.semibold,
            }}
          >
            {ctaLabel}
          </Text>
        </View>
      </View>
    </AnimatedPressable>
  );
});

export default CourseListCard;
