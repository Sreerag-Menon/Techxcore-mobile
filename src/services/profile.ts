import {
  asBoolean,
  asNumber,
  asString,
  ENDPOINTS,
  extractArray,
  extractItem,
  post,
} from '@/api';
import type {
  HelpdeskTicket,
  JobDetails,
  LanguageOption,
  PasswordChangeStatus,
  SkillOption,
} from '@/types/user.types';

function extractStatusValue(payload: unknown): number {
  const row = extractItem<Record<string, unknown>>(payload);
  if (!row) return -1;
  return asNumber(row.StatusValue ?? row.statusvalue ?? row.status_value ?? row.status, -1);
}

function normalizeInterestList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>;
          return asString(record.skill ?? record.label ?? record.value ?? record.name).trim();
        }
        return '';
      })
      .filter(Boolean);
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return normalizeInterestList(parsed);
    } catch {
      return value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function normalizeEssentialSkills(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => asString(item).trim()).filter(Boolean);
  }

  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>)
      .map((item) => asString(item).trim())
      .filter(Boolean);
  }

  if (typeof value === 'string' && value.trim()) {
    return value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  }

  return [];
}

export function normalizeAvatarUri(photo?: string | null): string | undefined {
  if (!photo || !photo.trim()) return undefined;
  const trimmed = photo.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('file://') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed;
  }
  return `data:image/png;base64,${trimmed}`;
}

export async function updateMemberProfilePhoto(payload: {
  photo: string;
  origImage?: string;
}): Promise<void> {
  const response = await post<unknown>(ENDPOINTS.USER.UPDATE_PROFILE, {
    photo: payload.photo || '',
    origImage: payload.origImage || '',
  });

  const status = extractStatusValue(response);
  if (status !== 1) {
    throw new Error('Unable to update profile photo. Please try again.');
  }
}

export async function changeMemberPasswordV2(payload: {
  memberId: number;
  oldPwd: string;
  newPwd: string;
}): Promise<PasswordChangeStatus> {
  const response = await post<unknown>(ENDPOINTS.AUTH.CHANGE_PASSWORD_V2, payload);
  const status = extractStatusValue(response) as PasswordChangeStatus;

  if (status === 0) {
    throw Object.assign(new Error('Current password is incorrect.'), { code: 0 as const });
  }
  if (status === 2) {
    throw Object.assign(new Error('This password was used before. Choose a new one.'), {
      code: 2 as const,
    });
  }
  if (status !== 1) {
    throw new Error('Unable to change password right now.');
  }

  return status;
}

export async function fetchLanguages(memberId: number): Promise<LanguageOption[]> {
  const response = await post<unknown>(ENDPOINTS.USER.GET_LANGUAGE, { memberId });
  const rows = extractArray<Record<string, unknown>>(response, ['languages', 'rows']);

  return rows
    .map((row) => ({
      language_id: asNumber(row.language_id ?? row.languageId ?? row.id),
      name: asString(row.name ?? row.language_name ?? row.label),
    }))
    .filter((row) => row.language_id > 0 && row.name.length > 0);
}

export async function updateActiveLanguage(languageId: number): Promise<number> {
  const response = await post<unknown>(ENDPOINTS.USER.UPDATE_ACTIVE_LANGUAGE, {
    languageId,
  });
  const row = extractItem<Record<string, unknown>>(response);
  const status = asNumber(row?.statusvalue ?? row?.StatusValue ?? row?.status, -1);
  if (status !== 1) {
    throw new Error('Unable to update language.');
  }
  return asNumber(row?.language_id ?? languageId, languageId);
}

export async function fetchJobDetails(memberId: number): Promise<JobDetails> {
  const rows = extractArray<Record<string, unknown>>(
    await post<unknown>(ENDPOINTS.USER.JOB_DETAILS, { memberId }),
  );

  if (rows.length === 0) {
    return { job_title: '', job_interest: [], exists: false };
  }

  const row = rows[0];
  return {
    job_title: asString(row.job_title ?? row.jobTitle),
    job_interest: normalizeInterestList(row.job_interest ?? row.interest ?? row.skills),
    exists: true,
  };
}

export async function saveJobDetails(payload: {
  memberId: number;
  jobTitle: string;
  interest: string[];
  action: 'add' | 'Update';
}): Promise<void> {
  const response = await post<unknown>(ENDPOINTS.USER.INSERT_JOB_DETAILS, payload);
  if (extractStatusValue(response) !== 1) {
    throw new Error('Unable to save job details.');
  }
}

export async function fetchJobSkillOptions(): Promise<SkillOption[]> {
  const rows = extractArray<Record<string, unknown>>(
    await post<unknown>(ENDPOINTS.USER.JOB_SKILLS, {}),
    ['skills', 'rows'],
  );

  return rows
    .map((row) => {
      const skill = asString(row.skill ?? row.label ?? row.name ?? row.value);
      return skill ? { label: skill, value: skill } : null;
    })
    .filter((row): row is SkillOption => row != null);
}

export async function fetchMemberEssentialSkills(role: string): Promise<string[]> {
  const response = await post<unknown>(ENDPOINTS.USER.MEMBER_SKILLS, { role });
  const row = extractItem<Record<string, unknown>>(response);
  if (!row) return [];
  return normalizeEssentialSkills(row.essential_skill ?? row.essentialSkill);
}

export async function fetchSkillDetails(memberId: number): Promise<{
  essential_skill: string[];
  exists: boolean;
}> {
  const rows = extractArray<Record<string, unknown>>(
    await post<unknown>(ENDPOINTS.USER.SKILL_DETAILS, { memberId }),
  );

  if (rows.length === 0) {
    return { essential_skill: [], exists: false };
  }

  return {
    essential_skill: normalizeEssentialSkills(rows[0].essential_skill ?? rows[0].essentialSkill),
    exists: true,
  };
}

export async function saveSkillDetails(payload: {
  memberId: number;
  essentialSkill: string[];
  action: 'add' | 'Update';
}): Promise<void> {
  const response = await post<unknown>(ENDPOINTS.USER.INSERT_SKILLS_DETAILS, payload);
  if (extractStatusValue(response) !== 1) {
    throw new Error('Unable to save skill assessment.');
  }
}

export async function fetchMemberTickets(payload: {
  memberId: number;
  organizationId: number;
  goiId?: number;
}): Promise<HelpdeskTicket[]> {
  const response = await post<unknown>(ENDPOINTS.USER.TICKETS, {
    memberId: payload.memberId,
    organizationId: payload.organizationId,
    goiId: payload.goiId,
  });

  const row = extractItem<Record<string, unknown>>(response);
  const details = (row?.details ?? row) as Record<string, unknown> | undefined;
  const ticketsRaw = details?.tickets ?? row?.tickets;

  if (Array.isArray(ticketsRaw)) {
    return ticketsRaw.map((ticket) => {
      const record = ticket as Record<string, unknown>;
      return {
        ticket_id: asNumber(record.ticket_id ?? record.ticketId ?? record.id),
        ticket_type: asString(record.ticket_type ?? record.ticketType ?? 'general_feedback'),
        ticket_desc: asString(record.ticket_desc ?? record.ticketDesc ?? record.description) || undefined,
        suggestion_title: asString(record.suggestion_title ?? record.suggestionTitle) || undefined,
        course_name: asString(record.course_name ?? record.courseName) || undefined,
        assessment_name: asString(record.assessment_name ?? record.assessmentName) || undefined,
        created_on: asString(record.created_on ?? record.createdOn ?? record.created_at) || undefined,
        is_completed: (record.is_completed ?? record.isCompleted) as
          | boolean
          | number
          | string
          | undefined,
        notes: asString(record.notes) || undefined,
        is_assigned: (record.is_assigned ?? record.isAssigned) as
          | boolean
          | number
          | string
          | undefined,
      } satisfies HelpdeskTicket;
    });
  }

  return extractArray<HelpdeskTicket>(response, ['tickets']);
}

export async function reopenHelpdeskTicket(ticketId: number): Promise<void> {
  const response = await post<unknown>(ENDPOINTS.USER.UPDATE_TICKET_STATUS, {
    ticketId: String(ticketId),
    status: 'OPEN',
    notes: '',
  });

  const row = extractItem<Record<string, unknown>>(response);
  const nestedStatus = row?.status;
  const ok =
    nestedStatus === true ||
    nestedStatus === 1 ||
    nestedStatus === '1' ||
    extractStatusValue(response) === 1 ||
    nestedStatus == null;

  if (!ok) {
    throw new Error('Unable to re-open ticket.');
  }
}

export async function fetchProgressSummaries(acadYearId?: number): Promise<{
  courses: Record<string, unknown>[];
  assessments: Record<string, unknown>[];
  liveSessions: Record<string, unknown>[];
}> {
  const payload = acadYearId ? { acadYearId } : {};

  const [coursesResponse, assessmentsResponse, liveResponse] = await Promise.all([
    post<unknown>(ENDPOINTS.DASHBOARD.COURSE_PROGRESS, payload),
    post<unknown>(ENDPOINTS.DASHBOARD.ASSESSMENT_PROGRESS, payload),
    post<unknown>(ENDPOINTS.DASHBOARD.LIVE_SESSION_PROGRESS, payload),
  ]);

  return {
    courses: extractArray<Record<string, unknown>>(coursesResponse, [
      'courses',
      'rows',
      'details',
    ]),
    assessments: extractArray<Record<string, unknown>>(assessmentsResponse, [
      'assessments',
      'rows',
      'details',
    ]),
    liveSessions: extractArray<Record<string, unknown>>(liveResponse, [
      'sessions',
      'live_sessions',
      'rows',
      'details',
    ]),
  };
}

export function isTicketResolved(ticket: HelpdeskTicket): boolean {
  return asBoolean(ticket.is_completed, false);
}
