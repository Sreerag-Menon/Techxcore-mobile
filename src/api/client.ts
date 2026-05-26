/**
 * Axios HTTP client configured for the AAI backend.
 *
 * Features:
 *  - Base URL from APP_CONFIG
 *  - Request interceptor: attaches x-access-token from SecureStore
 *  - Response interceptor: 401 → refresh token using session_id → retry once
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
}

/** Request config for API calls that may need custom auth behavior */
export interface ApiRequestConfig extends AxiosRequestConfig {
  skipAuth?: boolean;
}

// --------------------------------------------------------------------------
// Axios instance
// --------------------------------------------------------------------------

export const apiClient: AxiosInstance = axios.create({
  baseURL: APP_CONFIG.API_BASE_PATH,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// --------------------------------------------------------------------------
// Request interceptor – attach auth token
// --------------------------------------------------------------------------

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    const authConfig = config as RetryableRequestConfig;

    if (!authConfig.skipAuth) {
      try {
        const token = await SecureStore.getItemAsync(APP_CONFIG.TOKEN_KEY);
        if (token) {
          config.headers['x-access-token'] = token;
        }
      } catch {
        // SecureStore unavailable (e.g. simulator without keychain) – skip silently
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
// Helper: refresh the auth token
// --------------------------------------------------------------------------

let isRefreshing = false;
/** Queue of callbacks waiting for the new token */
let refreshSubscribers: Array<(token: string) => void> = [];

function onTokenRefreshed(newToken: string): void {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
}

export function getAccessTokenFromResponse(
  response: Pick<AxiosResponse, 'headers'>,
): string {
  const headerValue = response.headers?.['x-access-token'];
  const token =
    headerValue ??
    (response.headers && typeof response.headers.get === 'function'
      ? response.headers.get('x-access-token')
      : undefined);
  if (Array.isArray(token)) return token[0] ?? '';
  return typeof token === 'string' ? token : '';
}

export async function refreshStoredAuthToken(): Promise<string> {
  const [token, sessionId] = await Promise.all([
    SecureStore.getItemAsync(APP_CONFIG.TOKEN_KEY),
    SecureStore.getItemAsync(APP_CONFIG.SESSION_KEY),
  ]);

  if (!token || !sessionId) {
    throw new Error('No persisted session available for token refresh');
  }

  // Use a fresh axios instance to avoid interceptor loops
  const response = await axios.post<unknown>(
    `${APP_CONFIG.API_BASE_PATH}${ENDPOINTS.AUTH.REFRESH_TOKEN}`,
    { sessionId },
    {
      headers: {
        'Content-Type': 'application/json',
        'x-access-token': token,
      },
    },
  );

  const newToken = getAccessTokenFromResponse(response);
  if (!newToken) throw new Error('No token in refresh response');

  await SecureStore.setItemAsync(APP_CONFIG.TOKEN_KEY, newToken);
  return newToken;
}

// --------------------------------------------------------------------------
// Response interceptor – 401 handling + network retry
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

    if (__DEV__) {
      console.error(
        `[API] ✗ ${error.response?.status ?? 'NETWORK'} ${originalRequest?.url}`,
        error.message,
      );
    }

    // ------------------------------------------------------------------
    // 401 – attempt token refresh and retry the original request once
    // ------------------------------------------------------------------
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // Another request is already refreshing – wait for it
        return new Promise<AxiosResponse>((resolve, reject) => {
          refreshSubscribers.push((newToken: string) => {
            if (originalRequest.headers) {
              originalRequest.headers['x-access-token'] = newToken;
            }
            resolve(apiClient(originalRequest));
          });
          // If refresh ultimately fails the subscriber list will be cleared
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
        // Clear stale session data so the app can force re-login.
        await SecureStore.deleteItemAsync(APP_CONFIG.TOKEN_KEY).catch(() => {});
        await SecureStore.deleteItemAsync(APP_CONFIG.SESSION_KEY).catch(() => {});
        return Promise.reject(refreshError);
      }
    }

    // ------------------------------------------------------------------
    // Network error – retry once
    // ------------------------------------------------------------------
    if (
      !error.response &&
      originalRequest &&
      !originalRequest._retry &&
      (originalRequest._retryCount ?? 0) < 1
    ) {
      originalRequest._retry = true;
      originalRequest._retryCount = (originalRequest._retryCount ?? 0) + 1;

      if (__DEV__) console.log('[API] Network error – retrying request…');

      // Brief back-off before retry
      await new Promise((r) => setTimeout(r, 1_000));
      return apiClient(originalRequest);
    }

    return Promise.reject(error);
  },
);

/**
 * Convenience wrapper: every backend endpoint uses POST.
 * Usage: `post<MyResponseType>(ENDPOINTS.AUTH.LOGIN, { memberLogin, memberPwd })`
 */
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
