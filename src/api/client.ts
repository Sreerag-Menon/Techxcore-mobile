/**
 * Axios HTTP client configured for the LMS backend.
 *
 * Features:
 *  - Base URL from APP_CONFIG
 *  - Request interceptor: attaches x-access-token from SecureStore
 *  - Response interceptor: 401/403 (jwt expired) → refresh via refresh token → retry once
 *  - Network error retry (1 attempt)
 *  - Dev-mode request/response logging
 */
import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { APP_CONFIG } from '../constants/config';
import { ENDPOINTS } from './endpoints';

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

/** Extended config to track whether a request has already been retried */
interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _retryCount?: number;
  skipAuth?: boolean;
  /** Do not attempt token refresh / retry on 401–403 for this request */
  skipRefresh?: boolean;
}

/** Request config for API calls that may need custom auth behavior */
export interface ApiRequestConfig extends AxiosRequestConfig {
  skipAuth?: boolean;
  skipRefresh?: boolean;
}

type MobileRefreshResponse = {
  access_token?: string;
  refresh_token?: string;
  access_token_expires_in?: number;
  statusvalue?: number;
  code?: string;
  message?: string;
};

const AUTH_ENDPOINTS_NO_REFRESH = [
  ENDPOINTS.AUTH.LOGIN,
  ENDPOINTS.AUTH.MOBILE_LOGIN,
  ENDPOINTS.AUTH.LOGOUT,
  ENDPOINTS.AUTH.MOBILE_LOGOUT,
  ENDPOINTS.AUTH.REFRESH_TOKEN,
  ENDPOINTS.AUTH.MOBILE_REFRESH,
  ENDPOINTS.AUTH.CLEAR_USER_SESSION,
] as const;

let isRefreshing = false;
let isLoggingOut = false;
let refreshSubscribers: Array<(token: string) => void> = [];

// --------------------------------------------------------------------------
// Axios instance
// --------------------------------------------------------------------------

export const apiClient: AxiosInstance = axios.create({
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

function isAuthEndpointNoRefresh(url: string | undefined): boolean {
  if (!url) return false;
  return AUTH_ENDPOINTS_NO_REFRESH.some((path) => url.includes(path));
}

function shouldSkipTokenRefresh(config: RetryableRequestConfig | undefined): boolean {
  if (!config) return true;
  if (config.skipRefresh || config.skipAuth) return true;
  if (isLoggingOut) return true;
  return isAuthEndpointNoRefresh(config.url);
}

function onTokenRefreshed(newToken: string): void {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
}

export function getAccessTokenFromResponse(
  response: Pick<AxiosResponse, 'headers' | 'data'>,
): string {
  const data = response.data as MobileRefreshResponse | MobileRefreshResponse[] | undefined;
  const row = Array.isArray(data) ? data[0] : data;
  if (row && typeof row === 'object' && typeof row.access_token === 'string') {
    return row.access_token;
  }

  const headerValue = response.headers?.['x-access-token'];
  const token =
    headerValue ??
    (response.headers && typeof response.headers.get === 'function'
      ? response.headers.get('x-access-token')
      : undefined);
  if (Array.isArray(token)) return token[0] ?? '';
  return typeof token === 'string' ? token : '';
}

async function persistMobileTokenPair(
  accessToken: string,
  refreshToken: string,
  accessTokenExpiresIn?: number,
): Promise<void> {
  await SecureStore.setItemAsync(APP_CONFIG.TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(APP_CONFIG.REFRESH_TOKEN_KEY, refreshToken);
  if (accessTokenExpiresIn && accessTokenExpiresIn > 0) {
    await AsyncStorage.setItem(
      APP_CONFIG.ACCESS_TOKEN_EXPIRES_AT_KEY,
      String(Date.now() + accessTokenExpiresIn * 1000),
    );
  }
}

export async function refreshStoredAuthToken(): Promise<string> {
  const refreshToken = await SecureStore.getItemAsync(APP_CONFIG.REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    throw new Error('No refresh token');
  }

  const response = await axios.post<MobileRefreshResponse>(
    `${APP_CONFIG.API_BASE_PATH}${ENDPOINTS.AUTH.MOBILE_REFRESH}`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } },
  );

  const { access_token, refresh_token, access_token_expires_in } = response.data;
  if (!access_token || !refresh_token) {
    throw new Error('Invalid refresh response');
  }

  await persistMobileTokenPair(access_token, refresh_token, access_token_expires_in);
  return access_token;
}

function isJwtExpiredMessage(data: unknown): boolean {
  const msg = (data as { message?: string })?.message ?? '';
  return /jwt expired|invalid token|token expired/i.test(msg);
}

async function forceAuthLogout(): Promise<void> {
  if (isLoggingOut) return;
  isLoggingOut = true;
  isRefreshing = false;
  refreshSubscribers = [];

  try {
    const { store } = await import('../redux/store');
    const { clearLocalAuthSession } = await import('../redux/slices/authSlice');
    await store.dispatch(clearLocalAuthSession());
  } catch {
    await Promise.allSettled([
      SecureStore.deleteItemAsync(APP_CONFIG.TOKEN_KEY),
      SecureStore.deleteItemAsync(APP_CONFIG.REFRESH_TOKEN_KEY),
      SecureStore.deleteItemAsync(APP_CONFIG.SESSION_KEY),
      AsyncStorage.removeItem(APP_CONFIG.ACCESS_TOKEN_EXPIRES_AT_KEY),
      AsyncStorage.removeItem(APP_CONFIG.USER_KEY),
    ]);
  } finally {
    isLoggingOut = false;
  }
}

// --------------------------------------------------------------------------
// Request interceptor – attach auth token
// --------------------------------------------------------------------------

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    config.baseURL = APP_CONFIG.API_BASE_PATH;

    const authConfig = config as RetryableRequestConfig;

    if (!authConfig.skipAuth) {
      try {
        const token = await SecureStore.getItemAsync(APP_CONFIG.TOKEN_KEY);
        if (token) {
          config.headers['x-access-token'] = token;
        }
      } catch {
        // SecureStore unavailable – skip silently
      }
    }

    if (__DEV__) {
      console.log(
        `[API] ➤ ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
        config.data ?? '',
      );
    }

    return config;
  },
  (error: AxiosError) => {
    if (__DEV__) console.error('[API] Request error:', error.message);
    return Promise.reject(error);
  },
);

// --------------------------------------------------------------------------
// Response interceptor – auth refresh + network retry
// --------------------------------------------------------------------------

apiClient.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    if (__DEV__) {
      console.log(
        `[API] ✓ ${response.status} ${response.config.url}`,
        response.data,
      );
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (__DEV__ && !shouldSkipTokenRefresh(originalRequest)) {
      console.error(
        `[API] ✗ ${error.response?.status ?? 'NETWORK'} ${originalRequest?.url}`,
        error.message,
      );
    }

    const isAuthError =
      error.response?.status === 401 ||
      (error.response?.status === 403 && isJwtExpiredMessage(error.response?.data));

    if (
      isAuthError &&
      originalRequest &&
      !originalRequest._retry &&
      !shouldSkipTokenRefresh(originalRequest)
    ) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise<AxiosResponse>((resolve, reject) => {
          refreshSubscribers.push((newToken: string) => {
            if (originalRequest.headers) {
              originalRequest.headers['x-access-token'] = newToken;
            }
            resolve(apiClient(originalRequest));
          });
          setTimeout(() => reject(new Error('Token refresh timeout')), 15_000);
        });
      }

      isRefreshing = true;
      try {
        const newToken = await refreshStoredAuthToken();
        isRefreshing = false;
        onTokenRefreshed(newToken);

        if (originalRequest.headers) {
          originalRequest.headers['x-access-token'] = newToken;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        refreshSubscribers = [];
        await forceAuthLogout();
        return Promise.reject(refreshError);
      }
    }

    if (
      !error.response &&
      originalRequest &&
      !originalRequest._retry &&
      (originalRequest._retryCount ?? 0) < 1
    ) {
      originalRequest._retry = true;
      originalRequest._retryCount = (originalRequest._retryCount ?? 0) + 1;

      if (__DEV__) console.log('[API] Network error – retrying request…');

      await new Promise((r) => setTimeout(r, 1_000));
      return apiClient(originalRequest);
    }

    return Promise.reject(error);
  },
);

export async function post<T>(
  endpoint: string,
  data?: unknown,
  config?: ApiRequestConfig,
): Promise<T> {
  const response = await apiClient.post<T>(endpoint, data ?? {}, config);
  return response.data;
}

export async function postWithResponse<T>(
  endpoint: string,
  data?: unknown,
  config?: ApiRequestConfig,
): Promise<AxiosResponse<T>> {
  return apiClient.post<T>(endpoint, data ?? {}, config);
}
