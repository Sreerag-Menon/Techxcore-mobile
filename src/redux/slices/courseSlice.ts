import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';

import { asNumber, asString, extractArray, extractItem, post } from '../../api';
import { ENDPOINTS } from '../../api/endpoints';
import type { RootState } from '../store';
import { mapCoursePublishingList } from '../../services/mapCoursePublishing';
import type {
  Course,
  CourseDetails,
  CourseState,
} from '../../types/course.types';

// --------------------------------------------------------------------------
// Initial state
// --------------------------------------------------------------------------

const initialState: CourseState = {
  courses: [],
  dashboardCourses: [],
  currentCourse: null,
  isLoading: false,
  isLoadingCourseDetails: false,
  error: null,
};

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function extractErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return (
    axiosError?.response?.data?.message ??
    axiosError?.message ??
    'Failed to load courses'
  );
}

// --------------------------------------------------------------------------
// Async thunks
// --------------------------------------------------------------------------

export const fetchCourses = createAsyncThunk<
  Course[],
  Record<string, unknown> | undefined,
  { rejectValue: string; state: RootState }
>('course/fetchCourses', async (params = {}, { rejectWithValue, getState }) => {
  const user = getState().auth.user;
  if (!user?.member_id) {
    return rejectWithValue('Not signed in');
  }

  const requestBody: Record<string, unknown> = {
    studentId: String(user.member_id),
    ...params,
  };

  if (user.acad_year_id) {
    requestBody.acadYearId = String(user.acad_year_id);
  }

  try {
    const response = await post<unknown>(
      ENDPOINTS.STUDENT.COURSE_PUBLISHINGS,
      requestBody,
    );
    const rows = extractArray<unknown>(response);
    return mapCoursePublishingList(rows);
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error));
  }
});

export const fetchDashboardCourses = createAsyncThunk<
  Course[],
  Record<string, unknown> | undefined,
  { rejectValue: string }
>('course/fetchDashboardCourses', async (params = {}, { rejectWithValue }) => {
  try {
    const response = await post<unknown>(ENDPOINTS.STUDENT.DASHBOARD_COURSES, params);
    return extractArray<Course>(response, ['courses']);
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error));
  }
});

export const fetchCourseDetails = createAsyncThunk<
  CourseDetails,
  { course_publish_id: number },
  { rejectValue: string; state: RootState }
>(
  'course/fetchCourseDetails',
  async (params, { rejectWithValue }) => {
  try {
    const detailsResponse = await post<unknown>(ENDPOINTS.STUDENT.COURSE_DETAILS, {
      coursePublishId: String(params.course_publish_id),
    });

    const row = extractItem<Record<string, unknown>>(detailsResponse);
    if (!row) {
      throw new Error('Course details not found');
    }

    const course_publish_id = asNumber(
      row.course_publish_id ?? params.course_publish_id,
      params.course_publish_id,
    );

    return {
      course_id: asNumber(row.course_id, course_publish_id),
      course_publish_id,
      course_name: asString(row.course_name ?? row.name, 'Course'),
      course_description: asString(row.description ?? row.course_description, ''),
      course_image: asString(row.image, '') || undefined,
      instructor_name: asString(row.trainer_name ?? row.instructor_name, '') || undefined,
      total_duration: asString(row.duration ?? row.hour_duration, '') || undefined,
      total_modules: asNumber(row.chap_count ?? row.module_count, 0),
      contents: [],
    };
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error));
  }
  },
  {
    condition: (params, { getState }) => {
      const { currentCourse } = getState().course;
      return currentCourse?.course_publish_id !== params.course_publish_id;
    },
  },
);

// --------------------------------------------------------------------------
// Slice
// --------------------------------------------------------------------------

const courseSlice = createSlice({
  name: 'course',
  initialState,
  reducers: {
    clearCourseError(state) {
      state.error = null;
    },
    clearCurrentCourse(state) {
      state.currentCourse = null;
    },
  },
  extraReducers: (builder) => {
    // fetchCourses
    builder
      .addCase(fetchCourses.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCourses.fulfilled, (state, action) => {
        state.isLoading = false;
        state.courses = action.payload;
      })
      .addCase(fetchCourses.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to load courses';
      });

    // fetchDashboardCourses
    builder
      .addCase(fetchDashboardCourses.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDashboardCourses.fulfilled, (state, action) => {
        state.isLoading = false;
        state.dashboardCourses = action.payload;
      })
      .addCase(fetchDashboardCourses.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to load dashboard courses';
      });

    // fetchCourseDetails
    builder
      .addCase(fetchCourseDetails.pending, (state) => {
        state.isLoadingCourseDetails = true;
        state.error = null;
      })
      .addCase(fetchCourseDetails.fulfilled, (state, action) => {
        state.isLoadingCourseDetails = false;
        state.currentCourse = action.payload;
      })
      .addCase(fetchCourseDetails.rejected, (state, action) => {
        state.isLoadingCourseDetails = false;
        state.error = action.payload ?? 'Failed to load course details';
      });
  },
});

export const { clearCourseError, clearCurrentCourse } = courseSlice.actions;
export default courseSlice.reducer;
