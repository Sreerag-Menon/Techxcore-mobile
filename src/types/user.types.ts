/** User profile types */

export interface UserProfile {
  member_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  member_type: string;
  organization_id: number;
  organization_name?: string;
  campus_id?: number;
  department?: string;
  class_name?: string;
  standard?: string;
  credits?: number;
  level?: string;
  registration_no?: string;
  enable_skills?: boolean;
  job_profile?: string;
  password_expiry?: boolean;
  active_language_id?: number;
  goi_id?: number;
}

export interface UserState {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}

export interface LanguageOption {
  language_id: number;
  name: string;
}

export interface JobDetails {
  job_title: string;
  job_interest: string[];
  exists: boolean;
}

export interface SkillOption {
  label: string;
  value: string;
}

export interface HelpdeskTicket {
  ticket_id: number;
  ticket_type: string;
  ticket_desc?: string;
  suggestion_title?: string;
  course_name?: string;
  assessment_name?: string;
  created_on?: string;
  is_completed?: boolean | number | string;
  notes?: string;
  is_assigned?: boolean | number | string;
}

export type PasswordChangeStatus = 0 | 1 | 2;
