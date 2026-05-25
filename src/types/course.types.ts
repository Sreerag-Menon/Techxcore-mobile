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
