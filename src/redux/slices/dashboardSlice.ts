import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';

import { asNumber, asString, extractArray, extractItem, post } from '../../api';
import { ENDPOINTS } from '../../api/endpoints';
import type { RootState } from '../store';
import type {
  DashboardHomeSummaryRow,
  DashboardState,
  DashboardStats,
  MentorInfo,
  WeeklyActivity,
} from '../../types/dashboard.types';

const initialState: DashboardState = {
  stats: null,
  weeklyActivity: [],
  mentors: [],
  banners: [],
  isLoadingStats: false,
  isLoadingActivity: false,
  isLoadingMentors: false,
  statsError: null,
  activityError: null,
  mentorsError: null,
};

function extractErrorMessage(error: unknown, fallback: string): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return (
    axiosError?.response?.data?.message ??
    axiosError?.message ??
    fallback
  );
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function mapHomeSummary(row: DashboardHomeSummaryRow): DashboardStats {
  return {
    openCourseCount: toNumber(row.open_curriculum),
    avgAssessmentScore: toNumber(row.assesment),
    avgCompletionRate: toNumber(row.completion),
    pleCredits: toNumber(row.ple),
  };
}

function mapWeeklyActivity(rows: unknown[]): WeeklyActivity[] {
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return rows.map((row) => {
    const record = row as Record<string, unknown>;
    const dateValue = asString(record._id ?? record.date, '');
    const parsedDate = dateValue ? new Date(dateValue) : null;
    const day =
      parsedDate && !Number.isNaN(parsedDate.getTime())
        ? dayLabels[parsedDate.getDay()]
        : asString(record.day, '');

    return {
      day,
      total_duration: toNumber(record.total_duration ?? record.total_active_study_time),
      date: dateValue || undefined,
    };
  });
}

function mapMentor(row: unknown): MentorInfo | null {
  const record = row as Record<string, unknown>;
  const member_id = asNumber(
    record.member_id ?? record.trainer_id ?? record.id,
    Number.NaN,
  );
  const name = asString(record.name ?? record.trainer_name, '').trim();

  if (!Number.isFinite(member_id) || !name) return null;

  return {
    member_id,
    name,
    email: asString(record.email, ''),
    photo: asString(record.photo, '') || undefined,
    subject: asString(record.subject ?? record.department, '') || undefined,
  };
}

export const fetchDashboardStats = createAsyncThunk<
  DashboardStats,
  void,
  { rejectValue: string; state: RootState }
>('dashboard/fetchDashboardStats', async (_, { rejectWithValue, getState }) => {
  try {
    const response = await post<unknown>(ENDPOINTS.DASHBOARD.HOME_SUMMARY, {});
    const row = extractItem<DashboardHomeSummaryRow>(response);
    const stats = mapHomeSummary(row ?? {});

    const authUser = getState().auth.user;
    if (authUser && stats.pleCredits === 0) {
      const profile = getState().user.profile;
      if (profile?.credits != null) {
        stats.pleCredits = toNumber(profile.credits);
      }
    }

    return stats;
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error, 'Failed to load dashboard stats'));
  }
});

export const fetchWeeklyActivity = createAsyncThunk<
  WeeklyActivity[],
  void,
  { rejectValue: string; state: RootState }
>('dashboard/fetchWeeklyActivity', async (_, { rejectWithValue, getState }) => {
  const user = getState().auth.user;
  if (!user?.member_id) {
    return rejectWithValue('Not signed in');
  }

  try {
    const response = await post<unknown>(ENDPOINTS.DASHBOARD.WEEKLY_ACTIVITY, {
      memberId: String(user.member_id),
    });
    return mapWeeklyActivity(extractArray(response));
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error, 'Failed to load weekly activity'));
  }
});

export const fetchMentorList = createAsyncThunk<
  MentorInfo[],
  void,
  { rejectValue: string; state: RootState }
>('dashboard/fetchMentorList', async (_, { rejectWithValue, getState }) => {
  const user = getState().auth.user;
  if (!user?.member_id) {
    return rejectWithValue('Not signed in');
  }

  try {
    const response = await post<unknown>(ENDPOINTS.DASHBOARD.MENTOR_LIST, {
      memberId: user.member_id,
    });
    return extractArray(response)
      .map(mapMentor)
      .filter((mentor): mentor is MentorInfo => mentor != null);
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error, 'Failed to load mentors'));
  }
});

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearDashboardErrors(state) {
      state.statsError = null;
      state.activityError = null;
      state.mentorsError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardStats.pending, (state) => {
        state.isLoadingStats = true;
        state.statsError = null;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.isLoadingStats = false;
        state.stats = action.payload;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.isLoadingStats = false;
        state.statsError = action.payload ?? 'Failed to load dashboard stats';
      });

    builder
      .addCase(fetchWeeklyActivity.pending, (state) => {
        state.isLoadingActivity = true;
        state.activityError = null;
      })
      .addCase(fetchWeeklyActivity.fulfilled, (state, action) => {
        state.isLoadingActivity = false;
        state.weeklyActivity = action.payload;
      })
      .addCase(fetchWeeklyActivity.rejected, (state, action) => {
        state.isLoadingActivity = false;
        state.activityError = action.payload ?? 'Failed to load weekly activity';
      });

    builder
      .addCase(fetchMentorList.pending, (state) => {
        state.isLoadingMentors = true;
        state.mentorsError = null;
      })
      .addCase(fetchMentorList.fulfilled, (state, action) => {
        state.isLoadingMentors = false;
        state.mentors = action.payload;
      })
      .addCase(fetchMentorList.rejected, (state, action) => {
        state.isLoadingMentors = false;
        state.mentorsError = action.payload ?? 'Failed to load mentors';
      });
  },
});

export const { clearDashboardErrors } = dashboardSlice.actions;
export default dashboardSlice.reducer;
