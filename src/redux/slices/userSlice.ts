import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';

import { asNumber, extractItem, post } from '../../api';
import { ENDPOINTS } from '../../api/endpoints';
import type { UserProfile, UserState } from '../../types/user.types';

// --------------------------------------------------------------------------
// Initial state
// --------------------------------------------------------------------------

const initialState: UserState = {
  profile: null,
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
    'Failed to load user profile'
  );
}

// --------------------------------------------------------------------------
// Async thunks
// --------------------------------------------------------------------------

export const fetchUserProfile = createAsyncThunk<
  UserProfile,
  void,
  { rejectValue: string }
>('user/fetchUserProfile', async (_, { rejectWithValue }) => {
  try {
    const response = await post<unknown>(ENDPOINTS.USER.SUMMARY, {});
    const raw = extractItem<Record<string, unknown>>(response, ['profile', 'member', 'user']);

    if (!raw) {
      throw new Error('User profile not found');
    }

    return {
      ...raw,
      member_id: asNumber(raw.member_id ?? raw.user_id ?? raw.id),
      organization_id: asNumber(raw.organization_id ?? raw.org_id, 0),
      credits: raw.credits != null ? asNumber(raw.credits) : undefined,
    } as UserProfile;
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error));
  }
});

// --------------------------------------------------------------------------
// Slice
// --------------------------------------------------------------------------

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearUserError(state) {
      state.error = null;
    },
    clearUserProfile(state) {
      state.profile = null;
      state.error = null;
    },
    setUserProfile(state, action: PayloadAction<UserProfile>) {
      state.profile = action.payload;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.profile = action.payload;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to load user profile';
      });
  },
});

export const { clearUserError, clearUserProfile, setUserProfile } =
  userSlice.actions;
export default userSlice.reducer;
