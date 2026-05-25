import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';

import { extractArray, extractItem, post } from '../../api';
import { ENDPOINTS } from '../../api/endpoints';
import type {
  AttendanceSummary,
  Child,
  ChildProgress,
  ParentState,
} from '../../types/parent.types';

// --------------------------------------------------------------------------
// Initial state
// --------------------------------------------------------------------------

const initialState: ParentState = {
  children: [],
  selectedChild: null,
  childProgress: [],
  attendance: null,
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
    'Parent portal operation failed'
  );
}

// --------------------------------------------------------------------------
// Async thunks
// --------------------------------------------------------------------------

export const fetchChildren = createAsyncThunk<
  Child[],
  Record<string, unknown> | undefined,
  { rejectValue: string }
>('parent/fetchChildren', async (params = {}, { rejectWithValue }) => {
  try {
    const response = await post<unknown>(ENDPOINTS.PARENT.CHILDREN, params);
    return extractArray<Child>(response, ['children', 'students']);
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error));
  }
});

export const fetchChildProgress = createAsyncThunk<
  ChildProgress[],
  { member_id: number },
  { rejectValue: string }
>('parent/fetchChildProgress', async (params, { rejectWithValue }) => {
  try {
    const response = await post<unknown>(ENDPOINTS.PARENT.COURSE_PROGRESS, params);
    return extractArray<ChildProgress>(response, ['progress', 'courses']);
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error));
  }
});

export const fetchAttendance = createAsyncThunk<
  AttendanceSummary,
  { member_id: number },
  { rejectValue: string }
>('parent/fetchAttendance', async (params, { rejectWithValue }) => {
  try {
    const response = await post<unknown>(ENDPOINTS.ATTENDANCE.TRACKER, params);
    const attendance = extractItem<AttendanceSummary>(response, [
      'attendance',
      'summary',
    ]);

    if (!attendance) {
      throw new Error('Attendance summary not found');
    }

    return attendance;
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error));
  }
});

// --------------------------------------------------------------------------
// Slice
// --------------------------------------------------------------------------

const parentSlice = createSlice({
  name: 'parent',
  initialState,
  reducers: {
    clearParentError(state) {
      state.error = null;
    },
    /** Set the currently viewed child */
    selectChild(state, action: PayloadAction<Child>) {
      state.selectedChild = action.payload;
      // Clear stale child-specific data on selection change
      state.childProgress = [];
      state.attendance = null;
    },
    clearSelectedChild(state) {
      state.selectedChild = null;
      state.childProgress = [];
      state.attendance = null;
    },
  },
  extraReducers: (builder) => {
    // fetchChildren
    builder
      .addCase(fetchChildren.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchChildren.fulfilled, (state, action) => {
        state.isLoading = false;
        state.children = action.payload;
        // Auto-select first child if none is selected
        if (!state.selectedChild && action.payload.length > 0) {
          state.selectedChild = action.payload[0];
        }
      })
      .addCase(fetchChildren.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to load children';
      });

    // fetchChildProgress
    builder
      .addCase(fetchChildProgress.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchChildProgress.fulfilled, (state, action) => {
        state.isLoading = false;
        state.childProgress = action.payload;
      })
      .addCase(fetchChildProgress.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to load child progress';
      });

    // fetchAttendance
    builder
      .addCase(fetchAttendance.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAttendance.fulfilled, (state, action) => {
        state.isLoading = false;
        state.attendance = action.payload;
      })
      .addCase(fetchAttendance.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to load attendance';
      });
  },
});

export const { clearParentError, selectChild, clearSelectedChild } =
  parentSlice.actions;
export default parentSlice.reducer;
