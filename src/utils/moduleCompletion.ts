import { HTML_EDITOR_MODULE_TYPE, type CourseModule } from '../types/course.types';

/** Modules that require explicit "Mark as complete" (web `markAsComp`), not auto-complete on load. */
export function needsManualModuleCompletion(module: CourseModule): boolean {
  if (module.type === HTML_EDITOR_MODULE_TYPE) return true;
  if (module.type === 'html') return true;
  if (module.type === 'embedded') {
    return module.contentRenderMode === 'inline';
  }
  return false;
}

export function moduleTracksPlaybackTime(module: CourseModule): boolean {
  return module.type === 'video' || module.type === 'audio' || module.type === 'pdf';
}
