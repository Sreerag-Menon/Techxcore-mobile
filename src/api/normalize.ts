type UnknownRecord = Record<string, unknown>;

import type { CourseChapter, CourseHier, CourseModule } from '../types/course.types';

const DEFAULT_KEYS = [
  'data',
  'items',
  'rows',
  'results',
  'records',
  'list',
  'payload',
  'response',
  'result',
];

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function unwrapValue(
  value: unknown,
  candidateKeys: string[] = [],
  depth = 0,
): unknown {
  if (depth > 4) return value;
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) return value;

  for (const key of [...candidateKeys, ...DEFAULT_KEYS]) {
    if (key in value) {
      return unwrapValue(value[key], candidateKeys, depth + 1);
    }
  }

  const values = Object.values(value);
  if (values.length === 1) {
    return unwrapValue(values[0], candidateKeys, depth + 1);
  }

  return value;
}

export function extractArray<T>(
  value: unknown,
  candidateKeys: string[] = [],
): T[] {
  const unwrapped = unwrapValue(value, candidateKeys);
  if (Array.isArray(unwrapped)) {
    return unwrapped as T[];
  }

  if (isRecord(unwrapped)) {
    for (const key of [...candidateKeys, ...DEFAULT_KEYS]) {
      const nested = unwrapped[key];
      if (Array.isArray(nested)) {
        return nested as T[];
      }
    }
  }

  return [];
}

export function extractItem<T>(
  value: unknown,
  candidateKeys: string[] = [],
): T | null {
  const unwrapped = unwrapValue(value, candidateKeys);
  if (Array.isArray(unwrapped)) {
    return (unwrapped[0] as T | undefined) ?? null;
  }

  if (isRecord(unwrapped)) {
    return unwrapped as T;
  }

  return null;
}

export function extractMessage(
  value: unknown,
  fallback = 'Request completed successfully',
): string {
  if (!isRecord(value)) {
    return fallback;
  }

  const message =
    value.message ??
    value.msg ??
    value.status_message ??
    value.error_description ??
    value.error;

  return typeof message === 'string' && message.trim().length > 0
    ? message
    : fallback;
}

export function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return fallback;
}

export function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
}

export function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n'].includes(normalized)) return false;
  }

  return fallback;
}

export function asRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

function inferVideoProvider(url: string): 'youtube' | 'vimeo' | 'hls' | 'mp4' {
  const lower = url.toLowerCase();
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (lower.includes('vimeo.com')) return 'vimeo';
  if (lower.includes('.m3u8')) return 'hls';
  return 'mp4';
}

function asOptionalNumber(value: unknown): number | undefined {
  const num = asNumber(value, Number.NaN);
  return Number.isFinite(num) ? num : undefined;
}

function toModule(raw: UnknownRecord, chapterId: number): CourseModule | null {
  const contentId = asNumber(raw.content_id ?? raw.contentId ?? raw.module_id ?? raw.id, Number.NaN);
  if (!Number.isFinite(contentId)) return null;

  const title = asString(raw.content_name ?? raw.contentName ?? raw.title ?? raw.name, '').trim();
  const rawType = asString(raw.content_type ?? raw.type ?? raw.contentType, '').trim().toLowerCase();
  const url = asString(raw.content_url ?? raw.url ?? raw.contentUrl, '').trim();

  const sequential = asBoolean(raw.sequential ?? raw.is_sequential, false);
  const isCompleted = asBoolean(raw.is_completed ?? raw.completed ?? raw.isCompleted, false);

  const base = {
    contentId,
    chapterId,
    title: title.length > 0 ? title : `Module ${contentId}`,
    sequential,
    status: isCompleted ? 'completed' : 'not_started',
    contentLengthSeconds: asOptionalNumber(raw.content_length ?? raw.contentLength ?? raw.duration_seconds),
    summary: {
      lastPositionSeconds: asOptionalNumber(raw.last_position_seconds ?? raw.lastPositionSeconds),
      totalTimeSeconds: asOptionalNumber(raw.total_time_seconds ?? raw.totalTimeSeconds),
      completedAt: asString(raw.completed_at ?? raw.completedAt, '') || undefined,
    },
  } as const;

  if (rawType === 'video') {
    const provider = inferVideoProvider(url);
    if (!url) return null;
    return { ...base, type: 'video', provider, url };
  }

  if (rawType === 'pdf') {
    if (!url) return null;
    return { ...base, type: 'pdf', url };
  }

  if (rawType === 'audio') {
    if (!url) return null;
    return { ...base, type: 'audio', url };
  }

  if (rawType === 'scorm') {
    const manifestUrl = url || asString(raw.manifest_url ?? raw.manifestUrl, '').trim();
    if (!manifestUrl) return null;
    return { ...base, type: 'scorm', manifestUrl };
  }

  if (rawType === 'test' || rawType === 'survey') {
    const testId = asNumber(raw.test_id ?? raw.testId ?? raw.content_id, Number.NaN);
    if (!Number.isFinite(testId)) return null;
    return { ...base, type: rawType, testId };
  }

  // Backend sometimes reports non-player types as `document`.
  if (rawType === 'document') {
    if (!url) return null;
    return { ...base, type: 'html', url };
  }

  // Allow explicit mobile types if backend starts sending them.
  if (rawType === 'html' || rawType === 'embedded' || rawType === 'ppt') {
    if (!url) return null;
    return { ...base, type: rawType, url };
  }

  // Unknown type: ignore (keeps the player robust).
  return null;
}

/**
 * Normalize `get_course_publish_content_hier_v2` into a stable Chapters → Modules tree.
 *
 * Handles both common backend shapes:
 * - chapters array: [{ chapter_id, chapter_name, modules: [...] }]
 * - flat modules array: [{ chapter_id, content_id, ... }]
 */
export function buildCourseHierarchy(
  response: unknown,
  coursePublishId: number,
): CourseHier {
  // Try chapter-nested first.
  const maybeChapters = extractArray<UnknownRecord>(response, [
    'chapters',
    'contents',
    'modules',
  ]);

  const hasNestedModules = maybeChapters.some(
    (item) => isRecord(item) && Array.isArray((item as UnknownRecord).modules),
  );

  if (hasNestedModules) {
    const chapters: CourseChapter[] = maybeChapters
      .map((chapterRaw): CourseChapter | null => {
        if (!isRecord(chapterRaw)) return null;
        const chapterId = asNumber(
          chapterRaw.chapter_id ?? chapterRaw.chapterId ?? chapterRaw.id,
          Number.NaN,
        );
        if (!Number.isFinite(chapterId)) return null;

        const title = asString(
          chapterRaw.chapter_name ?? chapterRaw.chapterName ?? chapterRaw.title ?? chapterRaw.name,
          '',
        ).trim();
        const orderIndex = asOptionalNumber(
          chapterRaw.order_index ?? chapterRaw.orderIndex ?? chapterRaw.chapter_order,
        );

        const moduleRows = Array.isArray(chapterRaw.modules)
          ? (chapterRaw.modules as unknown[])
          : [];

        const modules: CourseModule[] = moduleRows
          .map((row) => (isRecord(row) ? toModule(row, chapterId) : null))
          .filter((m): m is CourseModule => Boolean(m));

        return {
          chapterId,
          title: title.length > 0 ? title : `Chapter ${chapterId}`,
          orderIndex,
          modules: modules.sort((a, b) => (a.contentId ?? 0) - (b.contentId ?? 0)),
        };
      })
      .filter((c): c is CourseChapter => c !== null)
      .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

    return { coursePublishId, chapters };
  }

  // Flat modules list fallback.
  const flatModules = extractArray<UnknownRecord>(response, [
    'contents',
    'modules',
    'items',
    'rows',
  ]);

  const chapterMap = new Map<number, CourseChapter>();
  for (const row of flatModules) {
    if (!isRecord(row)) continue;
    const chapterId = asNumber(
      row.chapter_id ?? row.chapterId ?? row.parent_id ?? row.parentId,
      Number.NaN,
    );
    if (!Number.isFinite(chapterId)) continue;

    const existing = chapterMap.get(chapterId);
    if (!existing) {
      const title = asString(row.chapter_name ?? row.chapterName, '').trim();
      chapterMap.set(chapterId, {
        chapterId,
        title: title.length > 0 ? title : `Chapter ${chapterId}`,
        orderIndex: asOptionalNumber(row.chapter_order ?? row.chapterOrder),
        modules: [],
      });
    }

    const module = toModule(row, chapterId);
    if (module) {
      chapterMap.get(chapterId)!.modules.push(module);
    }
  }

  const chapters = [...chapterMap.values()]
    .map((chapter) => ({
      ...chapter,
      modules: chapter.modules.sort((a, b) => a.contentId - b.contentId),
    }))
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

  return { coursePublishId, chapters };
}
