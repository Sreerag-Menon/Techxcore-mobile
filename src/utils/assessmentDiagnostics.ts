import { asNumber, asString, extractItem } from '../api/normalize';
import type { AssessmentEnginePhase } from '../types/assessmentSession.types';

const PREFIX = '[AssessmentDiag]';

export const ASSESSMENT_SESSION_ENDPOINTS = {
  DETAILS: '/get_student_assessment_details',
  STUB: '/insert_update_test_assessment_stub',
  QUESTIONS: '/get_student_assessment_questions',
  ANSWERS: '/get_student_assessment_question_answers',
} as const;

const TRACKED_ASSESSMENT_ENDPOINTS = new Set<string>(
  Object.values(ASSESSMENT_SESSION_ENDPOINTS),
);

export type AssessmentApiLogPhase = 'request' | 'response' | 'error';

export function isAssessmentSessionEndpoint(endpoint: string): boolean {
  return TRACKED_ASSESSMENT_ENDPOINTS.has(endpoint);
}

export function logAssessmentApiCall(
  endpoint: string,
  phase: AssessmentApiLogPhase,
  payload?: unknown,
): void {
  if (!TRACKED_ASSESSMENT_ENDPOINTS.has(endpoint)) return;

  const message = `[AssessmentAPI:${endpoint}] ${phase}`;
  if (phase === 'error') {
    console.error(message, payload ?? '');
    return;
  }
  console.log(message, payload ?? '');
}

export type AssessmentDiagContext = {
  publishId?: number | string;
  studentAssessmentId?: number | string;
  coursePublishId?: number | string;
  courseId?: number | string;
  curriculumId?: number | string;
  moduleContentId?: number | string;
  moduleTestId?: number | string;
  moduleType?: string;
  testStateName?: string;
  phase?: AssessmentEnginePhase | string;
  questionsLoading?: boolean;
  detailsLoading?: boolean;
};

export type ParsedStubResponse = {
  statusValue: number;
  statusText: string;
  testassessmentid: number;
  accepted: boolean;
  raw?: unknown;
};

export function logAssessmentDiag(
  event: string,
  detail?: Record<string, unknown>,
): void {
  if (detail != null) {
    console.log(`${PREFIX} ${event}`, detail);
    return;
  }
  console.log(`${PREFIX} ${event}`);
}

export function logAssessmentPhase(
  from: AssessmentEnginePhase | string,
  to: AssessmentEnginePhase | string,
  ctx: AssessmentDiagContext,
  reason?: string,
): void {
  logAssessmentDiag('phase', {
    from,
    to,
    reason,
    ...ctx,
  });
}

export function logAssessmentGate(
  gate: string,
  blocked: boolean,
  ctx: AssessmentDiagContext,
  reason?: string,
): void {
  logAssessmentDiag(`gate:${gate}`, {
    blocked,
    reason,
    ...ctx,
  });
}

export function parseStubResponse(response: unknown): ParsedStubResponse {
  const row = extractItem<Record<string, unknown>>(response) ?? {};
  const statusValue = asNumber(row.StatusValue ?? row.statusvalue ?? row.statusValue, 0);
  const statusText = asString(row.StatusText ?? row.statustext ?? row.statusText, '').trim();
  const testassessmentid = asNumber(
    row.testassessmentid ??
      row.testAssessmentId ??
      row.test_assessment_id ??
      row.studentAssessmentId ??
      row.student_assessment_id,
    0,
  );
  const hasStatusValue = row.StatusValue != null || row.statusvalue != null || row.statusValue != null;
  const accepted =
    testassessmentid > 0 && (!hasStatusValue || statusValue === 1);

  return {
    statusValue,
    statusText,
    testassessmentid,
    accepted,
    raw: response,
  };
}

export function logStubOutcome(
  phase: 'request' | 'response' | 'error',
  body?: Record<string, unknown>,
  responseOrError?: unknown,
): void {
  if (phase === 'request') {
    logAssessmentDiag('stub:request', {
      body,
      hypothesis: 'Starting assessment attempt via insert_update_test_assessment_stub (status 0)',
    });
    return;
  }

  if (phase === 'response') {
    const parsed = parseStubResponse(responseOrError);
    logAssessmentDiag('stub:response', {
      ...parsed,
      hypothesis: parsed.accepted
        ? 'Stub accepted — questions fetch should begin'
        : parsed.testassessmentid <= 0
          ? 'HTTP 200 but missing testassessmentid — loader would stick without recovery'
          : 'HTTP 200 but StatusValue !== 1 — backend rejected start',
    });
    return;
  }

  const err = responseOrError as { status?: number; data?: unknown; message?: string } | undefined;
  logAssessmentDiag('stub:error', {
    httpStatus: err?.status,
    message: err?.message,
    responseBody: err?.data,
    hypothesis:
      err?.status === 400
        ? 'Joi validation failed — check publishId/coursePublishId/courseId'
        : err?.status === 403
          ? 'Auth failure — token expired or invalid'
          : 'Network or server error — assessment not started',
  });
}

export function logQuestionsOutcome(
  phase: 'loading' | 'response' | 'error' | 'empty',
  ctx: AssessmentDiagContext,
  detail?: Record<string, unknown>,
): void {
  logAssessmentDiag(`questions:${phase}`, {
    ...ctx,
    ...detail,
    hypothesis:
      phase === 'empty'
        ? 'Questions API returned no sections — loader would stick without recovery'
        : phase === 'error'
          ? 'Questions fetch failed after stub succeeded'
          : undefined,
  });
}
