import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';

import { extractArray, extractItem, post } from '../../api';
import { ENDPOINTS } from '../../api/endpoints';
import type {
  Assessment,
  AssessmentResult,
  AssessmentState,
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
  Assessment[],
  Record<string, unknown> | undefined,
  { rejectValue: string }
>('assessment/fetchHomeAssessments', async (params = {}, { rejectWithValue }) => {
  try {
    const response = await post<unknown>(ENDPOINTS.ASSESSMENT.HOME_ASSESSMENTS, params);
    return extractArray<Assessment>(response, ['assessments', 'tests']);
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
