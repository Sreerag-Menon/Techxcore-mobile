import { createApi } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import type { AxiosError } from 'axios';

import { post } from '../../api';
import { ENDPOINTS } from '../../api/endpoints';
import {
  asNumber,
  asString,
  buildCourseHierarchy,
  buildTraineePlaybackHierarchy,
  extractArray,
  extractItem,
} from '../../api/normalize';
import type { CourseHier } from '../../types/course.types';

type AxiosBaseQueryArgs = {
  url: string;
  data?: unknown;
};

type AxiosBaseQueryError = {
  status?: number;
  data?: unknown;
  message: string;
};

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
      { coursePublishId: number; courseId: number }
    >({
      query: ({ coursePublishId, courseId }) => ({
        url: ENDPOINTS.STUDENT.TRAINEE_COURSE_PUBLISH_HIER,
        data: {
          coursePublishId: String(coursePublishId),
          courseId: String(courseId),
        },
      }),
      transformResponse: (response, _meta, arg) =>
        transformHierarchyResponse(response, arg.coursePublishId, arg.courseId),
      providesTags: (_result, _error, arg) => [
        { type: 'Hierarchy', id: arg.coursePublishId },
      ],
    }),

    getCurrentModule: builder.query<
      TraineeCurrentModuleResponse | null,
      { coursePublishId: number; courseId: number; curriculumId: number }
    >({
      query: ({ coursePublishId, courseId, curriculumId }) => ({
        url: ENDPOINTS.STUDENT.CURRENT_MODULE,
        data: {
          coursePublishId: String(coursePublishId),
          courseId: String(courseId),
          curriculumId: String(curriculumId),
        },
      }),
      transformResponse: (response) => transformCurrentModuleResponse(response),
      providesTags: (_result, _error, arg) => [
        { type: 'CurrentModule', id: arg.coursePublishId },
      ],
    }),

    saveModuleProgress: builder.mutation<
      unknown,
      {
        coursePublishId: number;
        curriculumId?: number;
        contentId: number;
        seconds: number;
        totalSeconds?: number;
        action?: 'summary' | 'progress';
      }
    >({
      query: ({ coursePublishId, curriculumId, contentId, seconds, totalSeconds, action }) => ({
        url: ENDPOINTS.STUDENT.MODULE_PROGRESS,
        data: {
          coursePublishId: String(coursePublishId),
          curriculumId: curriculumId != null ? String(curriculumId) : undefined,
          videoUnitId: String(contentId),
          lastViewedPos: seconds,
          maxViewedPos: totalSeconds ?? seconds,
        },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'CurrentModule', id: arg.coursePublishId },
        { type: 'Progress', id: arg.contentId },
      ],
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

    recordPoints: builder.mutation<
      unknown,
      {
        coursePublishId: number;
        curriculumId?: number;
        contentId: number;
        points?: number;
        credits?: number;
        completed?: boolean;
      }
    >({
      query: ({ coursePublishId, curriculumId, contentId, points, credits, completed }) => ({
        url: ENDPOINTS.STUDENT.TRAINEE_POINTS,
        data: {
          coursePublishId: String(coursePublishId),
          curriculumId: curriculumId != null ? String(curriculumId) : undefined,
          contentId,
          points,
          credits,
          completed,
        },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Hierarchy', id: arg.coursePublishId },
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
} = playerApi;
