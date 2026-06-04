import { memo, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme, fontSize, fontWeight } from '@/theme';
import { getCoverGradient, getCourseInitials } from '@/utils/courseCover';
import type { Course } from '@/types/course.types';

// ─── Component ───────────────────────────────────────────────────────────────

export interface DashboardCourseCardProps {
  course: Course;
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const DashboardCourseCard = memo(function DashboardCourseCard({
  course,
  onPress,
}: DashboardCourseCardProps) {
  const { colors, isDark } = useTheme();

  // Emil Kowalski: scale(0.97) spring on press
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 18, stiffness: 350 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 18, stiffness: 350 });
  };

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

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={course.course_name}
      style={[
        animatedStyle,
        {
          width: 260,
          borderRadius: 16,
          overflow: 'hidden',
          // @ts-ignore
          borderCurve: 'continuous',
          backgroundColor: isDark ? colors.surface : colors.surface,
          borderWidth: 1,
          borderColor: isDark ? colors.border : colors.border,
          // @ts-ignore
          boxShadow: isDark
            ? '0 4px 16px rgba(0,0,0,0.4)'
            : '0 2px 12px rgba(13,17,23,0.08)',
        },
      ]}
    >
      {/* ── Cover area ── */}
      <LinearGradient
        colors={[gradStart, gradEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          height: 88,
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 10,
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        {/* Initials monogram */}
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            backgroundColor: 'rgba(255,255,255,0.14)',
            alignItems: 'center',
            justifyContent: 'center',
            // @ts-ignore
            borderCurve: 'continuous',
          }}
        >
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: fontWeight.bold,
              letterSpacing: 0.5,
            }}
          >
            {initials}
          </Text>
        </View>

        {/* Progress percentage — top right, white on gradient */}
        <View style={{ alignItems: 'flex-end' }}>
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 22,
              fontWeight: '800',
              fontVariant: ['tabular-nums'],
              lineHeight: 26,
            }}
          >
            {Math.round(progress)}
            <Text style={{ fontSize: 12, fontWeight: fontWeight.medium }}>%</Text>
          </Text>
          <Text
            style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: 10,
              fontWeight: fontWeight.medium,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginTop: 1,
            }}
          >
            done
          </Text>
        </View>
      </LinearGradient>

      {/* ── Progress bar — directly below cover, acts as a visual seam ── */}
      <View
        style={{
          height: 4,
          backgroundColor: colors.border,
        }}
      >
        <View
          style={{
            height: 4,
            width: `${progress}%`,
            backgroundColor: statusColor,
          }}
        />
      </View>

      {/* ── Card body ── */}
      <View style={{ padding: 14, gap: 8 }}>
        <Text
          style={{
            color: colors.text,
            fontSize: fontSize.base,
            fontWeight: fontWeight.bold,
            lineHeight: 22,
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
            numberOfLines={2}
          >
            {course.course_description}
          </Text>
        ) : null}

        {/* Footer: Status chip */}
        <View style={{ marginTop: 2 }}>
          <View
            style={{
              alignSelf: 'flex-start',
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
      </View>
    </AnimatedPressable>
  );
});

export default DashboardCourseCard;
