import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';

import {
  asNumber,
  asString,
  extractItem,
  getAccessTokenFromResponse,
  getStatusErrorMessage,
  getUmemberId,
  isAlreadyLoggedIn,
  isLoginSuccess,
  parseLoginStatusRow,
  post,
  postWithResponse,
  refreshStoredAuthToken,
} from '../../api';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_CONFIG } from '../../constants/config';
import { asyncStorage, secureStorage } from '../../utils/storage';
import type {
  AuthState,
  LoginRejectReason,
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

function extractSessionId(payload: unknown): string {
  const data = extractItem<Record<string, unknown>>(payload, [
    'member',
    'user',
    'account',
  ]);

  return asString(data?.session_id ?? data?.sessionId ?? '');
}

async function clearPersistedAuth(): Promise<void> {
  await Promise.allSettled([
    secureStorage.removeItem(APP_CONFIG.TOKEN_KEY),
    secureStorage.removeItem(APP_CONFIG.SESSION_KEY),
    asyncStorage.removeItem(APP_CONFIG.USER_KEY),
  ]);
}

function normalizeLoginResponse(
  payload: unknown,
  auth: { token: string; sessionId: string },
): LoginResponse | null {
  const data = extractItem<Record<string, unknown>>(payload, [
    'member',
    'user',
    'account',
  ]);

  if (!data) return null;

  const token = asString(auth.token);
  const session_id = asString(auth.sessionId);
  if (!token || !session_id) return null;

  return {
    token,
    session_id,
    member_id: asNumber(data.member_id ?? data.user_id ?? data.id),
    member_type: asString(
      data.member_type ?? data.role_name ?? data.role ?? 'student',
    ),
    first_name: asString(data.first_name ?? data.firstname ?? data.name),
    last_name: asString(data.last_name ?? data.lastname),
    email: asString(data.email ?? data.member_login ?? data.memberLogin),
    organization_id: asNumber(
      data.organization_id ?? data.org_id ?? data.institution_id,
    ),
    role_id: asNumber(data.role_id ?? data.member_role_id),
    profile_image: asString(
      data.profile_image ?? data.avatar_url ?? data.member_image,
    ),
    organization_name: asString(data.organization_name ?? data.org_name),
    campus_id: asNumber(data.campus_id),
    acad_year_id: (() => {
      const id = asNumber(data.acad_year_id ?? data.acadYearId, 0);
      return id > 0 ? id : undefined;
    })(),
  };
}

type LoginResponseContext = {
  token: string;
  sessionId: string;
  user: LoginResponse;
};

function completeLoginFromResponse(
  response: Awaited<ReturnType<typeof postWithResponse<unknown>>>,
): LoginResponseContext | LoginRejectReason {
  const row = parseLoginStatusRow(response.data);
  if (isAlreadyLoggedIn(row)) {
    const uMemberId = getUmemberId(row);
    return {
      code: 'ALREADY_LOGGED_IN',
      uMemberId,
      message:
        'You are already logged in on another device. Do you want to continue here?',
    };
  }

  const token = getAccessTokenFromResponse(response);
  if (!isLoginSuccess(row, token)) {
    return {
      code: 'LOGIN_FAILED',
      message: getStatusErrorMessage(row),
    };
  }

  const sessionId = extractSessionId(response.data);
  const user = normalizeLoginResponse(response.data, { token, sessionId });
  if (!user) {
    return {
      code: 'LOGIN_FAILED',
      message: 'Invalid login response: missing auth header or session',
    };
  }

  return { token, sessionId, user };
}

// --------------------------------------------------------------------------
// Async thunks
// --------------------------------------------------------------------------

/** Login with credentials → store token in SecureStore */
export const loginUser = createAsyncThunk<
  LoginResponse,
  LoginRequest,
  { rejectValue: LoginRejectReason }
>('auth/loginUser', async (credentials, { rejectWithValue }) => {
  try {
    const response = await postWithResponse<unknown>(
      ENDPOINTS.AUTH.LOGIN,
      credentials,
      { skipAuth: true },
    );
    const result = completeLoginFromResponse(response);
    if ('code' in result) {
      return rejectWithValue(result);
    }

    await secureStorage.setItem(APP_CONFIG.TOKEN_KEY, result.token);
    await secureStorage.setItem(APP_CONFIG.SESSION_KEY, result.sessionId);
    await asyncStorage.setItem(APP_CONFIG.USER_KEY, result.user);
    return result.user;
  } catch (error) {
    return rejectWithValue({
      code: 'LOGIN_FAILED',
      message: extractErrorMessage(error),
    });
  }
});

export const clearUserSession = createAsyncThunk<
  void,
  string,
  { rejectValue: LoginRejectReason }
>('auth/clearUserSession', async (uMemberId, { rejectWithValue }) => {
  try {
    const response = await postWithResponse<unknown>(
      ENDPOINTS.AUTH.CLEAR_USER_SESSION,
      { uMemberId },
      { skipAuth: true },
    );

    const row = parseLoginStatusRow(response.data);
    if (!row || row.statusvalue !== 1) {
      return rejectWithValue({
        code: 'LOGIN_FAILED',
        message: getStatusErrorMessage(row),
      });
    }

    return;
  } catch (error) {
    return rejectWithValue({
      code: 'LOGIN_FAILED',
      message: extractErrorMessage(error),
    });
  }
});

/** Restore persisted session from SecureStore on app launch */
export const restoreSession = createAsyncThunk<
  { token: string; user: LoginResponse | null },
  void,
  { rejectValue: string }
>('auth/restoreSession', async (_, { rejectWithValue }) => {
  try {
    const [token, sessionId, cachedUser] = await Promise.all([
      secureStorage.getItem(APP_CONFIG.TOKEN_KEY),
      secureStorage.getItem(APP_CONFIG.SESSION_KEY),
      asyncStorage.getItem<LoginResponse>(APP_CONFIG.USER_KEY),
    ]);

    if (!token || !sessionId) {
      await clearPersistedAuth();
      return rejectWithValue('No persisted session');
    }

    const hydratedCachedUser = cachedUser
      ? {
          ...cachedUser,
          token,
          session_id: cachedUser.session_id || sessionId,
        }
      : null;

    // Optionally fetch fresh session info
    try {
      const response = await post<unknown>(ENDPOINTS.AUTH.SESSION_INFO, { sessionId });
      const user = normalizeLoginResponse(response, { token, sessionId });

      if (user) {
        await asyncStorage.setItem(APP_CONFIG.USER_KEY, user);
        return { token, user };
      }
    } catch {
      // Network/transient restore failure – fall back to the cached user if available.
    }

    if (hydratedCachedUser) {
      return { token, user: hydratedCachedUser };
    }

    await clearPersistedAuth();
    return rejectWithValue('Unable to restore session');
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
      await clearPersistedAuth();
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
    const newToken = await refreshStoredAuthToken();
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
        state.error =
          (action.payload && 'message' in action.payload
            ? action.payload.message
            : null) ?? 'Login failed';
        state.token = null;
        state.user = null;
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
        state.isAuthenticated = !!action.payload.token && !!action.payload.user;
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
        if (state.user) {
          state.user.token = action.payload;
        }
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
