import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';

import {
  asBoolean,
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
    secureStorage.removeItem(APP_CONFIG.REFRESH_TOKEN_KEY),
    secureStorage.removeItem(APP_CONFIG.SESSION_KEY),
    asyncStorage.removeItem(APP_CONFIG.ACCESS_TOKEN_EXPIRES_AT_KEY),
    asyncStorage.removeItem(APP_CONFIG.USER_KEY),
  ]);
}

function extractMobileTokens(payload: unknown): {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
} | null {
  const data = extractItem<Record<string, unknown>>(payload);
  if (!data) return null;

  const accessToken = asString(data.access_token);
  const refreshToken = asString(data.refresh_token);
  const expiresIn = asNumber(data.access_token_expires_in, 0);

  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken, expiresIn };
}

async function persistMobileAuthTokens(
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
): Promise<void> {
  await secureStorage.setItem(APP_CONFIG.TOKEN_KEY, accessToken);
  await secureStorage.setItem(APP_CONFIG.REFRESH_TOKEN_KEY, refreshToken);
  if (expiresIn > 0) {
    await asyncStorage.setItem(
      APP_CONFIG.ACCESS_TOKEN_EXPIRES_AT_KEY,
      String(Date.now() + expiresIn * 1000),
    );
  }
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

  const languageId = asNumber(
    data.active_language_id ?? data.activeLanguageId ?? data.language_id,
    0,
  );
  const goiId = asNumber(data.goi_id ?? data.goiId, 0);

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
      data.profile_image ??
        data.avatar_url ??
        data.member_image ??
        data.photo,
    ),
    organization_name: asString(data.organization_name ?? data.org_name),
    campus_id: asNumber(data.campus_id),
    acad_year_id: (() => {
      const id = asNumber(data.acad_year_id ?? data.acadYearId, 0);
      return id > 0 ? id : undefined;
    })(),
    registration_no: asString(
      data.registration_no ?? data.registrationNo ?? data.reg_no,
    ) || undefined,
    class_name: asString(data.class_name ?? data.className) || undefined,
    enable_skills: asBoolean(
      data.enable_skills ?? data.enableSkills,
      false,
    ),
    job_profile: asString(data.job_profile ?? data.jobProfile) || undefined,
    password_expiry: asBoolean(
      data.password_expiry ?? data.passwordExpiry,
      false,
    ),
    active_language_id: languageId > 0 ? languageId : undefined,
    goi_id: goiId > 0 ? goiId : undefined,
  };
}

type LoginResponseContext = {
  token: string;
  sessionId: string;
  user: LoginResponse;
  mobileTokens: { accessToken: string; refreshToken: string; expiresIn: number } | null;
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

  const mobileTokens = extractMobileTokens(response.data);
  const token =
    mobileTokens?.accessToken || getAccessTokenFromResponse(response);
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

  return { token, sessionId, user, mobileTokens };
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
      ENDPOINTS.AUTH.MOBILE_LOGIN,
      credentials,
      { skipAuth: true },
    );
    console.log(JSON.stringify(response.data, null, 2));
  console.log('header token', response.headers['x-access-token']);
    const result = completeLoginFromResponse(response);
    
    if ('code' in result) {
      return rejectWithValue(result);
    }

    if (result.mobileTokens) {
      await persistMobileAuthTokens(
        result.mobileTokens.accessToken,
        result.mobileTokens.refreshToken,
        result.mobileTokens.expiresIn,
      );
    } else {
      await secureStorage.setItem(APP_CONFIG.TOKEN_KEY, result.token);
    }
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
    const [token, refreshToken, sessionId, expiresAtRaw, cachedUser] =
      await Promise.all([
        secureStorage.getItem(APP_CONFIG.TOKEN_KEY),
        secureStorage.getItem(APP_CONFIG.REFRESH_TOKEN_KEY),
        secureStorage.getItem(APP_CONFIG.SESSION_KEY),
        asyncStorage.getItem(APP_CONFIG.ACCESS_TOKEN_EXPIRES_AT_KEY),
        asyncStorage.getItem<LoginResponse>(APP_CONFIG.USER_KEY),
      ]);

    if (!sessionId) {
      await clearPersistedAuth();
      return rejectWithValue('No persisted session');
    }

    const expiresAt = Number(expiresAtRaw);
    const accessExpired =
      !token || (Number.isFinite(expiresAt) && expiresAt > 0 && expiresAt <= Date.now());

    if (accessExpired) {
      if (!refreshToken) {
        await clearPersistedAuth();
        return rejectWithValue('No refresh token');
      }
      try {
        await refreshStoredAuthToken();
      } catch {
        await clearPersistedAuth();
        return rejectWithValue('Unable to refresh session');
      }
    } else if (!token) {
      await clearPersistedAuth();
      return rejectWithValue('No persisted session');
    }

    const activeToken =
      (await secureStorage.getItem(APP_CONFIG.TOKEN_KEY)) || token || '';

    const hydratedCachedUser = cachedUser
      ? {
          ...cachedUser,
          token: activeToken,
          session_id: cachedUser.session_id || sessionId,
        }
      : null;

    try {
      const response = await post<unknown>(ENDPOINTS.AUTH.SESSION_INFO, { sessionId });
      const user = normalizeLoginResponse(response, {
        token: activeToken,
        sessionId,
      });

      if (user) {
        await asyncStorage.setItem(APP_CONFIG.USER_KEY, user);
        return { token: activeToken, user };
      }
    } catch {
      // Network/transient restore failure – fall back to the cached user if available.
    }

    if (hydratedCachedUser) {
      return { token: activeToken, user: hydratedCachedUser };
    }

    await clearPersistedAuth();
    return rejectWithValue('Unable to restore session');
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error));
  }
});

/** Clear local session only (no API). Used when tokens are already invalid. */
export const clearLocalAuthSession = createAsyncThunk<void, void>(
  'auth/clearLocalAuthSession',
  async () => {
    await clearPersistedAuth();
  },
);

/** Logout → revoke refresh token on server when possible, then clear local state */
export const logoutUser = createAsyncThunk<void, void, { rejectValue: string }>(
  'auth/logoutUser',
  async () => {
    try {
      const refreshToken = await secureStorage.getItem(APP_CONFIG.REFRESH_TOKEN_KEY);
      if (refreshToken) {
        await post(
          ENDPOINTS.AUTH.MOBILE_LOGOUT,
          { refreshToken },
          { skipAuth: true, skipRefresh: true },
        );
      }
      // Do not call /member_logout from mobile — it requires a valid JWT and
      // causes a 403 → refresh → logout loop when the access token is expired.
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

    // ---- logoutUser / clearLocalAuthSession ----
    const resetAuthState = (state: AuthState) => {
      state.isLoading = false;
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      state.isRestoringSession = false;
    };

    builder
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logoutUser.fulfilled, resetAuthState)
      .addCase(logoutUser.rejected, resetAuthState)
      .addCase(clearLocalAuthSession.fulfilled, resetAuthState)
      .addCase(clearLocalAuthSession.rejected, resetAuthState);

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
