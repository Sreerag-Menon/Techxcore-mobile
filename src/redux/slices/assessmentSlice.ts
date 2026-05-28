import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';

import { extractArray, extractItem, post } from '../../api';
import { ENDPOINTS } from '../../api/endpoints';
import type {
  Assessment,
  AssessmentResult,
  AssessmentStatus,
  AssessmentState,
  HomeAssessment,
  TestQuestion,
} from '../../types/assessment.types';

// --------------------------------------------------------------------------
// Initial state
// --------------------------------------------------------------------------

const initialState: AssessmentState = {
  assessments: [],
  homeAssessments: [],
  currentQuestions: [],
  currentResult: null,
  isLoading: false,
  isSubmitting: false,
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
    'Assessment operation failed'
  );
}

type HomeAssessmentApiRow = {
  assessment_id?: number | string | null;
  test_id?: number | string | null;
  id?: number | string | null;
  test_name?: string | null;
  name?: string | null;
  test_description?: string | null;
  status?: string | null;
  total_questions?: number | string | null;
  total_marks?: number | string | null;
  duration_minutes?: number | string | null;
  due_date?: string | null;
  course_name?: string | null;
  currname?: string | null;
  pending_test?: number | string | null;
};

const VALID_ASSESSMENT_STATUSES = new Set<AssessmentStatus>([
  'pending',
  'in_progress',
  'completed',
  'expired',
]);

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeAssessmentStatus(value: unknown): AssessmentStatus | undefined {
  const normalized = toOptionalString(value)?.toLowerCase().replace(/\s+/g, '_');
  if (!normalized || !VALID_ASSESSMENT_STATUSES.has(normalized as AssessmentStatus)) {
    return undefined;
  }

  return normalized as AssessmentStatus;
}

function normalizeHomeAssessment(row: HomeAssessmentApiRow): HomeAssessment {
  return {
    assessment_id:
      toOptionalNumber(row.assessment_id) ?? toOptionalNumber(row.id),
    test_id:
      toOptionalNumber(row.test_id) ??
      toOptionalNumber(row.id) ??
      toOptionalNumber(row.assessment_id),
    test_name:
      toOptionalString(row.test_name) ??
      toOptionalString(row.name) ??
      'Upcoming assessment',
    test_description: toOptionalString(row.test_description),
    status: normalizeAssessmentStatus(row.status),
    total_questions: toOptionalNumber(row.total_questions),
    total_marks: toOptionalNumber(row.total_marks),
    duration_minutes: toOptionalNumber(row.duration_minutes),
    due_date: toOptionalString(row.due_date),
    course_name:
      toOptionalString(row.course_name) ?? toOptionalString(row.currname),
    pending_test: toOptionalNumber(row.pending_test),
  };
}

// --------------------------------------------------------------------------
// Async thunks
// --------------------------------------------------------------------------

export const fetchAssessments = createAsyncThunk<
  Assessment[],
  Record<string, unknown> | undefined,
  { rejectValue: string }
>('assessment/fetchAssessments', async (params = {}, { rejectWithValue }) => {
  try {
    const response = await post<unknown>(ENDPOINTS.ASSESSMENT.LIST, params);
    return extractArray<Assessment>(response, ['assessments', 'tests']);
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error));
  }
});

export const fetchHomeAssessments = createAsyncThunk<
  HomeAssessment[],
  Record<string, unknown> | undefined,
  { rejectValue: string }
>('assessment/fetchHomeAssessments', async (params = {}, { rejectWithValue }) => {
  try {
    const response = await post<unknown>(ENDPOINTS.ASSESSMENT.HOME_ASSESSMENTS, params);
    return extractArray<HomeAssessmentApiRow>(response, ['assessments', 'tests']).map(
      normalizeHomeAssessment,
    );
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error));
  }
});

export const fetchQuestions = createAsyncThunk<
  TestQuestion[],
  { test_id: number },
  { rejectValue: string }
>('assessment/fetchQuestions', async (params, { rejectWithValue }) => {
  try {
    const response = await post<unknown>(ENDPOINTS.ASSESSMENT.QUESTIONS, params);
    return extractArray<TestQuestion>(response, ['questions']);
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error));
  }
});

export const submitAssessment = createAsyncThunk<
  AssessmentResult,
  { test_id: number; answers: Array<{ question_id: number; option_id: number }> },
  { rejectValue: string }
>('assessment/submitAssessment', async (params, { rejectWithValue }) => {
  try {
    const response = await post<unknown>(ENDPOINTS.ASSESSMENT.SUBMIT, params);
    const result = extractItem<AssessmentResult>(response, ['result', 'summary']);

    if (!result) {
      throw new Error('Invalid assessment response');
    }

    return result;
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error));
  }
});

// --------------------------------------------------------------------------
// Slice
// --------------------------------------------------------------------------

const assessmentSlice = createSlice({
  name: 'assessment',
  initialState,
  reducers: {
    clearAssessmentError(state) {
      state.error = null;
    },
    clearCurrentResult(state) {
      state.currentResult = null;
      state.currentQuestions = [];
    },
  },
  extraReducers: (builder) => {
    // fetchAssessments
    builder
      .addCase(fetchAssessments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAssessments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.assessments = action.payload;
      })
      .addCase(fetchAssessments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to load assessments';
      });

    // fetchHomeAssessments
    builder
      .addCase(fetchHomeAssessments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchHomeAssessments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.homeAssessments = action.payload;
      })
      .addCase(fetchHomeAssessments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to load home assessments';
      });

    // fetchQuestions
    builder
      .addCase(fetchQuestions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchQuestions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentQuestions = action.payload;
      })
      .addCase(fetchQuestions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to load questions';
      });

    // submitAssessment
    builder
      .addCase(submitAssessment.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(submitAssessment.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.currentResult = action.payload;
      })
      .addCase(submitAssessment.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload ?? 'Failed to submit assessment';
      });
  },
});

export const { clearAssessmentError, clearCurrentResult } = assessmentSlice.actions;
export default assessmentSlice.reducer;
