import { memo, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme, fontSize, fontWeight } from '@/theme';
import type { Course } from '@/types/course.types';

// ─── Cover palette ───────────────────────────────────────────────────────────
// Intentional brand-derived covers — not random colors. Six hue families that
// all coexist with the teal primary. Rotated by course ID so each card has its
// own identity in the list.
const COVER_GRADIENTS: readonly [string, string][] = [
  ['#0F4F4A', '#082D2A'],  // deep teal  (brand home)
  ['#1A3A5C', '#0D2035'],  // navy
  ['#3B1F5C', '#200F35'],  // deep violet
  ['#14402A', '#0A2418'],  // forest
  ['#4A2E08', '#281904'],  // amber-brown
  ['#3D1818', '#1F0C0C'],  // deep crimson
];

function getCoverGradient(seed: number): readonly [string, string] {
  return COVER_GRADIENTS[Math.abs(seed) % COVER_GRADIENTS.length];
}

// Derives a human-readable subject abbreviation from the course name
function getCourseInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return name.slice(0, 2).toUpperCase();
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

// ─── Progress ring (pure SVG-free, just a styled arc illusion using Views) ──
// We use a simple segmented bar approach since RN doesn't have SVG in scope
// for this component, and importing the full SVG stack for a progress ring
// would be over-engineered at this card width.
interface ProgressRingProps {
  progress: number; // 0–100
  size?: number;
  strokeWidth?: number;
  trackColor: string;
  fillColor: string;
}

const ProgressRing = memo(function ProgressRing({
  progress,
  size = 44,
  strokeWidth = 4,
  trackColor,
  fillColor,
}: ProgressRingProps) {
  const clamp = Math.min(100, Math.max(0, progress));

  // Build two arc segments with View-based approach
  // We use a pie slice trick: a circle split by a dividing View
  const r = (size - strokeWidth) / 2;
  const degreesForProgress = (clamp / 100) * 360;

  const innerSize = size - strokeWidth * 2;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: trackColor,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Filled segment — conic gradient approximation via two halves */}
      {degreesForProgress > 0 && (
        <View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: fillColor,
            // Clip to show only the filled portion using rotation
            // For < 50%: fill right half, rotate the mask
            // For >= 50%: fill left half too
            transform: [{ rotate: `${degreesForProgress - 90}deg` }],
          }}
        />
      )}
      {/* Center cutout — creates the donut ring */}
      <View
        style={{
          width: innerSize,
          height: innerSize,
          borderRadius: innerSize / 2,
          // Use theme background to create cutout effect
          zIndex: 2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      />
    </View>
  );
});

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
          borderRadius: 18,
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
          height: 3,
          backgroundColor: isDark ? colors.border : colors.border,
        }}
      >
        <View
          style={{
            height: 3,
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
              backgroundColor: `${statusColor}18`,
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
