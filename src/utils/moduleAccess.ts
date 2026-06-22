import type { CourseModule } from '../types/course.types';
import { logNextNavDiag } from './progressDiagnostics';

export type ModuleLockReason = 'sequential' | 'drip' | null;

/** Web parity: drip blocks only not-yet-started modules with a future schedule or unreleased flag. */
function isModuleDripLocked(module: CourseModule): boolean {
  if (module.status === 'completed' || module.status === 'in_progress') {
    return false;
  }

  if (module.scheduledOn) {
    const scheduled = new Date(module.scheduledOn);
    if (!Number.isNaN(scheduled.getTime()) && scheduled > new Date()) {
      return true;
    }
  }

  return module.released === false;
}

export function getModuleLockState(
  module: CourseModule,
  flatModules: CourseModule[],
  courseSequential: boolean,
  overrideCompletedIds?: Set<number>,
): { isLocked: boolean; reason: ModuleLockReason } {
  const index = flatModules.findIndex((m) => m.contentId === module.contentId);
  const prev = index > 0 ? flatModules[index - 1] : null;

  const prevIsCompleted =
    prev != null &&
    (prev.status === 'completed' || (overrideCompletedIds?.has(prev.contentId) ?? false));

  const isSequentialLocked =
    (courseSequential || Boolean(module.sequential)) &&
    prev != null &&
    !prevIsCompleted;

  const isDripLocked = isModuleDripLocked(module);

  const result: { isLocked: boolean; reason: ModuleLockReason } = isDripLocked
    ? { isLocked: true, reason: 'drip' }
    : isSequentialLocked
      ? { isLocked: true, reason: 'sequential' }
      : { isLocked: false, reason: null };

  if (result.isLocked) {
    logNextNavDiag('module_locked', {
      targetContentId: module.contentId,
      targetTitle: module.title,
      reason: result.reason,
      courseSequential,
      moduleSequential: Boolean(module.sequential),
      targetReleased: module.released,
      targetStatus: module.status,
      targetScheduledOn: module.scheduledOn ?? null,
      prevContentId: prev?.contentId ?? null,
      prevTitle: prev?.title ?? null,
      prevStatus: prev?.status ?? null,
      prevLocallyCompleted: prev != null && (overrideCompletedIds?.has(prev.contentId) ?? false),
      prevCountsAsCompleted: prevIsCompleted,
    });
  }

  return result;
}
