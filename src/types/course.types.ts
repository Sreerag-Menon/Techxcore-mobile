/** Course and content types */

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
  duration?: string;
}

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

export type CourseModuleType =
  | 'video'
  | 'pdf'
  | 'html'
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

export type CourseHtmlLikeModule = CourseModuleBase & {
  type: 'html' | 'embedded' | 'ppt';
  url: string;
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
  dashboardCourses: Course[];
  currentCourse: CourseDetails | null;
  isLoading: boolean;
  error: string | null;
}
