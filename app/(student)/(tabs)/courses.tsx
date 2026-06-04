import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReducedMotion } from 'react-native-reanimated';

import { EmptyState, ErrorState, Input, SkeletonCard } from '@/components';
import { CourseListCard } from '@/components/dashboard';
import { getFloatingTabBarScrollPadding, TabPill } from '@/components/ui';
import { useResponsive } from '@/hooks';
import { useAppDispatch, useAppSelector } from '@/redux';
import { fetchCourses } from '@/redux/slices/courseSlice';
import { navigateToCourse } from '@/services/courseNavigation';
import { fontSize, fontWeight, useTheme } from '@/theme';
import type { Course } from '@/types/course.types';

type CourseFilter = 'all' | 'in_progress' | 'not_started' | 'completed';

const FILTER_OPTIONS: { key: CourseFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'not_started', label: 'Not started' },
  { key: 'completed', label: 'Completed' },
];

function countByStatus(courses: Course[], status: Course['status']): number {
  return courses.filter((c) => c.status === status).length;
}

function getEmptyStateCopy(
  filter: CourseFilter,
  hasSearch: boolean,
): { title: string; message: string } {
  if (hasSearch) {
    return {
      title: 'No matching courses',
      message: 'Try a different search term or clear the filter to see more courses.',
    };
  }

  switch (filter) {
    case 'in_progress':
      return {
        title: 'No courses in progress',
        message: 'Open a course from your list and start a lesson to see it here.',
      };
    case 'not_started':
      return {
        title: 'Nothing to start yet',
        message: 'All your enrolled courses are already underway — pick one to resume.',
      };
    case 'completed':
      return {
        title: 'No completed courses',
        message: 'Finish a course to see it here. Your progress is saved as you go.',
      };
    default:
      return {
        title: 'No enrolled courses',
        message: 'Courses assigned to you will appear here once they are published.',
      };
  }
}

export default function CoursesScreen() {
  const dispatch = useAppDispatch();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const tabBarPadding = getFloatingTabBarScrollPadding(insets.bottom);
  const { horizontalPadding } = useResponsive();

  const { courses, isLoading, error } = useAppSelector((state) => state.course);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<CourseFilter>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadCourses = useCallback(async () => {
    await dispatch(fetchCourses()).unwrap();
  }, [dispatch]);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadCourses();
    } finally {
      setIsRefreshing(false);
    }
  }, [loadCourses]);

  const statusCounts = useMemo(
    () => ({
      all: courses.length,
      in_progress: countByStatus(courses, 'in_progress'),
      not_started: countByStatus(courses, 'not_started'),
      completed: countByStatus(courses, 'completed'),
    }),
    [courses],
  );

  const filteredCourses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return courses.filter((course) => {
      const matchesSearch =
        query.length === 0 ||
        [course.course_name, course.course_description]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query);

      const matchesFilter =
        activeFilter === 'all' ? true : course.status === activeFilter;

      return matchesSearch && matchesFilter;
    });
  }, [activeFilter, courses, searchQuery]);

  const hasSearch = searchQuery.trim().length > 0;
  const emptyCopy = getEmptyStateCopy(activeFilter, hasSearch);

  const pillActiveBg = `${colors.primary}18`;
  const pillInactiveBg = isDark ? colors.surfaceRaised : colors.surfaceOverlay;

  const renderHeader = () => (
    <View style={{ gap: 14, paddingBottom: 4 }}>
      {/* Page title */}
      <Text
        style={{
          color: colors.text,
          fontSize: 28,
          fontWeight: '700',
          letterSpacing: -0.3,
        }}
      >
        Courses
      </Text>

      <Input
        placeholder="Search courses"
        value={searchQuery}
        onChangeText={setSearchQuery}
        leftIcon={<Ionicons name="search-outline" size={20} color={colors.textTertiary} />}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 4 }}
      >
        {FILTER_OPTIONS.map(({ key, label }) => (
          <TabPill
            key={key}
            label={label}
            count={statusCounts[key]}
            showCount
            isActive={activeFilter === key}
            onPress={() => setActiveFilter(key)}
            activeColor={colors.primary}
            activeBg={pillActiveBg}
            inactiveColor={colors.textSecondary}
            inactiveBg={pillInactiveBg}
            borderColor={`${colors.primary}40`}
            inactiveBorder={colors.border}
          />
        ))}
      </ScrollView>

      {!isLoading || courses.length > 0 ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: fontSize.sm,
              fontWeight: fontWeight.medium,
            }}
          >
            {filteredCourses.length === 1
              ? '1 course'
              : `${filteredCourses.length} courses`}
          </Text>
          <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs }}>
            Sorted by enrollment
          </Text>
        </View>
      ) : null}

      {error && !courses.length && !isLoading ? (
        <ErrorState
          title="Courses unavailable"
          message={error}
          onRetry={() => {
            void loadCourses();
          }}
        />
      ) : null}

      {isLoading && !courses.length ? (
        <View style={{ gap: 12 }}>
          {[0, 1, 2].map((item) => (
            <SkeletonCard key={item} />
          ))}
        </View>
      ) : null}
    </View>
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Course; index: number }) => {
      const entering = reduceMotion
        ? undefined
        : FadeInDown.delay(index * 60).springify().damping(20);

      return (
        <Animated.View entering={entering} style={{ marginBottom: 12 }}>
          <CourseListCard
            course={item}
            onPress={() => navigateToCourse(item)}
          />
        </Animated.View>
      );
    },
    [reduceMotion],
  );

  const listEmpty =
    !isLoading && courses.length > 0 && filteredCourses.length === 0 ? (
      <EmptyState title={emptyCopy.title} message={emptyCopy.message} />
    ) : !isLoading && courses.length === 0 && !error ? (
      <EmptyState title={emptyCopy.title} message={emptyCopy.message} />
    ) : null;

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <FlatList
        style={{ flex: 1 }}
        data={isLoading && !courses.length ? [] : filteredCourses}
        keyExtractor={(item) => String(item.course_publish_id || item.course_id)}
        key={activeFilter}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={{
          paddingHorizontal: horizontalPadding,
          paddingTop: 16,
          paddingBottom: tabBarPadding + 24,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />
    </SafeAreaView>
  );
}
