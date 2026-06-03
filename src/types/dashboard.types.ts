/** Dashboard-specific data types */

export type DashboardLevel = 'Rookie' | 'Beginner' | 'Intermediate' | 'Advanced';

export interface DashboardStats {
  openCourseCount: number;
  avgAssessmentScore: number;
  avgCompletionRate: number;
  pleCredits: number;
  level?: DashboardLevel;
}

export interface WeeklyActivity {
  day: string;
  total_duration: number;
  date?: string;
}

export interface MentorInfo {
  member_id: number;
  name: string;
  email: string;
  photo?: string;
  subject?: string;
}

export interface DashboardBanner {
  id: string;
  type: 'event' | 'announcement' | 'live_session';
  title: string;
  subtitle?: string;
  image_url?: string;
  action_url?: string;
}

export interface DashboardState {
  stats: DashboardStats | null;
  weeklyActivity: WeeklyActivity[];
  mentors: MentorInfo[];
  banners: DashboardBanner[];
  isLoadingStats: boolean;
  isLoadingActivity: boolean;
  isLoadingMentors: boolean;
  statsError: string | null;
  activityError: string | null;
  mentorsError: string | null;
}

export interface DashboardHomeSummaryRow {
  completion?: number | string;
  assesment?: number | string;
  ple?: number | string;
  open_curriculum?: number | string;
}
