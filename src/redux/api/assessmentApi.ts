import { createApi } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import type { AxiosError } from 'axios';

import { apiClient, post } from '../../api';
import { asBoolean, asNumber, asString, extractArray, extractItem } from '../../api/normalize';
import { ENDPOINTS } from '../../api/endpoints';
import { QUESTION_TYPE } from '../../constants/questionTypes';
import type {
  AssessmentAnswer,
  AssessmentAnswerRow,
  AssessmentSection,
  AssessmentSessionDetails,
  AssessmentSessionQuestion,
  AssessmentStubResponse,
  QuestionSummary,
} from '../../types/assessmentSession.types';

type AxiosBaseQueryArgs = { url: string; data?: unknown; isMultipart?: boolean };
type AxiosBaseQueryError = { status?: number; data?: unknown; message: string };

const axiosBaseQuery =
  (): BaseQueryFn<AxiosBaseQueryArgs, unknown, AxiosBaseQueryError> =>
  async ({ url, data, isMultipart }) => {
    try {
      if (isMultipart && data instanceof FormData) {
        const response = await apiClient.post<unknown>(url, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return { data: response.data };
      }
      const result = await post<unknown>(url, data ?? {});
      return { data: result };
    } catch (rawError) {
      const err = rawError as AxiosError;
      return {
        error: {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message ?? 'Request failed',
        },
      };
    }
  };

function transformSessionDetails(response: unknown, publishId: number): AssessmentSessionDetails {
  const row = extractItem<Record<string, unknown>>(response) ?? {};
  return {
    publishId,
    testId: asNumber(row.test_id, 0),
    title: asString(row.name, 'Assessment'),
    identifier: asString(row.identifier, '') || undefined,
    description: asString(row.description, '') || undefined,
    duration: asNumber(row.duration, 0),
    status: asString(row.status, ''),
    testState: asString(row.test_state, ''),
    testStateName: asString(row.test_state_name, ''),
    testType: asNumber(row.test_type, 0) || undefined,
    totMarks: asNumber(row.totmarks, 0),
    obtMarks: asNumber(row.obtmarks, 0),
    totQuestions: asNumber(row.totquestions, 0),
    correct: asNumber(row.correct, 0),
    incorrect: asNumber(row.incorrect, 0),
    missed: asNumber(row.missed, 0),
    attempted: asNumber(row.attempted, 0),
    unattempted: asNumber(row.unattempted, 0),
    flagged: asNumber(row.flagged, 0),
    multiAttempt: Boolean(row.multi_attempt),
    attemptCount: asNumber(row.attempt_count, 0),
    groupedTest: asNumber(row.grouped_test, 0),
    summary_viewable: Boolean(row.summary_viewable),
    rand_question: asNumber(row.rand_question, 0) || undefined,
    rand_section: asNumber(row.rand_section, 0) || undefined,
    start_from: asString(row.start_from, '') || undefined,
    difference_time: asNumber(row.difference_time, 0) || undefined,
    current_time: asString(row.current_time, '') || undefined,
    dateFrom: asString(row.from_date, '') || undefined,
    dateTo: asString(row.to_date, '') || undefined,
    elapsedTime: asString(row.elapsed_time, '') || undefined,
    feedback: asString(row.feedback, '') || undefined,
    coursePublishId: asNumber(row.course_publish_id, 0) || undefined,
    courseId: asNumber(row.course_id, 0) || undefined,
    latestAssessmentId: asNumber(row.latest_assessment_id, 0) || undefined,
  };
}

function normalizeQuestion(raw: Record<string, unknown>): AssessmentSessionQuestion {
  return {
    id: asString(raw.id, ''),
    question: asString(raw.question, ''),
    type: asNumber(raw.type, 0),
    section_order: asNumber(raw.section_order, 0),
    section_name: asString(raw.section_name, ''),
    sequence: asNumber(raw.sequence, 0),
    image: asString(raw.image, '') || undefined,
    points: asNumber(raw.points, 0),
    flagged: asBoolean(raw.flagged, false),
    attempted: asBoolean(raw.attempted, false),
    user_selection: Array.isArray(raw.user_selection)
      ? (raw.user_selection as unknown[]).map((v) => asString(v, ''))
      : [],
    match_selection: Array.isArray(raw.match_selection)
      ? (raw.match_selection as unknown[]).map((item) => {
          const row = item as Record<string, unknown>;
          return {
            answerCode: asString(row.answerCode ?? row.answer_code, ''),
            answer: asString(row.answer, ''),
          };
        })
      : [],
    content: asString(raw.content, '') || undefined,
    content_format: asNumber(raw.content_format, 0) || undefined,
    content_source: asString(raw.content_source, '') || undefined,
    max_selection: asNumber(raw.max_selection, 0),
    math_symbol: asNumber(raw.math_symbol, 0),
    media_link: asString(raw.media_link, '') || undefined,
    is_record: asNumber(raw.is_record, 0),
    assignment_content: asString(raw.assignment_content, '') || undefined,
    asgnmt_content_format: asNumber(raw.asgnmt_content_format, 0) || undefined,
  };
}

function transformSections(response: unknown): AssessmentSection[] {
  const row = extractItem<Record<string, unknown>>(response);
  const sectionRows = extractArray<Record<string, unknown>>(row?.questions ?? []);
  return sectionRows.map((sec) => {
    const rawQuestions = sec.questions;
    let questions: AssessmentSessionQuestion[] = [];
    if (Array.isArray(rawQuestions)) {
      questions = rawQuestions
        .filter((q): q is Record<string, unknown> => typeof q === 'object' && q !== null)
        .map(normalizeQuestion);
    } else if (rawQuestions && typeof rawQuestions === 'object') {
      questions = Object.values(rawQuestions as Record<string, Record<string, unknown>>).map(
        normalizeQuestion,
      );
    }
    questions.sort((a, b) => a.sequence - b.sequence);
    return {
      section_order: asNumber(sec.section_order, 0),
      section_name: asString(sec.section_name, ''),
      content: asString(sec.content, '') || undefined,
      content_format: asNumber(sec.content_format, 0) || undefined,
      content_source: asString(sec.content_source, '') || undefined,
      description: asString(sec.description, '') || undefined,
      max_questions: asNumber(sec.max_questions, 0) || undefined,
      questions_attempted: asNumber(sec.questions_attempted, 0) || undefined,
      questions,
      open: true,
    };
  });
}

function emptyAnswer(): AssessmentAnswer {
  return {
    choices: [],
    answers: [],
    comments: [],
    reviewStarts: [],
    reviewEnds: [],
    questions: [],
  };
}

function normalizeAnswerRow(raw: Record<string, unknown>): AssessmentAnswerRow {
  return {
    question_id: asString(raw.question_id ?? raw.test_que_id ?? raw.test_question_id, ''),
    answer: asString(raw.answer ?? raw.test_answer, ''),
    image: asString(raw.image, '') || undefined,
    is_correct_ans: asBoolean(raw.is_correct_ans, false),
    answer_code: asString(raw.answer_code, '') || undefined,
    question_code: asString(raw.question_code, '') || undefined,
    question: asString(raw.question, '') || undefined,
    answer_comment: asString(raw.answer_comment, '') || undefined,
    review_start_pos: asNumber(raw.review_start_pos, 0),
    review_end_pos: asNumber(raw.review_end_pos, 0),
  };
}

function extractAnswerRows(response: unknown): AssessmentAnswerRow[] {
  const row = extractItem<Record<string, unknown>>(response);
  if (row?.answers && typeof row.answers === 'object' && !Array.isArray(row.answers)) {
    const result: AssessmentAnswerRow[] = [];
    for (const [questionId, value] of Object.entries(row.answers as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue;
      const a = value as Record<string, unknown>;
      if (Array.isArray(a.choices)) {
        for (const choice of a.choices as unknown[]) {
          const c = choice as Record<string, unknown>;
          result.push({
            question_id: questionId,
            answer: asString(c.answerText ?? c.answer_text ?? c.answer, ''),
            image: asString(c.answerImage ?? c.image, '') || undefined,
          });
        }
      }
    }
    if (result.length > 0) return result;
  }

  const flat = extractArray<Record<string, unknown>>(response);
  if (flat.length > 0) {
    return flat.map(normalizeAnswerRow).filter((r) => r.question_id);
  }

  return [];
}

/** Groups flat answer rows into per-question answer data — mirrors web handleTestAnswers. */
export function groupAnswerRows(
  rows: AssessmentAnswerRow[],
  testQuestions: Record<string, AssessmentSessionQuestion>,
): Record<string, AssessmentAnswer> {
  const result: Record<string, AssessmentAnswer> = {};

  for (const q of Object.values(testQuestions)) {
    result[q.id] = emptyAnswer();
  }

  for (const row of rows) {
    const q = testQuestions[row.question_id];
    if (!q) continue;
    const a = result[row.question_id] ?? emptyAnswer();
    if (!result[row.question_id]) result[row.question_id] = a;

    if (
      q.type === QUESTION_TYPE.MULTIPLE_CHOICE ||
      q.type === QUESTION_TYPE.SURVEY_MULTIPLE_CHOICE ||
      q.type === QUESTION_TYPE.MULTIPLE_CHOICE_SINGLE
    ) {
      a.choices.push({
        answerText: row.answer,
        answerImage: row.image,
      });
    }

    if (
      q.type === QUESTION_TYPE.FILL_IN_THE_BLANK ||
      (q.type === QUESTION_TYPE.MULTIPLE_CHOICE && row.is_correct_ans)
    ) {
      a.answers.push(row.answer);
    }

    if (q.type === QUESTION_TYPE.MATCH_THE_FOLLOWING) {
      if (row.answer_code) {
        const exists = a.answers.some(
          (item) => typeof item === 'object' && item.answerCode === row.answer_code,
        );
        if (!exists) {
          a.answers.push({ answerCode: row.answer_code, answer: row.answer });
        }
      }
      if (row.question_code) {
        const exists = a.questions.some((item) => item.questionCode === row.question_code);
        if (!exists) {
          a.questions.push({ questionCode: row.question_code, question: row.question ?? '' });
        }
      }
    }

    a.comments.push(row.answer_comment ?? '');
    a.reviewStarts.push(row.review_start_pos ?? 0);
    a.reviewEnds.push(row.review_end_pos ?? 0);
  }

  return result;
}

export type CreateUpdateStubArgs = {
  publishId: number;
  studentAssessmentId: number;
  testQuestions?: Record<string, AssessmentSessionQuestion>;
  testAnswers?: Record<string, AssessmentAnswer>;
  endTime: string;
  status: number;
  coursePublishId?: number;
  courseId?: number;
  groupedTest?: number;
  attendedDuration: string;
  interval?: number;
};

export type UploadAssignmentResponse = {
  success?: boolean;
  fileUrl?: string;
  fileName?: string;
  storageType?: string;
  integrityCheck?: { overall_verdict?: { can_submit?: boolean } };
};

export const assessmentApi = createApi({
  reducerPath: 'assessmentApi',
  baseQuery: axiosBaseQuery(),
  tagTypes: ['AssessmentSession', 'AssessmentQuestions', 'AssessmentSummary', 'AssessmentList'],
  endpoints: (builder) => ({
    getAssessmentSessionDetails: builder.query<AssessmentSessionDetails, { publishId: number }>({
      query: ({ publishId }) => ({
        url: ENDPOINTS.ASSESSMENT_SESSION.DETAILS,
        data: { publishId: String(publishId) },
      }),
      transformResponse: (response, _meta, arg) =>
        transformSessionDetails(response, arg.publishId),
      providesTags: (_r, _e, arg) => [{ type: 'AssessmentSession', id: arg.publishId }],
    }),

    createUpdateAssessmentStub: builder.mutation<AssessmentStubResponse, CreateUpdateStubArgs>({
      query: (args) => ({
        url: ENDPOINTS.ASSESSMENT_SESSION.STUB,
        data: {
          publishId: String(args.publishId),
          studentAssessmentId: String(args.studentAssessmentId),
          testQuestions: args.testQuestions,
          testAnswers: args.testAnswers,
          endTime: args.endTime,
          status: args.status,
          attendedDuration: args.attendedDuration,
          ...(args.coursePublishId != null
            ? { coursePublishId: String(args.coursePublishId) }
            : {}),
          ...(args.courseId != null ? { courseId: String(args.courseId) } : {}),
          ...(args.groupedTest != null ? { groupedTest: args.groupedTest } : {}),
          ...(args.interval != null ? { interval: String(args.interval) } : {}),
        },
      }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'AssessmentSession', id: arg.publishId }],
    }),

    getSessionQuestions: builder.query<AssessmentSection[], { studentAssessmentId: number }>({
      query: ({ studentAssessmentId }) => ({
        url: ENDPOINTS.ASSESSMENT_SESSION.QUESTIONS,
        data: { studentAssessmentId: String(studentAssessmentId) },
      }),
      transformResponse: (response) => transformSections(response),
      providesTags: (_r, _e, arg) => [
        { type: 'AssessmentQuestions', id: arg.studentAssessmentId },
      ],
    }),

    getSessionAnswers: builder.query<AssessmentAnswerRow[], { studentAssessmentId: number }>({
      query: ({ studentAssessmentId }) => ({
        url: ENDPOINTS.ASSESSMENT_SESSION.ANSWERS,
        data: { studentAssessmentId: String(studentAssessmentId) },
      }),
      transformResponse: (response) => extractAnswerRows(response),
      providesTags: (_r, _e, arg) => [
        { type: 'AssessmentQuestions', id: arg.studentAssessmentId },
      ],
    }),

    getQuestionSummary: builder.query<QuestionSummary[], { testAssessmentId: number }>({
      query: ({ testAssessmentId }) => ({
        url: ENDPOINTS.ASSESSMENT_SESSION.SUMMARY,
        data: { testAssessmentId: String(testAssessmentId) },
      }),
      transformResponse: (response) => {
        const rows = extractArray<Record<string, unknown>>(response);
        return rows.map((row) => ({
          question_name: asString(row.question_name, ''),
          question_type: asNumber(row.question_type, 0),
          answers: Array.isArray(row.answers) ? row.answers : [],
          status: asString(row.status, ''),
          obt_marks: asNumber(row.obt_marks, 0),
          section_name: asString(row.section_name, ''),
          section_order: asNumber(row.section_order, 0),
          evaluated: Boolean(row.evaluated),
          feedback: asString(row.feedback, '') || undefined,
        }));
      },
      providesTags: (_r, _e, arg) => [
        { type: 'AssessmentSummary', id: arg.testAssessmentId },
      ],
    }),

    uploadAssignmentFile: builder.mutation<
      UploadAssignmentResponse,
      { formData: FormData }
    >({
      query: ({ formData }) => ({
        url: '/upload_file_assignment',
        data: formData,
        isMultipart: true,
      }),
    }),

    getTraineeAssessmentsList: builder.query<
      Array<{ publishId: number; testId: number; name: string }>,
      void
    >({
      query: () => ({
        url: ENDPOINTS.ASSESSMENT.LIST,
        data: {},
      }),
      transformResponse: (response) => {
        const rows = extractArray<Record<string, unknown>>(response);
        return rows.map((row) => ({
          publishId: asNumber(row.id ?? row.publish_id ?? row.assessment_id, 0),
          testId: asNumber(row.test_id ?? row.testid, 0),
          name: asString(row.name ?? row.test_name, ''),
        }));
      },
      providesTags: ['AssessmentList'],
    }),
  }),
});

export const {
  useGetAssessmentSessionDetailsQuery,
  useCreateUpdateAssessmentStubMutation,
  useGetSessionQuestionsQuery,
  useGetSessionAnswersQuery,
  useGetQuestionSummaryQuery,
  useUploadAssignmentFileMutation,
  useGetTraineeAssessmentsListQuery,
} = assessmentApi;
