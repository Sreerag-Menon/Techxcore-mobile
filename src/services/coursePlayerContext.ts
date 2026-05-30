import { asNumber, isRecord } from '../api/normalize';
import type { Course } from '../types/course.types';

export type CoursePlayerRouteParams = {
  id?: string;
  courseId?: string;
  curriculumId?: string;
};

export type ResolvedCoursePlayerContext = {
  coursePublishId: number;
  courseId: number;
  curriculumId: number;
  courseIds: string[];
};

function parseCourseListIds(courseList: unknown): number[] {
  if (!Array.isArray(courseList)) return [];
  const ids: number[] = [];
  for (const entry of courseList) {
    if (!isRecord(entry)) continue;
    const id = asNumber(entry.course_id ?? entry.courseId, Number.NaN);
    if (Number.isFinite(id)) ids.push(id);
  }
  return ids;
}

/** Course id list for `get_course_publish_content_hier_v2`. */
export function getCourseIdsForHierarchy(course: Pick<Course, 'course_id' | 'course_ids' | 'is_multicourse'> & { course_list?: unknown }): string[] {
  if (course.course_ids?.length) {
    return course.course_ids.map((id) => String(id));
  }
  const fromList = parseCourseListIds((course as { course_list?: unknown }).course_list);
  if (fromList.length > 0) {
    return fromList.map((id) => String(id));
  }
  return [String(course.course_id)];
}

export function resolveCoursePlayerContext(
  route: CoursePlayerRouteParams,
  courses: Course[],
): ResolvedCoursePlayerContext | null {
  const coursePublishId = Number(route.id);
  if (!Number.isFinite(coursePublishId)) return null;

  const fromList = courses.find((c) => c.course_publish_id === coursePublishId);

  const courseId = Number(route.courseId ?? fromList?.course_id);
  const curriculumId = Number(route.curriculumId ?? fromList?.curriculum_id);

  if (!Number.isFinite(courseId) || !Number.isFinite(curriculumId)) {
    return null;
  }

  const courseIds = fromList ? getCourseIdsForHierarchy(fromList) : [String(courseId)];

  return {
    coursePublishId,
    courseId,
    curriculumId,
    courseIds,
  };
}
