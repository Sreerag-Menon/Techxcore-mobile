import type { AssessmentStatus } from '@/types/assessment.types';

export function normalizeAssessmentStatus(
  status?: AssessmentStatus,
): AssessmentStatus {
  return status ?? 'pending';
}

export function formatAssessmentStatus(status?: AssessmentStatus): string {
  const value = normalizeAssessmentStatus(status);
  return value.replace(/_/g, ' ');
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function getDaysUntilDue(dueDateStr?: string | null): number | null {
  if (!dueDateStr) return null;
  const due = new Date(dueDateStr);
  if (isNaN(due.getTime())) return null;
  const today = startOfDay(new Date());
  const dueDay = startOfDay(due);
  return Math.ceil((dueDay.getTime() - today.getTime()) / 86_400_000);
}

export function getDueLabel(days: number | null): { label: string; urgent: boolean } {
  if (days === null) return { label: '', urgent: false };
  if (days < 0) return { label: 'Overdue', urgent: true };
  if (days === 0) return { label: 'Due today', urgent: true };
  if (days === 1) return { label: 'Due tomorrow', urgent: true };
  if (days <= 3) return { label: `${days} days left`, urgent: true };
  return { label: `Due in ${days} days`, urgent: false };
}

