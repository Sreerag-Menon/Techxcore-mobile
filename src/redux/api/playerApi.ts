import { createApi } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import type { AxiosError } from 'axios';

import { post } from '../../api';
import { ENDPOINTS } from '../../api/endpoints';
import { buildCourseHierarchy } from '../../api/normalize';
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
  ],
  endpoints: (builder) => ({
    getCourseHierarchy: builder.query<CourseHier, { coursePublishId: number }>({
      query: ({ coursePublishId }) => ({
        url: ENDPOINTS.STUDENT.COURSE_HIER,
        data: { course_publish_id: coursePublishId },
      }),
      transformResponse: (response: unknown, _meta, arg) =>
        buildCourseHierarchy(response, arg.coursePublishId),
      providesTags: (_result, _error, arg) => [
        { type: 'Hierarchy', id: arg.coursePublishId },
      ],
    }),

    getCurrentModule: builder.query<
      TraineeCurrentModuleResponse,
      { coursePublishId: number; courseId?: number; curriculumId?: number }
    >({
      query: ({ coursePublishId, courseId, curriculumId }) => ({
        url: ENDPOINTS.STUDENT.CURRENT_MODULE,
        data: {
          course_publish_id: coursePublishId,
          course_id: courseId,
          curriculum_id: curriculumId,
        },
      }),
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
          course_publish_id: coursePublishId,
          curriculum_id: curriculumId,
          content_id: contentId,
          seconds,
          total_seconds: totalSeconds,
          action,
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
          course_publish_id: coursePublishId,
          curriculum_id: curriculumId,
          content_id: contentId,
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
          course_publish_id: coursePublishId,
          curriculum_id: curriculumId,
          content_id: contentId,
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
      { coursePublishId: number; curriculumId?: number; action: 'start' | 'stop' }
    >({
      query: ({ coursePublishId, curriculumId, action }) => ({
        url: ENDPOINTS.STUDENT.TRAINEE_CREDIT_TIME,
        data: {
          course_publish_id: coursePublishId,
          curriculum_id: curriculumId,
          action,
        },
      }),
    }),

    getModuleNotes: builder.query<
      NotesResponse,
      { memberId: number; curriculumId: number; contentId: number }
    >({
      query: ({ memberId, curriculumId, contentId }) => ({
        url: ENDPOINTS.STUDENT.MODULE_NOTES_GET,
        data: { member_id: memberId, curriculum_id: curriculumId, content_id: contentId },
      }),
      providesTags: (_result, _error, arg) => [{ type: 'Notes', id: arg.contentId }],
    }),

    saveModuleNote: builder.mutation<
      unknown,
      { memberId: number; curriculumId: number; contentId: number; notes: string }
    >({
      query: ({ memberId, curriculumId, contentId, notes }) => ({
        url: ENDPOINTS.STUDENT.MODULE_NOTES_SAVE,
        data: { member_id: memberId, curriculum_id: curriculumId, content_id: contentId, notes },
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
          member_id: memberId,
          curriculum_id: curriculumId,
          content_id: contentId,
          course_publish_id: coursePublishId,
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
        data: { member_id: memberId, curriculum_id: curriculumId, content_id: contentId, message },
      }),
      invalidatesTags: (_result, _error, arg) => [{ type: 'Messages', id: arg.contentId }],
    }),

    getCourseRating: builder.query<CourseRatingResponse, { coursePublishId: number }>({
      query: ({ coursePublishId }) => ({
        url: ENDPOINTS.STUDENT.COURSE_RATING,
        data: { course_publish_id: coursePublishId },
      }),
      providesTags: (_result, _error, arg) => [{ type: 'Rating', id: arg.coursePublishId }],
    }),

    submitCourseRating: builder.mutation<
      unknown,
      { coursePublishId: number; rating: number; comment?: string }
    >({
      query: ({ coursePublishId, rating, comment }) => ({
        url: ENDPOINTS.STUDENT.COURSE_RATING,
        data: { course_publish_id: coursePublishId, rating, comment },
      }),
      invalidatesTags: (_result, _error, arg) => [{ type: 'Rating', id: arg.coursePublishId }],
    }),

    getCertificate: builder.query<CertificateResponse, { coursePublishId: number }>({
      query: ({ coursePublishId }) => ({
        url: ENDPOINTS.STUDENT.CERTIFICATE,
        data: { course_publish_id: coursePublishId },
      }),
      providesTags: (_result, _error, arg) => [
        { type: 'Certificate', id: arg.coursePublishId },
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
} = playerApi;

