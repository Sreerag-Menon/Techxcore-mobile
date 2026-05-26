/** Authentication request and response types */

export interface LoginRequest {
  memberLogin: string;
  memberPwd: string;
  login_type_id?: number;
}

export interface LoginResponse {
  token: string;
  session_id: string;
  member_id: number;
  member_type: string;
  first_name: string;
  last_name: string;
  email: string;
  organization_id: number;
  role_id: number;
  profile_image?: string;
  organization_name?: string;
  campus_id?: number;
}

export interface AuthState {
  token: string | null;
  user: LoginResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  /** True while the app is reading a persisted token from SecureStore on launch */
  isRestoringSession: boolean;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
  confirm_password: string;
}
