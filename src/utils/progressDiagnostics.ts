import { asNumber, asString, extractItem } from '../api/normalize';

const PREFIX = '[ProgressDiag]';

export type ProgressDiagContext = {
  coursePublishId?: number | string;
  courseId?: number | string;
  curriculumId?: number | string;
  memberId?: number | string;
  contentId?: number | string;
  moduleType?: string;
};

/** Required by API Joi schema for insert_update_trainee_module_time */
const MODULE_TIME_REQUIRED = [
  'status',
  'timeId',
  'memberId',
  'videoUnitId',
  'curriculumId',
  'coursePublishId',
] as const;

export function logProgressDiag(
  event: string,
  detail?: Record<string, unknown>,
): void {
  if (detail != null) {
    console.log(`${PREFIX} ${event}`, detail);
    return;
  }
  console.log(`${PREFIX} ${event}`);
}

export function logProgressGate(
  gate: string,
  allowed: boolean,
  ctx: ProgressDiagContext,
  blockers?: string[],
): void {
  logProgressDiag(`gate:${gate}`, {
    allowed,
    blockers: blockers?.length ? blockers : undefined,
    ...ctx,
  });
}

function isValidId(value: unknown): boolean {
  const num = asNumber(value, Number.NaN);
  return Number.isFinite(num) && num > 0;
}

export function collectProgressPersistBlockers(ctx: {
  courseId?: number | string;
  curriculumId?: number | string;
  memberId?: number | string;
  contentId?: number | string;
  moduleType?: string;
}): string[] {
  const blockers: string[] = [];
  if (!isValidId(ctx.courseId)) {
    blockers.push('missing_or_invalid_courseId');
  }
  if (!isValidId(ctx.curriculumId)) {
    blockers.push('missing_or_invalid_curriculumId');
  }
  if (!isValidId(ctx.memberId)) {
    blockers.push('missing_or_invalid_memberId');
  }
  if (!isValidId(ctx.contentId)) {
    blockers.push('missing_or_invalid_contentId');
  }
  if (ctx.moduleType === 'survey') {
    blockers.push('survey_module_excluded');
  }
  return blockers;
}

export function auditModuleTimePayload(body: Record<string, unknown>): {
  valid: boolean;
  missingRequired: string[];
  presentOptional: string[];
} {
  const missingRequired = MODULE_TIME_REQUIRED.filter(
    (key) => body[key] === undefined || body[key] === null || body[key] === '',
  );
  const presentOptional: string[] = [];
  if (body.lastViewedPos != null) presentOptional.push('lastViewedPos');
  if (body.maxViewedPos != null) presentOptional.push('maxViewedPos');
  if (body.inProgress != null) presentOptional.push('inProgress');
  if (body.courseId != null) presentOptional.push('courseId');
  if (body.acadYearId != null) presentOptional.push('acadYearId');

  return {
    valid: missingRequired.length === 0,
    missingRequired,
    presentOptional,
  };
}

export function parseModuleTimeResponse(response: unknown): {
  statusValue: number;
  statusText: string;
  accepted: boolean;
} {
  const row = extractItem<Record<string, unknown>>(response);
  const statusValue = asNumber(row?.StatusValue ?? row?.statusvalue, 0);
  const statusText = asString(row?.StatusText ?? row?.statustext, '').trim();
  return {
    statusValue,
    statusText,
    accepted: statusValue === 1,
  };
}

export function parsePointsResponse(response: unknown): {
  statusValue: number;
  statusText: string;
  accepted: boolean;
  progressStatus?: number;
  modules?: unknown;
} {
  const row = extractItem<Record<string, unknown>>(response);
  const statusValue = asNumber(row?.statusvalue ?? row?.StatusValue, 0);
  const statusText = asString(row?.statustext ?? row?.StatusText, '').trim();
  const progressStatus = asNumber(row?.progress_status, Number.NaN);
  return {
    statusValue,
    statusText,
    accepted: statusValue === 1,
    progressStatus: Number.isFinite(progressStatus) ? progressStatus : undefined,
    modules: row?.modules,
  };
}

export function logModuleTimeOutcome(
  phase: 'request' | 'response' | 'error',
  body: Record<string, unknown> | undefined,
  responseOrError?: unknown,
): void {
  if (phase === 'request' && body) {
    const audit = auditModuleTimePayload(body);
    logProgressDiag('module_time:request', {
      payloadAudit: audit,
      body,
      hypothesis:
        audit.missingRequired.length > 0
          ? 'API likely rejects — missing required Joi fields (status/timeId/memberId/etc.)'
          : 'Payload shape looks valid for insert_update_trainee_module_time',
    });
    return;
  }

  if (phase === 'response') {
    const parsed = parseModuleTimeResponse(responseOrError);
    logProgressDiag('module_time:response', {
      ...parsed,
      raw: responseOrError,
      hypothesis: parsed.accepted
        ? 'Watch-time save accepted by DB'
        : 'HTTP 200 but DB rejected — check StatusText / memberId / curriculumId / videoUnitId',
    });
    return;
  }

  const err = responseOrError as { status?: number; data?: unknown; message?: string } | undefined;
  logProgressDiag('module_time:error', {
    httpStatus: err?.status,
    message: err?.message,
    responseBody: err?.data,
    hypothesis:
      err?.status === 400
        ? 'Joi validation failed — payload missing or wrong types'
        : err?.status === 403
          ? 'Auth failure — token expired or invalid'
          : 'Network or server error — progress not persisted',
  });
}

export function logPointsOutcome(
  phase: 'request' | 'response' | 'error',
  body?: Record<string, unknown>,
  responseOrError?: unknown,
): void {
  if (phase === 'request') {
    logProgressDiag('points:request', { body });
    return;
  }

  if (phase === 'response') {
    const parsed = parsePointsResponse(responseOrError);
    logProgressDiag('points:response', {
      ...parsed,
      raw: responseOrError,
      hypothesis: parsed.accepted
        ? 'Module completion recorded — hierarchy/course % should update after refetch'
        : 'Completion rejected — often missing classId, wrong chapterId, or nonAcademic module',
    });
    return;
  }

  const err = responseOrError as { status?: number; data?: unknown; message?: string } | undefined;
  logProgressDiag('points:error', {
    httpStatus: err?.status,
    message: err?.message,
    responseBody: err?.data,
  });
}
