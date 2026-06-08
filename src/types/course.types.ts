/** Course and content types */

export type CourseVariant = {
  course_id: number;
  course_name: string;
  curriculum_id?: number;
  confirm?: number;
};

export interface Course {
  course_id: number;
  course_publish_id: number;
  course_name: string;
  course_description?: string;
  course_image?: string;
  progress_percentage: number;
  total_modules: number;
  completed_modules: number;
  status: 'not_started' | 'in_progress' | 'completed';
  category?: string;
  /** Class name from publishings row — used for catalog filter (web `classname`). */
  classname?: string;
  duration?: string;
  /** Subject / curriculum id from publishings — required for player APIs */
  curriculum_id?: number;
  /** Master course ids for hierarchy v2 (multicourse uses all entries) */
  course_ids?: number[];
  is_multicourse?: boolean;
  /** Variant rows when is_multicourse */
  course_list?: CourseVariant[];
  last_active_course?: string | number;
  pending_test?: number;
  average_rating?: number;
  number_of_users?: number;
  certificate_config_id?: number;
  certificate_assigned_type?: string;
  has_assessment_certificate?: number;
  topic_id?: number | string;
  credits?: number;
  end_date?: string;
}

export type StudentCourseCreditDetails = {
  progress_percentage: number;
  course_credit: number;
  watch_time?: string;
  activity?: string;
  status?: string;
};

export interface CourseContent {
  content_id: number;
  content_name: string;
  content_type: 'video' | 'pdf' | 'audio' | 'document' | 'scorm';
  content_url?: string;
  duration?: string;
  is_completed: boolean;
  order_index: number;
  parent_id?: number;
}

export type CourseModuleStatus = 'not_started' | 'in_progress' | 'completed';

/** Web ChapterInner `type === "HTMLEditor"` — canonical mobile module `type`. */
export const HTML_EDITOR_MODULE_TYPE = 'HTMLeditor' as const;

/** API `format` after `.toLowerCase()` (web sends `HTMLEditor`). */
export const HTML_EDITOR_FORMAT = 'htmleditor' as const;

export type CourseModuleType =
  | 'video'
  | 'pdf'
  | 'html'
  | typeof HTML_EDITOR_MODULE_TYPE
  | 'embedded'
  | 'scorm'
  | 'ppt'
  | 'audio'
  | 'test'
  | 'survey';

export type CourseVideoProvider = 'hls' | 'mp4' | 'youtube' | 'vimeo';

export type CourseModuleSummary = {
  lastPositionSeconds?: number;
  totalTimeSeconds?: number;
  completedAt?: string;
};

export type CourseModuleBase = {
  contentId: number;
  chapterId: number;
  title: string;
  type: CourseModuleType;
  url?: string;
  contentLengthSeconds?: number;
  status?: CourseModuleStatus;
  sequential?: boolean;
  /** Drip content: false when module is scheduled but not yet released. */
  released?: boolean;
  scheduledOn?: string;
  summary?: CourseModuleSummary;
};

export type CourseVideoModule = CourseModuleBase & {
  type: 'video';
  provider: CourseVideoProvider;
  url: string;
};

export type CoursePdfModule = CourseModuleBase & {
  type: 'pdf';
  url: string;
};

export type CourseAudioModule = CourseModuleBase & {
  type: 'audio';
  url: string;
};

/** How HtmlPlayer loads content: inline HTML body vs navigable URL. */
export type HtmlContentRenderMode = 'inline' | 'uri';

export type CourseHtmlLikeModule = CourseModuleBase & {
  type: 'html' | 'embedded' | 'ppt';
  url: string;
  contentRenderMode: HtmlContentRenderMode;
};

/** Inline HTML body from HTMLEditor (web `type === "HTMLEditor"`). */
export type CourseHtmlEditorModule = CourseModuleBase & {
  type: typeof HTML_EDITOR_MODULE_TYPE;
  url: string;
  contentRenderMode: 'inline';
};

export type CourseScormModule = CourseModuleBase & {
  type: 'scorm';
  manifestUrl: string;
};

export type CourseAssessmentModule = CourseModuleBase & {
  type: 'test' | 'survey';
  testId: number;
};

export type CourseModule =
  | CourseVideoModule
  | CoursePdfModule
  | CourseAudioModule
  | CourseHtmlLikeModule
  | CourseHtmlEditorModule
  | CourseScormModule
  | CourseAssessmentModule;

export interface CourseChapter {
  chapterId: number;
  title: string;
  orderIndex?: number;
  modules: CourseModule[];
}

export interface CourseHier {
  coursePublishId: number;
  chapters: CourseChapter[];
  /** From `get_trainee_course_publish_hier_v2` when available */
  currentModuleId?: number;
  topicId?: number | string;
  courseId?: number;
  /** Course publish setting: allow video seeking (default true). */
  seekable?: boolean;
  /** Course publish setting: enforce sequential module order. */
  sequential?: boolean;
}

export interface CourseDetails {
  course_id: number;
  course_publish_id: number;
  course_name: string;
  course_description: string;
  course_image?: string;
  instructor_name?: string;
  total_duration?: string;
  total_modules: number;
  contents: CourseContent[];
}

export interface CourseState {
  courses: Course[];
  classFilterOptions: string[];
  isLoadingClassFilters: boolean;
  oldCourses: Course[];
  dashboardCourses: Course[];
  openCourses: Course[];
  isLoadingOpenCourses: boolean;
  openCoursesError: string | null;
  isLoadingOldCourses: boolean;
  oldCoursesError: string | null;
  currentCourse: CourseDetails | null;
  creditDetails: StudentCourseCreditDetails | null;
  isLoadingCreditDetails: boolean;
  isLoading: boolean;
  isLoadingCourseDetails: boolean;
  error: string | null;
}
