import { useCallback, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { Button, Card, EmptyState, ErrorState } from '../../../src/components';
import { ScreenLayout } from '../../../src/layouts';
import { useAppDispatch, useAppSelector } from '../../../src/redux';
import { fetchCourses, subscribeToCourse } from '../../../src/redux/slices/courseSlice';
import { useTheme } from '../../../src/theme';
import type { CourseVariant } from '../../../src/types/course.types';

export default function CourseVariantsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const courses = useAppSelector((state) => state.course.courses);
  const [pendingVariantId, setPendingVariantId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const course = useMemo(
    () => courses.find((c) => String(c.course_publish_id) === String(id)),
    [courses, id],
  );

  const variants: CourseVariant[] = useMemo(() => {
    if (course?.course_list?.length) return course.course_list;
    return (course?.course_ids ?? []).map((course_id) => ({
      course_id,
      course_name: course?.course_name ?? 'Course variant',
      curriculum_id: course?.curriculum_id,
      confirm: 1,
    }));
  }, [course]);

  const openVariant = useCallback(
    async (variant: CourseVariant) => {
      if (!course) return;
      setError(null);
      setPendingVariantId(variant.course_id);

      try {
        if (variant.confirm === 0) {
          await dispatch(
            subscribeToCourse({
              coursePublishId: course.course_publish_id,
              courseId: variant.course_id,
            }),
          ).unwrap();
          await dispatch(fetchCourses()).unwrap();
        }

        router.push({
          pathname: '/(student)/course/[id]',
          params: {
            id: String(course.course_publish_id),
            courseId: String(variant.course_id),
            ...(variant.curriculum_id != null
              ? { curriculumId: String(variant.curriculum_id) }
              : course.curriculum_id != null
                ? { curriculumId: String(course.curriculum_id) }
                : {}),
          },
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not subscribe to this course');
      } finally {
        setPendingVariantId(null);
      }
    },
    [course, dispatch],
  );

  if (!course) {
    return (
      <ScreenLayout>
        <EmptyState
          title="Course not found"
          message="Return to Courses and open the publishing again."
        />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <View style={{ gap: 16 }}>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>
          Choose a variant
        </Text>
        <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>
          This course has multiple variants. Select one to continue.
        </Text>

        {error ? <ErrorState title="Action failed" message={error} /> : null}

        {variants.map((variant) => (
          <Card key={variant.course_id} variant="elevated" padding="lg">
            <View style={{ gap: 12 }}>
              <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>
                {variant.course_name}
              </Text>
              <Button
                title={variant.confirm === 1 ? 'Resume course' : 'Start course'}
                loading={pendingVariantId === variant.course_id}
                onPress={() => {
                  void openVariant(variant);
                }}
              />
            </View>
          </Card>
        ))}
      </View>
    </ScreenLayout>
  );
}
