import type { CourseModule } from '../types/course.types';
import { moduleTracksPlaybackTime } from './moduleCompletion';

const COMPLETION_EPSILON_SEC = 1;

export function isPlaybackModuleComplete(
  module: CourseModule,
  lastViewedPos: number,
  playerDurationSeconds?: number,
): boolean {
  if (!moduleTracksPlaybackTime(module)) return false;
  if (module.nonAcademic) return false;

  const contentLength =
    module.contentLengthSeconds ??
    (playerDurationSeconds && playerDurationSeconds > 0 ? playerDurationSeconds : null);

  if (contentLength == null) return false;
  return lastViewedPos >= contentLength - COMPLETION_EPSILON_SEC;
}
