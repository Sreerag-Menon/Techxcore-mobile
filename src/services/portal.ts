import { ENDPOINTS, extractArray, extractItem, extractMessage, post } from '@/api';
import type { CourseContent } from '@/types/course.types';

export interface DashboardActivity {
  activity_id: number;
  title: string;
  description: string;
  created_at: string;
  type: string;
}

export interface AssessmentDetails {
  test_id: number;
  test_name: string;
  test_description?: string;
  total_questions?: number;
  duration_minutes?: number;
  total_marks?: number;
  instructions?: string;
  passing_percentage?: number;
}

export interface ParentMessage {
  ask_doctor_id: number;
  subject: string;
  message: string;
  created_at: string;
  sender_name?: string;
  status?: string;
}

export async function requestArray<T>(
  endpoint: string,
  payload: Record<string, unknown> = {},
  candidateKeys: string[] = [],
): Promise<T[]> {
  const response = await post<unknown>(endpoint, payload);
  return extractArray<T>(response, candidateKeys);
}

export async function requestItem<T>(
  endpoint: string,
  payload: Record<string, unknown> = {},
  candidateKeys: string[] = [],
): Promise<T | null> {
  const response = await post<unknown>(endpoint, payload);
  return extractItem<T>(response, candidateKeys);
}

export async function requestMessage(
  endpoint: string,
  payload: Record<string, unknown> = {},
  fallback = 'Request submitted successfully',
): Promise<string> {
  const response = await post<unknown>(endpoint, payload);
  return extractMessage(response, fallback);
}

export function resolveEntityId(
  ...values: Array<string | number | null | undefined>
): number | null {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

export async function fetchRecentActivity(): Promise<DashboardActivity[]> {
  return requestArray<DashboardActivity>(ENDPOINTS.USER.RECENT_ACTIVITY, {}, [
    'activities',
    'recent_activity',
  ]);
}

export async function fetchCourseContent(
  payload: Record<string, unknown>,
): Promise<CourseContent[]> {
  return requestArray<CourseContent>(ENDPOINTS.STUDENT.COURSE_CONTENT, payload, [
    'contents',
    'modules',
    'chapters',
  ]);
}

export async function fetchAssessmentDetails(
  payload: Record<string, unknown>,
): Promise<AssessmentDetails | null> {
  return requestItem<AssessmentDetails>(ENDPOINTS.ASSESSMENT.DETAILS, payload, [
    'assessment',
    'test',
    'details',
  ]);
}

export async function requestForgotPassword(email: string): Promise<string> {
  return requestMessage(
    ENDPOINTS.AUTH.FORGOT_PASSWORD,
    {
      email,
      member_login: email,
    },
    'Password reset instructions have been sent if your account exists.',
  );
}

export async function requestPasswordChange(payload: {
  old_password: string;
  new_password: string;
  confirm_password: string;
}): Promise<string> {
  return requestMessage(
    ENDPOINTS.AUTH.CHANGE_PASSWORD,
    payload,
    'Password updated successfully',
  );
}

export async function fetchParentMessages(): Promise<ParentMessage[]> {
  return requestArray<ParentMessage>(ENDPOINTS.COMMUNICATION.GET_MESSAGES, {}, [
    'messages',
    'rows',
  ]);
}

export async function sendParentMessage(payload: {
  subject: string;
  message: string;
  child_member_id?: number | null;
}): Promise<string> {
  return requestMessage(
    ENDPOINTS.COMMUNICATION.SEND_MESSAGE,
    {
      subject: payload.subject,
      message: payload.message,
      member_id: payload.child_member_id ?? undefined,
    },
    'Message sent successfully',
  );
}
