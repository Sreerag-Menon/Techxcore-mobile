/** Parent portal types */

export interface Child {
  member_id: number;
  first_name: string;
  last_name: string;
  email?: string;
  avatar_url?: string;
  class_name?: string;
  standard?: string;
}

export interface ChildProgress {
  course_id: number;
  course_name: string;
  progress_percentage: number;
  total_modules: number;
  completed_modules: number;
}

export interface AttendanceSummary {
  total_days: number;
  present_days: number;
  absent_days: number;
  attendance_percentage: number;
}

export interface ParentState {
  children: Child[];
  selectedChild: Child | null;
  childProgress: ChildProgress[];
  attendance: AttendanceSummary | null;
  isLoading: boolean;
  error: string | null;
}
