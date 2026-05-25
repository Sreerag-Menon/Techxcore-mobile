/** Navigation-related types */

export type UserRole = 'student' | 'parent' | 'teacher' | 'admin';

export interface RouteParams {
  courseId?: number;
  assessmentId?: number;
  childId?: number;
  notificationId?: number;
}
