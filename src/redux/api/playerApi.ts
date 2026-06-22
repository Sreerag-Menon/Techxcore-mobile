import { createApi } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import type { AxiosError } from 'axios';

import { post } from '../../api';
import { ENDPOINTS } from '../../api/endpoints';
import {
  logModuleTimeOutcome,
  logPointsOutcome,
  parseModuleTimeResponse,
} from '../../utils/progressDiagnostics';
import { logPlayerApiCall, PLAYER_API_ENDPOINTS } from '../../utils/playerApiLog';
import {
  asBoolean,
  asNumber,
  asString,
  buildCourseHierarchy,
  buildTraineePlaybackHierarchy,
  extractArray,
  extractItem,
} from '../../api/normalize';
import { QUESTION_TYPE } from '../../constants/questionTypes';
import type {
  CourseHier,
  CourseModule,
  ICQAnswerData,
  InCourseQuestion,
} from '../../types/course.types';

export type SaveModuleProgressArgs = {
  coursePublishId: number;
  courseId: number;
  curriculumId: number;
  memberId: number;
  contentId: number;
  lastViewedPos?: number;
  maxViewedPos?: number;
  timeId?: '0' | '1';
  inProgress?: 0 | 1;
  status?: 1;
  acadYearId?: number;
  /** When false, skips CurrentModule refetch (inline HTML / HTMLeditor). */
  invalidateCurrentModule?: boolean;
};

export type RecordPointsArgs = {
  coursePublishId: number;
  courseId: number;
  curriculumId: number;
  memberId: number;
  contentId: number;
  chapterId: number;
  videoUnitId?: number;
  type?: 'M' | 'T';
  classId?: number;
  acadYearId?: number;
};

function patchModuleStatusInHierarchy(
  hierarchy: CourseHier,
  contentId: number,
  status: CourseModule['status'],
): CourseHier {
  return {
    ...hierarchy,
    chapters: hierarchy.chapters.map((chapter) => ({
      ...chapter,
      modules: chapter.modules.map((mod) =>
        mod.contentId === contentId ? { ...mod, status } : mod,
      ),
    })),
  };
}

function patchModuleProgressInHierarchy(
  hierarchy: CourseHier,
  contentId: number,
  lastViewedPos: number,
  maxViewedPos: number,
): CourseHier {
  return {
    ...hierarchy,
    chapters: hierarchy.chapters.map((chapter) => ({
      ...chapter,
      modules: chapter.modules.map((mod) => {
        if (mod.contentId !== contentId) return mod;
        const prevLast = mod.summary?.lastPositionSeconds ?? 0;
        const prevMax = mod.summary?.totalTimeSeconds ?? prevLast;
        const nextLast = Math.max(prevLast, lastViewedPos);
        const nextMax = Math.max(prevMax, maxViewedPos, nextLast);
        return {
          ...mod,
          status: mod.status === 'completed' ? mod.status : 'in_progress',
          summary: {
            ...mod.summary,
            lastPositionSeconds: nextLast,
            totalTimeSeconds: nextMax,
          },
        };
      }),
    })),
  };
}

function extractPointsStatusValue(response: unknown): number {
  const row = extractItem<Record<string, unknown>>(response);
  return asNumber(row?.statusvalue ?? row?.StatusValue, 0);
}

type AxiosBaseQueryArgs = {
  url: string;
  data?: unknown;
};

type AxiosBaseQueryError = {
  status?: number;
  data?: unknown;
  message: string;
};

function buildModuleProgressBody(args: SaveModuleProgressArgs): Record<string, unknown> {
  const body: Record<string, unknown> = {
    timeId: args.timeId ?? '1',
    inProgress: args.inProgress ?? 1,
    status: args.status ?? 1,
    courseId: String(args.courseId),
    memberId: String(args.memberId),
    videoUnitId: String(args.contentId),
    curriculumId: String(args.curriculumId),
    coursePublishId: String(args.coursePublishId),
  };

  if (args.lastViewedPos != null) body.lastViewedPos = args.lastViewedPos;
  if (args.maxViewedPos != null) body.maxViewedPos = args.maxViewedPos;
  if (args.acadYearId != null) body.acadYearId = String(args.acadYearId);

  return body;
}

const axiosBaseQuery =
  (): BaseQueryFn<AxiosBaseQueryArgs, unknown, AxiosBaseQueryError> =>
  async ({ url, data }) => {
    try {
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

export type TraineeCurrentModuleResponse = {
  contentId: number;
  chapterId: number;
};

export type NotesResponse = {
  notes: string;
};

export type TrainerMessage = {
  id: number | string;
  senderName?: string;
  senderRole?: string;
  message: string;
  createdAt?: string;
  isMine?: boolean;
};

export type CourseRatingResponse = {
  rating: number;
  comment?: string;
};

export type CertificateResponse = {
  certificateUrl: string;
};

export type DiscourseComment = {
  id?: number | string;
  author?: string;
  message: string;
  createdAt?: string;
};

function transformCertificateResponse(response: unknown): CertificateResponse {
  const row = extractItem<Record<string, unknown>>(response);
  const url = asString(row?.url ?? row?.certificate_url ?? row?.certificateUrl, '').trim();
  return { certificateUrl: url };
}

function transformDiscourseComments(response: unknown): DiscourseComment[] {
  const rows = extractArray<Record<string, unknown>>(response);
  return rows.map((row, index) => {
    const rawId = row.id;
    const id =
      typeof rawId === 'number' || typeof rawId === 'string' ? rawId : index;
    return {
      id,
      author: asString(row.username ?? row.studentName ?? row.author, 'Student').trim(),
      message: asString(row.message ?? row.raw ?? row.cooked, '').trim(),
      createdAt: asString(row.created_at ?? row.createdAt, '') || undefined,
    };
  });
}

function transformHierarchyResponse(
  response: unknown,
  coursePublishId: number,
  preferredCourseId?: number,
): CourseHier {
  const playbackRow = extractItem<Record<string, unknown>>(response);
  if (playbackRow?.course_module_details != null) {
    return buildTraineePlaybackHierarchy(response, coursePublishId);
  }

  const rows = extractArray<Record<string, unknown>>(response);
  if (rows.length === 0) {
    return buildCourseHierarchy(response, coursePublishId);
  }

  const hasV2Shape = rows.some((row) => row.course_details != null);
  if (hasV2Shape) {
    const match =
      preferredCourseId != null
        ? rows.find((row) => asNumber(row.course_id, 0) === preferredCourseId) ?? rows[0]
        : rows[0];
    return buildCourseHierarchy(match?.course_details ?? match, coursePublishId);
  }

  return buildCourseHierarchy(response, coursePublishId);
}

export type GetICQAnswersArgs = {
  videoUnitId: number;
  coursePublishId: number;
  courseId?: number;
  curriculumId?: number;
};

export type InsertICQResultsArgs = {
  memberId: number;
  curriculumId: number;
  videoUnitId: number;
  testQuestionId: string;
  coursePublishId: number;
  testQuestion: string;
  questionType: number;
  testPoints: number;
  correctAnswers: string[];
  incorrectAnswers: string[];
  missedAnswers: string[];
  courseId?: number;
};

function transformICQAnswersResponse(
  response: unknown,
  questions: InCourseQuestion[],
): Record<string, ICQAnswerData> {
  const questionMap = new Map(questions.map((q) => [q.id, q]));
  const answers: Record<string, ICQAnswerData> = {};

  for (const q of questions) {
    answers[q.id] = {
      choices: [],
      answers: [],
      comments: [],
      reviewStarts: [],
      reviewEnds: [],
    };
  }

  const rows = extractArray<Record<string, unknown>>(response);
  for (const row of rows) {
    const qid = asString(row.test_que_id ?? row.test_question_id ?? row.testQuestionId, '');
    const q = questionMap.get(qid);
    if (!q || !answers[qid]) continue;

    const entry = answers[qid];
    const answerText = asString(row.test_answer, '');
    const typeE = QUESTION_TYPE;

    if (
      q.type === typeE.MULTIPLE_CHOICE ||
      q.type === typeE.SURVEY_MULTIPLE_CHOICE ||
      q.type === typeE.MULTIPLE_CHOICE_SINGLE
    ) {
      entry.choices.push({
        answerText,
        answerImage: asString(row.image, '') || undefined,
      });
    }
    if (
      q.type === typeE.FILL_IN_THE_BLANK ||
      (q.type === typeE.MULTIPLE_CHOICE && asBoolean(row.is_correct_ans, false))
    ) {
      entry.answers.push(answerText);
    }
    entry.comments.push(asString(row.answer_comment, ''));
    entry.reviewStarts.push(asNumber(row.review_start_pos, 0));
    entry.reviewEnds.push(asNumber(row.review_end_pos, 0));
  }

  return answers;
}

function transformCurrentModuleResponse(
  response: unknown,
): TraineeCurrentModuleResponse | null {
  const row = extractItem<Record<string, unknown>>(response);
  if (!row) return null;

  const status = asNumber(row.statusvalue ?? row.StatusValue, 0);
  if (status !== 1) return null;

  const contentId = asNumber(row.module_id ?? row.content_id ?? row.contentId, Number.NaN);
  if (!Number.isFinite(contentId)) return null;

  const chapterId = asNumber(row.chapter_id ?? row.chapterId, 0);
  return {
    contentId,
    chapterId: Number.isFinite(chapterId) ? chapterId : 0,
  };
}

export const playerApi = createApi({
  reducerPath: 'playerApi',
  baseQuery: axiosBaseQuery(),
  tagTypes: [
    'Hierarchy',
    'CurrentModule',
    'Progress',
    'Notes',
    'Messages',
    'Rating',
    'Certificate',
    'Discourse',
  ],
  endpoints: (builder) => ({
    getCourseHierarchy: builder.query<
      CourseHier,
      { coursePublishId: number; courseId: number; chapterId?: number }
    >({
      query: ({ coursePublishId, courseId, chapterId }) => {
        const data: Record<string, string> = {
          coursePublishId: String(coursePublishId),
          courseId: String(courseId),
        };
        if (chapterId != null) data.chapterId = String(chapterId);
        return { url: ENDPOINTS.STUDENT.TRAINEE_COURSE_PUBLISH_HIER, data };
      },
      async onQueryStarted(arg, { queryFulfilled }) {
        const data: Record<string, string> = {
          coursePublishId: String(arg.coursePublishId),
          courseId: String(arg.courseId),
        };
        if (arg.chapterId != null) data.chapterId = String(arg.chapterId);
        logPlayerApiCall(PLAYER_API_ENDPOINTS.COURSE_HIER, 'request', data);
        try {
          const { data: response } = await queryFulfilled;
          logPlayerApiCall(PLAYER_API_ENDPOINTS.COURSE_HIER, 'response', response);
        } catch (error) {
          logPlayerApiCall(PLAYER_API_ENDPOINTS.COURSE_HIER, 'error', error);
        }
      },
      transformResponse: (response, _meta, arg) =>
        transformHierarchyResponse(response, arg.coursePublishId, arg.courseId),
      providesTags: (_result, _error, arg) => [
        { type: 'Hierarchy', id: arg.coursePublishId },
      ],
    }),

    getCurrentModule: builder.query<
      TraineeCurrentModuleResponse | null,
      { coursePublishId: number; courseId: number; curriculumId: number; chapterId?: number }
    >({
      query: ({ coursePublishId, courseId, curriculumId, chapterId }) => {
        const data: Record<string, string> = {
          coursePublishId: String(coursePublishId),
          courseId: String(courseId),
          curriculumId: String(curriculumId),
        };
        if (chapterId != null) data.chapterId = String(chapterId);
        return { url: ENDPOINTS.STUDENT.CURRENT_MODULE, data };
      },
      async onQueryStarted(arg, { queryFulfilled }) {
        const data: Record<string, string> = {
          coursePublishId: String(arg.coursePublishId),
          courseId: String(arg.courseId),
          curriculumId: String(arg.curriculumId),
        };
        if (arg.chapterId != null) data.chapterId = String(arg.chapterId);
        logPlayerApiCall(PLAYER_API_ENDPOINTS.CURRENT_MODULE, 'request', data);
        try {
          const { data: response } = await queryFulfilled;
          logPlayerApiCall(PLAYER_API_ENDPOINTS.CURRENT_MODULE, 'response', response);
        } catch (error) {
          logPlayerApiCall(PLAYER_API_ENDPOINTS.CURRENT_MODULE, 'error', error);
        }
      },
      transformResponse: (response) => transformCurrentModuleResponse(response),
      providesTags: (_result, _error, arg) => [
        { type: 'CurrentModule', id: arg.coursePublishId },
      ],
    }),

    saveModuleProgress: builder.mutation<unknown, SaveModuleProgressArgs>({
      query: (args) => ({
        url: ENDPOINTS.STUDENT.MODULE_PROGRESS,
        data: buildModuleProgressBody(args),
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        const body = buildModuleProgressBody(arg);
        logPlayerApiCall(PLAYER_API_ENDPOINTS.MODULE_TIME, 'request', body);
        logModuleTimeOutcome('request', body);
        try {
          const { data } = await queryFulfilled;
          logPlayerApiCall(PLAYER_API_ENDPOINTS.MODULE_TIME, 'response', data);
          logModuleTimeOutcome('response', body, data);

          const { accepted } = parseModuleTimeResponse(data);
          if (!accepted) return;

          // Periodic saves (timeId '1') don't need optimistic hierarchy patch — avoids re-render cascade
          if (arg.timeId === '1') return;

          const lastPos = arg.lastViewedPos;
          const maxPos = arg.maxViewedPos ?? lastPos;
          if (lastPos == null || !Number.isFinite(lastPos)) return;

          dispatch(
            playerApi.util.updateQueryData(
              'getCourseHierarchy',
              { coursePublishId: arg.coursePublishId, courseId: arg.courseId },
              (draft) =>
                patchModuleProgressInHierarchy(draft, arg.contentId, lastPos, maxPos ?? lastPos),
            ),
          );
        } catch (error) {
          logPlayerApiCall(PLAYER_API_ENDPOINTS.MODULE_TIME, 'error', error);
          logModuleTimeOutcome('error', body, error);
        }
      },
      invalidatesTags: (_result, _error, arg) => {
        // Periodic playback saves should not invalidate cache — avoids player re-render cascade
        if (arg.timeId === '1' && arg.invalidateCurrentModule === false) {
          return [];
        }
        const tags: Array<{ type: 'CurrentModule' | 'Progress'; id: number }> = [
          { type: 'Progress', id: arg.contentId },
        ];
        if (arg.invalidateCurrentModule !== false) {
          tags.push({ type: 'CurrentModule', id: arg.coursePublishId });
        }
        return tags;
      },
    }),

    saveTestProgress: builder.mutation<
      unknown,
      { coursePublishId: number; curriculumId?: number; contentId: number; seconds: number }
    >({
      query: ({ coursePublishId, curriculumId, contentId, seconds }) => ({
        url: ENDPOINTS.STUDENT.TEST_PROGRESS,
        data: {
          coursePublishId: String(coursePublishId),
          curriculumId: curriculumId != null ? String(curriculumId) : undefined,
          contentId,
          seconds,
        },
      }),
    }),

    recordPoints: builder.mutation<unknown, RecordPointsArgs>({
      query: ({
        coursePublishId,
        curriculumId,
        courseId,
        memberId,
        contentId,
        chapterId,
        videoUnitId,
        type = 'M',
        classId,
        acadYearId,
      }) => {
        const data: Record<string, string> = {
          memberId: String(memberId),
          coursePublishId: String(coursePublishId),
          curriculumId: String(curriculumId),
          courseId: String(courseId),
          videoUnitId: String(videoUnitId ?? contentId),
          chapterId: String(chapterId),
          type,
        };
        if (classId != null) data.classId = String(classId);
        if (acadYearId != null) data.acadYearId = String(acadYearId);
        return { url: ENDPOINTS.STUDENT.TRAINEE_POINTS, data };
      },
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        const data: Record<string, string> = {
          memberId: String(arg.memberId),
          coursePublishId: String(arg.coursePublishId),
          curriculumId: String(arg.curriculumId),
          courseId: String(arg.courseId),
          videoUnitId: String(arg.videoUnitId ?? arg.contentId),
          chapterId: String(arg.chapterId),
          type: arg.type ?? 'M',
        };
        if (arg.classId != null) data.classId = String(arg.classId);
        if (arg.acadYearId != null) data.acadYearId = String(arg.acadYearId);
        logPlayerApiCall(PLAYER_API_ENDPOINTS.TRAINEE_POINTS, 'request', data);
        logPointsOutcome('request', data);
        try {
          const { data: response } = await queryFulfilled;
          logPlayerApiCall(PLAYER_API_ENDPOINTS.TRAINEE_POINTS, 'response', response);
          logPointsOutcome('response', data, response);
          if (extractPointsStatusValue(response) !== 1) return;
          dispatch(
            playerApi.util.updateQueryData(
              'getCourseHierarchy',
              { coursePublishId: arg.coursePublishId, courseId: arg.courseId },
              (draft) => patchModuleStatusInHierarchy(draft, arg.contentId, 'completed'),
            ),
          );
        } catch (error) {
          logPlayerApiCall(PLAYER_API_ENDPOINTS.TRAINEE_POINTS, 'error', error);
          logPointsOutcome('error', data, error);
        }
      },
      invalidatesTags: (_result, _error, arg) => [
        { type: 'CurrentModule', id: arg.coursePublishId },
      ],
    }),

    saveCreditTime: builder.mutation<
      unknown,
      {
        coursePublishId: number;
        courseId: number;
        studentId: number;
        hourId?: number;
        startCourse?: number;
        stopCourse?: number;
      }
    >({
      query: ({ coursePublishId, courseId, studentId, hourId, startCourse, stopCourse }) => ({
        url: ENDPOINTS.STUDENT.TRAINEE_CREDIT_TIME,
        data: {
          hourId: hourId ?? 0,
          coursePublishId: String(coursePublishId),
          courseId: String(courseId),
          studentId: String(studentId),
          startCourse: startCourse ?? 0,
          stopCourse: stopCourse ?? 0,
        },
      }),
      async onQueryStarted(arg, { queryFulfilled }) {
        const data = {
          hourId: arg.hourId ?? 0,
          coursePublishId: String(arg.coursePublishId),
          courseId: String(arg.courseId),
          studentId: String(arg.studentId),
          startCourse: arg.startCourse ?? 0,
          stopCourse: arg.stopCourse ?? 0,
        };
        logPlayerApiCall(PLAYER_API_ENDPOINTS.CREDIT_TIME, 'request', data);
        try {
          const { data: response } = await queryFulfilled;
          logPlayerApiCall(PLAYER_API_ENDPOINTS.CREDIT_TIME, 'response', response);
        } catch (error) {
          logPlayerApiCall(PLAYER_API_ENDPOINTS.CREDIT_TIME, 'error', error);
        }
      },
    }),

    getModuleNotes: builder.query<
      NotesResponse,
      { memberId: number; curriculumId: number; contentId: number }
    >({
      query: ({ memberId, curriculumId, contentId }) => ({
        url: ENDPOINTS.STUDENT.MODULE_NOTES_GET,
        data: {
          memberId: String(memberId),
          curriculumId: String(curriculumId),
          contentId: String(contentId),
        },
      }),
      providesTags: (_result, _error, arg) => [{ type: 'Notes', id: arg.contentId }],
    }),

    saveModuleNote: builder.mutation<
      unknown,
      { memberId: number; curriculumId: number; contentId: number; notes: string }
    >({
      query: ({ memberId, curriculumId, contentId, notes }) => ({
        url: ENDPOINTS.STUDENT.MODULE_NOTES_SAVE,
        data: {
          memberId: String(memberId),
          curriculumId: String(curriculumId),
          contentId: String(contentId),
          notes,
        },
      }),
      invalidatesTags: (_result, _error, arg) => [{ type: 'Notes', id: arg.contentId }],
    }),

    getTrainerMessages: builder.query<
      TrainerMessage[],
      { memberId: number; curriculumId: number; contentId: number; coursePublishId: number }
    >({
      query: ({ memberId, curriculumId, contentId, coursePublishId }) => ({
        url: ENDPOINTS.COMMUNICATION.GET_MESSAGES,
        data: {
          memberId: String(memberId),
          curriculumId: String(curriculumId),
          contentId: String(contentId),
          coursePublishId: String(coursePublishId),
        },
      }),
      providesTags: (_result, _error, arg) => [{ type: 'Messages', id: arg.contentId }],
    }),

    sendTrainerMessage: builder.mutation<
      unknown,
      { memberId: number; curriculumId: number; contentId: number; message: string }
    >({
      query: ({ memberId, curriculumId, contentId, message }) => ({
        url: ENDPOINTS.COMMUNICATION.SEND_MESSAGE,
        data: {
          memberId: String(memberId),
          curriculumId: String(curriculumId),
          contentId: String(contentId),
          message,
        },
      }),
      invalidatesTags: (_result, _error, arg) => [{ type: 'Messages', id: arg.contentId }],
    }),

    getCourseRating: builder.query<CourseRatingResponse, { coursePublishId: number }>({
      query: ({ coursePublishId }) => ({
        url: ENDPOINTS.STUDENT.COURSE_RATING,
        data: { coursePublishId: String(coursePublishId) },
      }),
      providesTags: (_result, _error, arg) => [{ type: 'Rating', id: arg.coursePublishId }],
    }),

    submitCourseRating: builder.mutation<
      unknown,
      { coursePublishId: number; rating: number; comment?: string }
    >({
      query: ({ coursePublishId, rating, comment }) => ({
        url: ENDPOINTS.STUDENT.COURSE_RATING,
        data: { coursePublishId: String(coursePublishId), rating, comment },
      }),
      invalidatesTags: (_result, _error, arg) => [{ type: 'Rating', id: arg.coursePublishId }],
    }),

    getCertificate: builder.query<
      CertificateResponse,
      {
        coursePublishId: number;
        certificateConfigId?: number;
        type?: string;
      }
    >({
      query: ({ coursePublishId, certificateConfigId, type }) => {
        if (certificateConfigId != null && certificateConfigId > 0) {
          return {
            url: ENDPOINTS.STUDENT.CERTIFICATE_GENERATE,
            data: {
              id: String(coursePublishId),
              certificate_config_id: certificateConfigId,
              type: type ?? 'Course',
            },
          };
        }
        return {
          url: ENDPOINTS.STUDENT.CERTIFICATE,
          data: { coursePublishId: String(coursePublishId) },
        };
      },
      transformResponse: (response) => transformCertificateResponse(response),
      providesTags: (_result, _error, arg) => [
        { type: 'Certificate', id: arg.coursePublishId },
      ],
    }),

    getDiscourseComments: builder.query<DiscourseComment[], { topicId: number | string }>({
      query: ({ topicId }) => ({
        url: ENDPOINTS.DISCOURSE.COMMENTS,
        data: { topicId },
      }),
      transformResponse: (response) => transformDiscourseComments(response),
      providesTags: (_result, _error, arg) => [{ type: 'Discourse', id: String(arg.topicId) }],
    }),

    postDiscourseComment: builder.mutation<
      unknown,
      { topicId: number | string; message: string; studentName: string }
    >({
      query: ({ topicId, message, studentName }) => ({
        url: ENDPOINTS.DISCOURSE.POST_COMMENT,
        data: { topicId, message, studentName },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Discourse', id: String(arg.topicId) },
      ],
    }),

    getICQAnswers: builder.query<
      Record<string, ICQAnswerData>,
      GetICQAnswersArgs & { questions: InCourseQuestion[] }
    >({
      query: ({ videoUnitId, coursePublishId, courseId, curriculumId }) => {
        const data: Record<string, string> = {
          videoUnitId: String(videoUnitId),
          coursePublishId: String(coursePublishId),
        };
        if (courseId != null) data.courseId = String(courseId);
        if (curriculumId != null) data.curriculumId = String(curriculumId);
        return { url: ENDPOINTS.IN_COURSE_QUIZ.GET_ANSWERS, data };
      },
      transformResponse: (response, _meta, arg) =>
        transformICQAnswersResponse(response, arg.questions),
    }),

    insertICQResults: builder.mutation<unknown, InsertICQResultsArgs>({
      query: (args) => ({
        url: ENDPOINTS.IN_COURSE_QUIZ.INSERT_RESULTS,
        data: {
          memberId: String(args.memberId),
          curriculumId: String(args.curriculumId),
          videoUnitId: String(args.videoUnitId),
          testQuestionId: args.testQuestionId,
          coursePublishId: String(args.coursePublishId),
          testQuestion: args.testQuestion,
          questionType: args.questionType,
          testPoints: args.testPoints,
          correctAnswers: args.correctAnswers,
          incorrectAnswers: args.incorrectAnswers,
          missedAnswers: args.missedAnswers,
          ...(args.courseId != null ? { courseId: String(args.courseId) } : {}),
        },
      }),
    }),
  }),
});

export const {
  useGetCourseHierarchyQuery,
  useGetCurrentModuleQuery,
  useSaveModuleProgressMutation,
  useSaveTestProgressMutation,
  useRecordPointsMutation,
  useSaveCreditTimeMutation,
  useGetModuleNotesQuery,
  useSaveModuleNoteMutation,
  useGetTrainerMessagesQuery,
  useSendTrainerMessageMutation,
  useGetCourseRatingQuery,
  useSubmitCourseRatingMutation,
  useGetCertificateQuery,
  useGetDiscourseCommentsQuery,
  usePostDiscourseCommentMutation,
  useGetICQAnswersQuery,
  useInsertICQResultsMutation,
} = playerApi;
