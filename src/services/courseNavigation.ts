import { Alert } from 'react-native';
import { router } from 'expo-router';

import type { Course } from '../types/course.types';

export type CourseOpenTarget =
  | { type: 'player'; courseId: number; curriculumId?: number }
  | { type: 'variants' }
  | { type: 'blocked_assessment' };

/** Mirrors web ZonePage card click routing. */
export function resolveCourseOpenTarget(course: Course): CourseOpenTarget {
  if (course.pending_test === 1) {
    return { type: 'blocked_assessment' };
  }

  if (course.is_multicourse) {
    const lastActive = course.last_active_course;
    if (lastActive == null || String(lastActive).trim() === '') {
      if ((course.course_list?.length ?? 0) > 1) {
        return { type: 'variants' };
      }
    } else {
      const activeId = asNumberish(lastActive);
      const variant = course.course_list?.find((v) => v.course_id === activeId);
      return {
        type: 'player',
        courseId: activeId ?? course.course_id,
        curriculumId: variant?.curriculum_id ?? course.curriculum_id,
      };
    }
  }

  return {
    type: 'player',
    courseId: course.course_id,
    curriculumId: course.curriculum_id,
  };
}

function asNumberish(value: string | number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function navigateToCourse(course: Course) {
  const target = resolveCourseOpenTarget(course);
  const publishId = course.course_publish_id;

  if (target.type === 'blocked_assessment') {
    Alert.alert(
      'Assessment required',
      'Complete the pending assessment before opening this course.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Go to assessments',
          onPress: () => router.push('/(student)/(tabs)/assessments'),
        },
      ],
    );
    return;
  }

  if (target.type === 'variants') {
    router.push({
      pathname: '/(student)/course-variants/[id]',
      params: { id: String(publishId) },
    });
    return;
  }

  router.push({
    pathname: '/(student)/course/[id]',
    params: {
      id: String(publishId),
      courseId: String(target.courseId),
      ...(target.curriculumId != null
        ? { curriculumId: String(target.curriculumId) }
        : {}),
    },
  });
}

export function navigateToCourseDetails(course: Course) {
  router.push({
    pathname: '/(student)/course-details/[id]',
    params: {
      id: String(course.course_publish_id),
      courseId: String(course.course_id),
      ...(course.curriculum_id != null
        ? { curriculumId: String(course.curriculum_id) }
        : {}),
    },
  });
}
