import { useCallback, useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  ProgressBar,
  SkeletonCard,
} from '../../../src/components';
import { ScreenLayout, TabLayout } from '../../../src/layouts';
import { useAppDispatch, useAppSelector } from '../../../src/redux';
import { fetchCourses } from '../../../src/redux/slices/courseSlice';
import { useTheme } from '../../../src/theme';

type CourseFilter = 'all' | 'in_progress' | 'completed';

export default function CoursesScreen() {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
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

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesSearch = [course.course_name, course.course_description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(searchQuery.trim().toLowerCase());

      const matchesFilter =
        activeFilter === 'all' ? true : course.status === activeFilter;

      return matchesSearch && matchesFilter;
    });
  }, [activeFilter, courses, searchQuery]);

  return (
    <ScreenLayout refreshing={isRefreshing} onRefresh={onRefresh}>
      <TabLayout
        title="Courses"
        subtitle="Browse your enrolled courses, search by title, and jump back into the next lesson."
      >
        <Input
          label="Search"
          placeholder="Search courses"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          {(['all', 'in_progress', 'completed'] as CourseFilter[]).map((filter) => (
            <Button
              key={filter}
              title={filter.replace('_', ' ')}
              onPress={() => setActiveFilter(filter)}
              variant={activeFilter === filter ? 'primary' : 'outline'}
              size="sm"
            />
          ))}
        </View>

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
          <View style={{ gap: 16 }}>
            {[0, 1, 2].map((item) => (
              <SkeletonCard key={item} />
            ))}
          </View>
        ) : filteredCourses.length === 0 ? (
          <EmptyState
            title="No matching courses"
            message="Try a different search term or switch the filter to view all courses."
          />
        ) : (
          filteredCourses.map((course) => (
            <Card
              key={course.course_publish_id || course.course_id}
              variant="elevated"
              padding="lg"
              onPress={() =>
                router.push({
                  pathname: '/(student)/course/[id]',
                  params: {
                    id: String(course.course_publish_id || course.course_id),
                  },
                })
              }
            >
              <View style={{ gap: 12 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 17,
                        fontWeight: '700',
                      }}
                    >
                      {course.course_name}
                    </Text>
                    {course.course_description ? (
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: 13,
                          lineHeight: 19,
                        }}
                        numberOfLines={2}
                      >
                        {course.course_description}
                      </Text>
                    ) : null}
                  </View>
                  <Badge
                    label={course.status.replace('_', ' ')}
                    variant={
                      course.status === 'completed'
                        ? 'success'
                        : course.status === 'in_progress'
                          ? 'primary'
                          : 'neutral'
                    }
                  />
                </View>

                <ProgressBar progress={course.progress_percentage || 0} showLabel />

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {course.completed_modules || 0}/{course.total_modules || 0} modules
                  </Text>
                  {course.duration ? (
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      {course.duration}
                    </Text>
                  ) : null}
                </View>
              </View>
            </Card>
          ))
        )}
      </TabLayout>
    </ScreenLayout>
  );
}
