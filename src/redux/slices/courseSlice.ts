import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';

import { extractArray, extractItem, post } from '../../api';
import { ENDPOINTS } from '../../api/endpoints';
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
  { rejectValue: string }
>('course/fetchCourses', async (params = {}, { rejectWithValue }) => {
  try {
    const response = await post<unknown>(ENDPOINTS.STUDENT.COURSES, params);
    return extractArray<Course>(response, ['courses']);
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
  { rejectValue: string }
>('course/fetchCourseDetails', async (params, { rejectWithValue }) => {
  try {
    const [detailsResponse, contentResponse] = await Promise.all([
      post<unknown>(ENDPOINTS.STUDENT.COURSE_DETAILS, params),
      post<unknown>(ENDPOINTS.STUDENT.COURSE_CONTENT, params),
    ]);

    const details = extractItem<CourseDetails>(detailsResponse, [
      'course',
      'details',
    ]);

    if (!details) {
      throw new Error('Course details not found');
    }

    return {
      ...details,
      contents: extractArray<CourseDetails['contents'][number]>(contentResponse, [
        'contents',
        'modules',
        'chapters',
      ]),
    };
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error));
  }
});

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
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCourseDetails.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentCourse = action.payload;
      })
      .addCase(fetchCourseDetails.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to load course details';
      });
  },
});

export const { clearCourseError, clearCurrentCourse } = courseSlice.actions;
export default courseSlice.reducer;
