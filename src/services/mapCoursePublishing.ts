import { asNumber, asString, isRecord } from '../api/normalize';
import type { Course } from '../types/course.types';

function deriveCourseStatus(progress: number): Course['status'] {
  if (progress >= 100) return 'completed';
  if (progress > 0) return 'in_progress';
  return 'not_started';
}

/** Maps a `get_trainee_course_publishings` row to the mobile `Course` model. */
export function mapCoursePublishingToCourse(row: unknown): Course | null {
  if (!isRecord(row)) return null;

  const course_publish_id = asNumber(row.course_publish_id, Number.NaN);
  if (!Number.isFinite(course_publish_id)) return null;

  const course_id = asNumber(row.course_id, course_publish_id);
  const course_name = asString(row.course_name ?? row.coursename, '').trim();
  if (!course_name) return null;

  const progress_percentage = asNumber(row.course_progress ?? row.progress, 0);
  const total_modules = asNumber(row.chap_count ?? row.chapcount, 0);
  const completed_modules =
    total_modules > 0
      ? Math.round((total_modules * Math.min(progress_percentage, 100)) / 100)
      : 0;

  const description = asString(row.course_short_name ?? row.currname, '').trim();
  const duration = asString(row.hour_duration, '').trim();
  const image = asString(row.image, '').trim();
  const curriculum_id = asNumber(row.curriculum_id ?? row.master_curriculum_id, 0);
  const is_multicourse = asNumber(row.is_multicourse, 0) === 1;

  const courseList = row.course_list;
  let course_ids: number[] | undefined;
  if (Array.isArray(courseList)) {
    const parsed = courseList
      .map((entry) =>
        isRecord(entry) ? asNumber(entry.course_id ?? entry.courseId, Number.NaN) : Number.NaN,
      )
      .filter((id): id is number => Number.isFinite(id));
    if (parsed.length > 0) course_ids = parsed;
  }
  if (!course_ids?.length) {
    course_ids = [course_id];
  }

  return {
    course_id,
    course_publish_id,
    curriculum_id: curriculum_id > 0 ? curriculum_id : undefined,
    course_ids,
    is_multicourse,
    course_name,
    course_image: image || undefined,
    progress_percentage,
    total_modules,
    completed_modules,
    status: deriveCourseStatus(progress_percentage),
    category: asString(row.currname, '').trim() || undefined,
    course_description: description || undefined,
    duration: duration || undefined,
  };
}

export function mapCoursePublishingList(rows: unknown[]): Course[] {
  return rows
    .map((row) => mapCoursePublishingToCourse(row))
    .filter((course): course is Course => course !== null);
}
