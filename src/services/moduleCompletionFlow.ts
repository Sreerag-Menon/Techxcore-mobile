import type { CourseModule } from '../types/course.types';
import type { RecordPointsArgs } from '../redux/api/playerApi';

/** Completion position for non-video modules (web uses contentLength or 1). */
export function moduleCompletionPosition(module: CourseModule): number {
  const length = module.contentLengthSeconds;
  if (typeof length === 'number' && Number.isFinite(length) && length > 0) {
    return length;
  }
  return 1;
}

export type ModuleCompletionProgressArgs = {
  coursePublishId: number;
  courseId: number;
  curriculumId: number;
  memberId: number;
  contentId: number;
  lastViewedPos: number;
  maxViewedPos: number;
  timeId?: '0' | '1';
  inProgress?: 0 | 1;
  acadYearId?: number;
};

export function buildCompletionProgressArgs(
  module: CourseModule,
  ctx: {
    coursePublishId: number;
    courseId: number;
    curriculumId: number;
    memberId: number;
    acadYearId?: number;
  },
  positions?: { lastViewedPos?: number; maxViewedPos?: number },
): ModuleCompletionProgressArgs {
  const pos = positions?.lastViewedPos ?? moduleCompletionPosition(module);
  const maxPos = positions?.maxViewedPos ?? Math.max(pos, module.summary?.totalTimeSeconds ?? pos);

  return {
    coursePublishId: ctx.coursePublishId,
    courseId: ctx.courseId,
    curriculumId: ctx.curriculumId,
    memberId: ctx.memberId,
    contentId: module.contentId,
    lastViewedPos: pos,
    maxViewedPos: maxPos,
    timeId: '1',
    inProgress: 0,
    acadYearId: ctx.acadYearId,
  };
}

export function buildRecordPointsArgs(
  module: CourseModule,
  ctx: {
    coursePublishId: number;
    courseId: number;
    curriculumId: number;
    memberId: number;
    acadYearId?: number;
    classId?: number;
  },
): RecordPointsArgs {
  return {
    coursePublishId: ctx.coursePublishId,
    courseId: ctx.courseId,
    curriculumId: ctx.curriculumId,
    memberId: ctx.memberId,
    contentId: module.contentId,
    chapterId: module.chapterId,
    videoUnitId: module.contentId,
    type: module.type === 'test' ? 'T' : 'M',
    acadYearId: ctx.acadYearId,
    classId: ctx.classId,
  };
}
