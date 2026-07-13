import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';

import { asBoolean, asNumber, asString, extractItem, post } from '../../api';
import { ENDPOINTS } from '../../api/endpoints';
import { normalizeAvatarUri } from '../../services/profile';
import type { UserProfile, UserState } from '../../types/user.types';

const initialState: UserState = {
  profile: null,
  isLoading: false,
  error: null,
};

function extractErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return (
    axiosError?.response?.data?.message ??
    axiosError?.message ??
    'Failed to load user profile'
  );
}

function normalizeUserProfile(raw: Record<string, unknown>): UserProfile {
  const languageId = asNumber(
    raw.active_language_id ?? raw.activeLanguageId ?? raw.language_id,
    0,
  );
  const goiId = asNumber(raw.goi_id ?? raw.goiId, 0);

  return {
    member_id: asNumber(raw.member_id ?? raw.user_id ?? raw.id),
    first_name: asString(raw.first_name ?? raw.firstname ?? raw.name),
    last_name: asString(raw.last_name ?? raw.lastname),
    email: asString(raw.email ?? raw.member_login),
    phone: asString(raw.phone ?? raw.mobile) || undefined,
    avatar_url: normalizeAvatarUri(
      asString(raw.avatar_url ?? raw.profile_image ?? raw.photo ?? raw.member_image) ||
        undefined,
    ),
    member_type: asString(raw.member_type ?? raw.role_name ?? raw.role ?? 'Student'),
    organization_id: asNumber(raw.organization_id ?? raw.org_id, 0),
    organization_name: asString(raw.organization_name ?? raw.org_name) || undefined,
    campus_id: asNumber(raw.campus_id) || undefined,
    department: asString(raw.department) || undefined,
    class_name: asString(raw.class_name ?? raw.className) || undefined,
    standard: asString(raw.standard) || undefined,
    credits: raw.credits != null ? asNumber(raw.credits) : undefined,
    level: asString(raw.level) || undefined,
    registration_no:
      asString(raw.registration_no ?? raw.registrationNo ?? raw.reg_no) || undefined,
    enable_skills: asBoolean(raw.enable_skills ?? raw.enableSkills, false),
    job_profile: asString(raw.job_profile ?? raw.jobProfile) || undefined,
    password_expiry: asBoolean(raw.password_expiry ?? raw.passwordExpiry, false),
    active_language_id: languageId > 0 ? languageId : undefined,
    goi_id: goiId > 0 ? goiId : undefined,
  };
}

export const fetchUserProfile = createAsyncThunk<
  UserProfile,
  void,
  { rejectValue: string }
>('user/fetchUserProfile', async (_, { rejectWithValue }) => {
  try {
    const response = await post<unknown>(ENDPOINTS.USER.SUMMARY, {});
    const raw = extractItem<Record<string, unknown>>(response, [
      'profile',
      'member',
      'user',
    ]);

    if (!raw) {
      throw new Error('User profile not found');
    }

    return normalizeUserProfile(raw);
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error));
  }
});

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
