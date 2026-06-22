type UnknownRecord = Record<string, unknown>;

import {
  HTML_EDITOR_FORMAT,
  HTML_EDITOR_MODULE_TYPE,
  type CourseChapter,
  type CourseHier,
  type CourseHtmlEditorModule,
  type CourseHtmlLikeModule,
  type CourseModule,
  type CourseModuleStatus,
  type InCourseQuestion,
} from '../types/course.types';
import {
  resolveHtmlContentRenderMode,
  resolvePlayableHtmlBody,
} from '../utils/htmlContent';

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

function parseTraineeModuleStatus(status: unknown): CourseModuleStatus {
  const normalized = asString(status, '').trim().toLowerCase();
  if (normalized === 'completed') return 'completed';
  if (normalized.includes('progress') || normalized === 'new' || normalized === 'pending') {
    return 'in_progress';
  }
  return 'not_started';
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asString(item, '')).filter((s) => s.length > 0);
}

function toNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asNumber(item, 0));
}

function parseInCourseQuestions(raw: UnknownRecord): {
  testQuestions: InCourseQuestion[];
  nextTestQuestionId: string | null;
  lastAnsweredTestQuestionId: string | null;
} {
  const ids = toStringArray(raw.test_question_ids);
  const positions = toNumberArray(raw.test_question_positions);
  const types = toNumberArray(raw.test_question_types);
  const points = toNumberArray(raw.test_question_points);
  const questions = toStringArray(raw.test_questions);
  const images = Array.isArray(raw.test_question_images)
    ? (raw.test_question_images as unknown[]).map((img) => asString(img, '') || undefined)
    : [];

  const testQuestions: InCourseQuestion[] = ids.map((id, i) => ({
    id,
    pos: positions[i] ?? 0,
    type: types[i] ?? 0,
    question: questions[i] ?? '',
    points: points[i] ?? 0,
    image: images[i],
  }));

  const nextRaw = raw.next_test_question_id ?? raw.nextTestQuestionId;
  const lastRaw = raw.last_answered_test_question_id ?? raw.lastAnsweredTestQuestionId;

  const nextTestQuestionId =
    nextRaw != null && String(nextRaw).trim() !== '' ? asString(nextRaw) : null;
  const lastAnsweredTestQuestionId =
    lastRaw != null && String(lastRaw).trim() !== '' ? asString(lastRaw) : null;

  return { testQuestions, nextTestQuestionId, lastAnsweredTestQuestionId };
}

function moduleBase(raw: UnknownRecord, chapterId: number, contentId: number) {
  const title = asString(
    raw.module ?? raw.content_name ?? raw.contentName ?? raw.title ?? raw.name,
    '',
  ).trim();

  const statusFromFlag = asBoolean(raw.is_completed ?? raw.completed ?? raw.isCompleted, false);
  const status = statusFromFlag
    ? 'completed'
    : parseTraineeModuleStatus(raw.status ?? raw.module_progress);

  const icq = parseInCourseQuestions(raw);

  return {
    contentId,
    chapterId,
    title: title.length > 0 ? title : `Module ${contentId}`,
    sequential: asBoolean(raw.sequential ?? raw.is_sequential, false),
    nonAcademic: asBoolean(raw.is_non_acad ?? raw.non_academic ?? raw.nonAcademic, false),
    released: asBoolean(raw.released, true),
    scheduledOn: asString(raw.scheduled_on ?? raw.scheduledOn, '') || undefined,
    status,
    contentLengthSeconds: asOptionalNumber(
      raw.content_length ?? raw.contentLength ?? raw.duration_seconds,
    ),
    summary: {
      lastPositionSeconds: asOptionalNumber(
        raw.last_viewed_pos ?? raw.last_position_seconds ?? raw.lastPositionSeconds,
      ),
      totalTimeSeconds: asOptionalNumber(
        raw.max_viewed_pos ?? raw.total_time_seconds ?? raw.totalTimeSeconds,
      ),
      completedAt: asString(raw.completed_at ?? raw.completedAt ?? raw.completed_on, '') || undefined,
    },
    ...icq,
  } as const;
}

function htmlFormatFlags(
  format: string,
  isUrlOnly: boolean,
  isHtmlOnly: boolean,
  isEmbedOnly: boolean,
) {
  return { format, isUrlOnly, isHtmlOnly, isEmbedOnly };
}

function withBrowseUrl<T extends CourseModule>(module: T, browseUrl: string): T {
  const trimmed = browseUrl.trim();
  if (!trimmed) return module;
  return { ...module, browseUrl: trimmed };
}

function toHtmlLikeModule(
  base: ReturnType<typeof moduleBase>,
  type: CourseHtmlLikeModule['type'],
  url: string,
  flags: Parameters<typeof resolveHtmlContentRenderMode>[0],
  browseUrl = '',
): CourseHtmlLikeModule {
  return withBrowseUrl(
    {
      ...base,
      type,
      url,
      contentRenderMode: resolveHtmlContentRenderMode(flags, url),
    },
    browseUrl,
  );
}

/** HTMLEditor inline HTML body from API `content_url` (web parity); `browse_url` is S3 key reference. */
function toHtmlEditorModule(
  base: ReturnType<typeof moduleBase>,
  contentUrl: string,
  browseUrl: string,
): CourseHtmlEditorModule | null {
  const url = resolvePlayableHtmlBody(contentUrl, browseUrl);
  if (!url) return null;

  return withBrowseUrl(
    {
      ...base,
      type: HTML_EDITOR_MODULE_TYPE,
      url,
      contentRenderMode: 'inline',
    },
    browseUrl,
  );
}

/** Map trainee playback row (web `mkModuleList` / API-enriched `format` + URLs). */
function toModuleFromPlaybackRow(raw: UnknownRecord, chapterId: number): CourseModule | null {
  const contentId = asNumber(
    raw.video_unit_id ?? raw.content_id ?? raw.contentId ?? raw.module_id ?? raw.id,
    Number.NaN,
  );
  if (!Number.isFinite(contentId)) return null;

  const base = moduleBase(raw, chapterId, contentId);
  const format = asString(raw.format, '').trim().toLowerCase();
  const contentUrl = asString(raw.content_url ?? raw.url ?? raw.contentUrl, '').trim();
  const browseUrl = asString(raw.browse_url, '').trim();
  const videoUrl = asString(raw.video_url, '').trim();
  const isUrlOnly = asBoolean(raw.is_url_only, false);
  const isTextOnly = asBoolean(raw.is_text_only, false);
  const isHtmlOnly = asBoolean(raw.is_html_only, false);
  const isPpt = asBoolean(raw.is_ppt, false);
  const isAudio = asBoolean(raw.is_audio, false);
  const isEmbedOnly = asBoolean(raw.is_embedurl_only, false);

  if (format === 'test') {
    const testId = asNumber(raw.video_unit_id ?? raw.content_id ?? raw.test_id, contentId);
    return { ...base, type: 'test', testId };
  }

  if (format === 'survey') {
    return { ...base, type: 'survey', testId: contentId };
  }

  if (browseUrl === '__SCORM__' || format === 'scorm') {
    const manifestUrl = contentUrl || browseUrl;
    if (!manifestUrl) return null;
    return { ...base, type: 'scorm', manifestUrl };
  }

  if (format === HTML_EDITOR_FORMAT || isHtmlOnly) {
    return toHtmlEditorModule(base, contentUrl, browseUrl);
  }

  if (format === 'embedded' || (isUrlOnly && isEmbedOnly)) {
    const url = contentUrl || browseUrl;
    if (!url) return null;
    return toHtmlLikeModule(
      base,
      'embedded',
      url,
      htmlFormatFlags(format || 'embedded', isUrlOnly, isHtmlOnly, isEmbedOnly),
      browseUrl,
    );
  }

  if (format === 'html' || (isUrlOnly && !isEmbedOnly && browseUrl)) {
    const url = contentUrl || browseUrl || videoUrl;
    if (!url) return null;
    return toHtmlLikeModule(
      base,
      'html',
      url,
      htmlFormatFlags(format || 'html', isUrlOnly, isHtmlOnly, isEmbedOnly),
      browseUrl,
    );
  }

  if (format === 'pdf' || isTextOnly) {
    const url = contentUrl || browseUrl;
    if (!url) return null;
    return withBrowseUrl({ ...base, type: 'pdf', url }, browseUrl);
  }

  if (format === 'ppteditor' || isPpt) {
    const url = contentUrl || browseUrl;
    if (!url) return null;
    return toHtmlLikeModule(
      base,
      'ppt',
      url,
      htmlFormatFlags(format || 'ppteditor', isUrlOnly, isHtmlOnly, isEmbedOnly),
      browseUrl,
    );
  }

  if (format === 'video' || (videoUrl && videoUrl.length > 0)) {
    const url = contentUrl || videoUrl;
    if (!url) return null;
    return { ...base, type: 'video', provider: inferVideoProvider(url), url };
  }

  if (format === 'audio' || isAudio) {
    const url = contentUrl || videoUrl || browseUrl;
    if (!url) return null;
    return { ...base, type: 'audio', url };
  }

  if (contentUrl) {
    return toHtmlLikeModule(
      base,
      'html',
      contentUrl,
      htmlFormatFlags(format, isUrlOnly, isHtmlOnly, isEmbedOnly),
      browseUrl,
    );
  }

  return null;
}

function toModule(raw: UnknownRecord, chapterId: number): CourseModule | null {
  const hasPlaybackShape =
    raw.format != null ||
    raw.video_unit_id != null ||
    raw.browse_url != null ||
    raw.video_url != null;

  if (hasPlaybackShape) {
    const fromPlayback = toModuleFromPlaybackRow(raw, chapterId);
    if (fromPlayback) return fromPlayback;
  }

  const contentId = asNumber(
    raw.content_id ?? raw.contentId ?? raw.module_id ?? raw.video_unit_id ?? raw.id,
    Number.NaN,
  );
  if (!Number.isFinite(contentId)) return null;

  const base = moduleBase(raw, chapterId, contentId);
  const rawType = asString(raw.content_type ?? raw.type ?? raw.contentType, '')
    .trim()
    .toLowerCase();
  const contentUrl = asString(raw.content_url ?? raw.url ?? raw.contentUrl, '').trim();
  const browseUrl = asString(raw.browse_url, '').trim();
  const legacyFormat = asString(raw.format, '').trim().toLowerCase();
  const isHtmlOnly = asBoolean(raw.is_html_only, false);

  if (
    legacyFormat === HTML_EDITOR_FORMAT ||
    isHtmlOnly ||
    rawType === 'htmleditor' ||
    rawType === HTML_EDITOR_MODULE_TYPE.toLowerCase()
  ) {
    const url = resolvePlayableHtmlBody(contentUrl, browseUrl);
    if (!url) return null;
    return withBrowseUrl(
      {
        ...base,
        type: HTML_EDITOR_MODULE_TYPE,
        url,
        contentRenderMode: 'inline',
      },
      browseUrl,
    );
  }

  const url = contentUrl;

  if (rawType === 'video' || rawType === 'm') {
    if (!url) return null;
    return { ...base, type: 'video', provider: inferVideoProvider(url), url };
  }

  if (rawType === 'pdf') {
    const pdfUrl = contentUrl || browseUrl;
    if (!pdfUrl) return null;
    return withBrowseUrl({ ...base, type: 'pdf', url: pdfUrl }, browseUrl);
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

  if (rawType === 'test' || rawType === 't') {
    const testId = asNumber(raw.test_id ?? raw.testId ?? raw.content_id, contentId);
    return { ...base, type: 'test', testId };
  }

  if (rawType === 'survey' || rawType === 's') {
    return { ...base, type: 'survey', testId: contentId };
  }

  if (rawType === 'document') {
    const docUrl = contentUrl || browseUrl;
    if (!docUrl) return null;
    const format = asString(raw.format, '').trim().toLowerCase();
    return toHtmlLikeModule(
      base,
      'html',
      docUrl,
      htmlFormatFlags(
        format,
        asBoolean(raw.is_url_only, false),
        asBoolean(raw.is_html_only, false),
        asBoolean(raw.is_embedurl_only, false),
      ),
      browseUrl,
    );
  }

  if (rawType === 'html' || rawType === 'embedded' || rawType === 'ppt') {
    const htmlUrl = contentUrl || browseUrl;
    if (!htmlUrl) return null;
    const format = asString(raw.format, rawType).trim().toLowerCase();
    return toHtmlLikeModule(
      base,
      rawType,
      htmlUrl,
      htmlFormatFlags(
        format,
        asBoolean(raw.is_url_only, false),
        asBoolean(raw.is_html_only, false),
        asBoolean(raw.is_embedurl_only, false),
      ),
      browseUrl,
    );
  }

  return null;
}

/**
 * Normalize `get_trainee_course_publish_hier_v2` into chapters + playable modules.
 * Matches web `ChapterInner.handleGetSubjectChapterListResponse`.
 */
export function buildTraineePlaybackHierarchy(
  response: unknown,
  coursePublishId: number,
): CourseHier {
  const row =
    extractItem<UnknownRecord>(response) ?? extractArray<UnknownRecord>(response)[0] ?? null;

  if (!row) {
    return { coursePublishId, chapters: [] };
  }

  const chapterRows = extractArray<UnknownRecord>(row.course_chapter_details, ['chapters']);
  const moduleRows = extractArray<UnknownRecord>(row.course_module_details, ['modules']);

  if (chapterRows.length === 0 && moduleRows.length > 0) {
    return buildCourseHierarchy({ modules: moduleRows }, coursePublishId);
  }

  const chapters: CourseChapter[] = chapterRows
    .map((chapterRaw): CourseChapter | null => {
      const chapterId = asNumber(
        chapterRaw.chapter_id ?? chapterRaw.chapterId ?? chapterRaw.id,
        Number.NaN,
      );
      if (!Number.isFinite(chapterId)) return null;

      const title = asString(
        chapterRaw.name ?? chapterRaw.chapter_name ?? chapterRaw.chapterName ?? chapterRaw.title,
        '',
      ).trim();
      const orderIndex = asOptionalNumber(
        chapterRaw.sequence ?? chapterRaw.order_index ?? chapterRaw.orderIndex,
      );

      const modules: CourseModule[] = moduleRows
        .filter(
          (mod) =>
            asNumber(mod.chapter_id ?? mod.chapterId, Number.NaN) === chapterId,
        )
        .map((mod) => toModule(mod, chapterId))
        .filter((m): m is CourseModule => m != null)
        .sort((a, b) => a.contentId - b.contentId);

      return {
        chapterId,
        title: title.length > 0 ? title : `Chapter ${chapterId}`,
        orderIndex,
        modules,
      };
    })
    .filter((c): c is CourseChapter => c != null)
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

  const currentModuleId = asNumber(row.current_module_id, Number.NaN);

  const courseRows = extractArray<UnknownRecord>(row.courses);
  const courseMeta = courseRows[0] ?? row;
  const topicRaw = courseMeta.topic_id ?? courseMeta.topicId ?? row.topic_id ?? row.topicId;
  const topicId =
    topicRaw != null && String(topicRaw).trim() !== '' ? (topicRaw as number | string) : undefined;
  const hierarchyCourseId = asNumber(
    courseMeta.course_id ?? courseMeta.courseId ?? row.course_id,
    Number.NaN,
  );

  return {
    coursePublishId,
    chapters,
    currentModuleId: Number.isFinite(currentModuleId) ? currentModuleId : undefined,
    topicId,
    courseId: Number.isFinite(hierarchyCourseId) ? hierarchyCourseId : undefined,
    seekable: asBoolean(row.seekable, true),
    sequential: asBoolean(row.sequential ?? row.seqContent, false),
  };
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
