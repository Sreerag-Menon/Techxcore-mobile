import { memo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';

import { SkeletonCard } from '@/components';
import { TabPill } from '@/components/ui';
import { useTheme, fontSize, fontWeight } from '@/theme';
import { CoursesIcon } from '@/components/icons/menu';
import type { Course } from '@/types/course.types';

import DashboardCourseCard from './DashboardCourseCard';

type CourseTab = 'enrolled' | 'open';

export interface CourseSectionProps {
  enrolled: Course[];
  open: Course[];
  isLoadingEnrolled?: boolean;
  isLoadingOpen?: boolean;
}

// ─── Main section ─────────────────────────────────────────────────────────────

const CourseSection = memo(function CourseSection({
  enrolled,
  open,
  isLoadingEnrolled = false,
  isLoadingOpen = false,
}: CourseSectionProps) {
  const { colors, isDark } = useTheme();
  const reduceMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<CourseTab>('enrolled');

  const courses = activeTab === 'enrolled' ? enrolled : open;
  const isLoading = activeTab === 'enrolled' ? isLoadingEnrolled : isLoadingOpen;

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
          {/* Icon well — tinted with primary brand color */}
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              backgroundColor: `${colors.primary}1A`,
              alignItems: 'center',
              justifyContent: 'center',
              // @ts-ignore
              borderCurve: 'continuous',
            }}
          >
            <CoursesIcon size={18} color={colors.primary} />
          </View>
          <Text
            style={{
              color: colors.text,
              fontSize: fontSize.lg,
              fontWeight: fontWeight.bold,
            }}
          >
            My Courses
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/(student)/(tabs)/courses')}
          accessibilityRole="button"
          accessibilityLabel="See all courses"
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

      {/* ── Tab switcher — spring animated pills with count badges ── */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TabPill
          label="Enrolled"
          count={enrolled.length}
          showCount
          isActive={activeTab === 'enrolled'}
          onPress={() => setActiveTab('enrolled')}
          activeColor={colors.primary}
          activeBg={`${colors.primary}18`}
          inactiveColor={colors.textSecondary}
          inactiveBg={isDark ? colors.surfaceRaised : colors.surfaceOverlay}
          borderColor={`${colors.primary}40`}
          inactiveBorder={colors.border}
        />
        <TabPill
          label="Open"
          count={open.length}
          showCount
          isActive={activeTab === 'open'}
          onPress={() => setActiveTab('open')}
          activeColor={colors.primary}
          activeBg={`${colors.primary}18`}
          inactiveColor={colors.textSecondary}
          inactiveBg={isDark ? colors.surfaceRaised : colors.surfaceOverlay}
          borderColor={`${colors.primary}40`}
          inactiveBorder={colors.border}
        />
      </View>

      {/* ── Course list — FadeIn on tab switch ── */}
      {isLoading && courses.length === 0 ? (
        <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(200)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingRight: 4 }}
          >
            {[0, 1].map((item) => (
              <View key={item} style={{ width: 260 }}>
                <SkeletonCard />
              </View>
            ))}
          </ScrollView>
        </Animated.View>
      ) : courses.length === 0 ? (
        <Animated.View
          entering={reduceMotion ? undefined : FadeIn.duration(200)}
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
          <CoursesIcon size={28} color={colors.textTertiary} />
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: fontSize.base,
              fontWeight: fontWeight.semibold,
            }}
          >
            {activeTab === 'enrolled' ? 'No enrolled courses' : 'No open courses'}
          </Text>
          <Text
            style={{
              color: colors.textTertiary,
              fontSize: fontSize.sm,
              textAlign: 'center',
            }}
          >
            {activeTab === 'enrolled'
              ? 'Your enrolled courses appear here once published.'
              : 'Open courses available to you will show up here.'}
          </Text>
        </Animated.View>
      ) : (
        <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(180)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingRight: 4 }}
          >
            {courses.slice(0, 6).map((course, index) => {
              const cardEntering = reduceMotion
                ? undefined
                : FadeInRight.delay(index * 70).springify().damping(22);

              return (
                <Animated.View
                  key={course.course_publish_id || course.course_id}
                  entering={cardEntering}
                >
                  <DashboardCourseCard
                    course={course}
                    onPress={() =>
                      router.push({
                        pathname: '/(student)/course/[id]',
                        params: {
                          id: String(course.course_publish_id || course.course_id),
                        },
                      })
                    }
                  />
                </Animated.View>
              );
            })}
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
});

export default CourseSection;
