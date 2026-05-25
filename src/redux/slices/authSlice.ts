import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';

import {
  asNumber,
  asString,
  extractItem,
  post,
} from '../../api';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_CONFIG } from '../../constants/config';
import { asyncStorage, secureStorage } from '../../utils/storage';
import type {
  AuthState,
  LoginRequest,
  LoginResponse,
} from '../../types/auth.types';

// --------------------------------------------------------------------------
// Initial state
// --------------------------------------------------------------------------

const initialState: AuthState = {
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isRestoringSession: true,
};

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function extractErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return (
    axiosError?.response?.data?.message ??
    axiosError?.message ??
    'An unexpected error occurred'
  );
}

function normalizeLoginResponse(payload: unknown): LoginResponse | null {
  const data = extractItem<Record<string, unknown>>(payload, [
    'member',
    'user',
    'account',
  ]);

  if (!data) return null;

  const token = asString(
    data.token ?? data.access_token ?? data.accessToken ?? '',
  );

  if (!token) return null;

  return {
    token,
    member_id: asNumber(data.member_id ?? data.user_id ?? data.id),
    member_type: asString(
      data.member_type ?? data.role_name ?? data.role ?? 'student',
    ),
    first_name: asString(data.first_name ?? data.firstname ?? data.name),
    last_name: asString(data.last_name ?? data.lastname),
    email: asString(data.email ?? data.member_login),
    organization_id: asNumber(
      data.organization_id ?? data.org_id ?? data.institution_id,
    ),
    role_id: asNumber(data.role_id ?? data.member_role_id),
    profile_image: asString(
      data.profile_image ?? data.avatar_url ?? data.member_image,
    ),
    organization_name: asString(data.organization_name ?? data.org_name),
    campus_id: asNumber(data.campus_id),
  };
}

// --------------------------------------------------------------------------
// Async thunks
// --------------------------------------------------------------------------

/** Login with credentials → store token in SecureStore */
export const loginUser = createAsyncThunk<
  LoginResponse,
  LoginRequest,
  { rejectValue: string }
>('auth/loginUser', async (credentials, { rejectWithValue }) => {
  try {
    const response = await post<unknown>(ENDPOINTS.AUTH.LOGIN, credentials);
    const data = normalizeLoginResponse(response);

    if (!data) {
      return rejectWithValue('Invalid login response: missing token');
    }

    await secureStorage.setItem(APP_CONFIG.TOKEN_KEY, data.token);
    await asyncStorage.setItem(APP_CONFIG.USER_KEY, data);
    return data;
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error));
  }
});

/** Restore persisted session from SecureStore on app launch */
export const restoreSession = createAsyncThunk<
  { token: string; user: LoginResponse | null },
  void,
  { rejectValue: string }
>('auth/restoreSession', async (_, { rejectWithValue }) => {
  try {
    const token = await secureStorage.getItem(APP_CONFIG.TOKEN_KEY);
    if (!token) return rejectWithValue('No persisted session');
    const cachedUser = await asyncStorage.getItem<LoginResponse>(APP_CONFIG.USER_KEY);

    // Optionally fetch fresh session info
    try {
      const response = await post<unknown>(ENDPOINTS.AUTH.SESSION_INFO, {});
      const user = normalizeLoginResponse(response);

      if (user) {
        await asyncStorage.setItem(APP_CONFIG.USER_KEY, user);
      }

      return { token, user: user ?? cachedUser };
    } catch {
      // Session info failed – return just the token; the UI can handle re-auth
      return { token, user: cachedUser };
    }
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error));
  }
});

/** Logout → clear SecureStore and reset state */
export const logoutUser = createAsyncThunk<void, void, { rejectValue: string }>(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      await post(ENDPOINTS.AUTH.LOGOUT, {});
    } catch {
      // Best-effort – continue with local cleanup even if the server call fails
    } finally {
      await secureStorage.removeItem(APP_CONFIG.TOKEN_KEY);
      await asyncStorage.removeItem(APP_CONFIG.USER_KEY);
    }
  },
);

/** Manually refresh the auth token */
export const refreshToken = createAsyncThunk<
  string,
  void,
  { rejectValue: string }
>('auth/refreshToken', async (_, { rejectWithValue }) => {
  try {
    const response = await post<unknown>(ENDPOINTS.AUTH.REFRESH_TOKEN, {});
    const newToken = asString(
      extractItem<Record<string, unknown>>(response)?.token ??
        extractItem<Record<string, unknown>>(response)?.access_token,
    );
    if (!newToken) return rejectWithValue('Refresh failed: no token returned');

    await secureStorage.setItem(APP_CONFIG.TOKEN_KEY, newToken);
    return newToken;
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error));
  }
});

// --------------------------------------------------------------------------
// Slice
// --------------------------------------------------------------------------

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setSessionUser(state, action: PayloadAction<LoginResponse | null>) {
      state.user = action.payload;
      state.isAuthenticated = !!state.token;
    },
  },
  extraReducers: (builder) => {
    // ---- loginUser ----
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.token;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Login failed';
        state.isAuthenticated = false;
      });

    // ---- restoreSession ----
    builder
      .addCase(restoreSession.pending, (state) => {
        state.isRestoringSession = true;
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.isRestoringSession = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(restoreSession.rejected, (state) => {
        state.isRestoringSession = false;
        state.token = null;
        state.user = null;
        state.isAuthenticated = false;
      });

    // ---- logoutUser ----
    builder
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isLoading = false;
        state.token = null;
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state) => {
        // Still clear local state even if API call failed
        state.isLoading = false;
        state.token = null;
        state.user = null;
        state.isAuthenticated = false;
      });

    // ---- refreshToken ----
    builder
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.token = action.payload;
      })
      .addCase(refreshToken.rejected, (state) => {
        state.token = null;
        state.user = null;
        state.isAuthenticated = false;
      });
  },
});

export const { clearError, setLoading, setSessionUser } = authSlice.actions;
export default authSlice.reducer;
