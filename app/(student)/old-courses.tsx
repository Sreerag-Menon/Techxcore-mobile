import { useCallback, useEffect, useMemo, useState } from 'react';
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
} from '../../src/components';
import { ScreenLayout } from '../../src/layouts';
import { useAppDispatch, useAppSelector } from '../../src/redux';
import { fetchOldCourses } from '../../src/redux/slices/courseSlice';
import {
  navigateToCourse,
  navigateToCourseDetails,
} from '../../src/services/courseNavigation';
import { useTheme } from '../../src/theme';
import type { Course } from '../../src/types/course.types';

export default function OldCoursesScreen() {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const { oldCourses, isLoadingOldCourses, oldCoursesError } = useAppSelector(
    (state) => state.course,
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    await dispatch(fetchOldCourses()).unwrap();
  }, [dispatch]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await load();
    } finally {
      setIsRefreshing(false);
    }
  }, [load]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return oldCourses;
    return oldCourses.filter((c) => c.course_name.toLowerCase().includes(q));
  }, [oldCourses, searchQuery]);

  const renderActions = (course: Course) => (
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
      <Button title="View details" size="sm" variant="outline" onPress={() => navigateToCourseDetails(course)} />
      <Button title="Open" size="sm" onPress={() => navigateToCourse(course)} />
    </View>
  );

  return (
    <ScreenLayout refreshing={isRefreshing} onRefresh={onRefresh}>
      <View style={{ gap: 16, padding: 16 }}>
        <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>Old Courses</Text>
        <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>
          Courses from previous academic years.
        </Text>

        <Input
          label="Search"
          placeholder="Search old courses"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {oldCoursesError && !oldCourses.length && !isLoadingOldCourses ? (
          <ErrorState title="Unable to load" message={oldCoursesError} onRetry={() => void load()} />
        ) : null}

        {isLoadingOldCourses && !oldCourses.length ? (
          <View style={{ gap: 16 }}>
            {[0, 1].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </View>
        ) : filtered.length === 0 ? (
          <EmptyState title="No old courses" message="No previous-year courses were found." />
        ) : (
          filtered.map((course) => (
            <Card key={course.course_publish_id} variant="elevated" padding="lg">
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', flex: 1 }}>
                    {course.course_name}
                  </Text>
                  <Badge label={course.status.replace('_', ' ')} variant="neutral" />
                </View>
                <ProgressBar progress={course.progress_percentage} showLabel />
                {renderActions(course)}
              </View>
            </Card>
          ))
        )}
      </View>
    </ScreenLayout>
  );
}
