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
}

export interface UserState {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}
