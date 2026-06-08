/**
 * Application configuration constants derived from environment variables.
 * All EXPO_PUBLIC_ vars are inlined at build time by Expo.
 *
 * API_BASE_URL and API_BASE_PATH are dynamic – updated at runtime by the
 * tenant management layer so the Axios client automatically targets the
 * currently active tenant's backend.
 */
export const APP_CONFIG = {
  /** Default/fallback API base URL – used during development or before tenant selection */
  DEFAULT_API_BASE_URL:
    process.env.EXPO_PUBLIC_API_BASE_URL || 'https://5180-103-161-55-2.ngrok-free.app',
  /** Default API version – all tenants currently use v0.2 */
  DEFAULT_API_VERSION: process.env.EXPO_PUBLIC_API_VERSION || 'v0.2',

  /** Runtime-mutable API target – set by TenantSlice */
  _apiBaseUrl: '' as string,
  _apiVersion: '' as string,

  get API_BASE_URL(): string {
    return this._apiBaseUrl || this.DEFAULT_API_BASE_URL;
  },
  set API_BASE_URL(url: string) {
    this._apiBaseUrl = url;
  },
  get API_VERSION(): string {
    return this._apiVersion || this.DEFAULT_API_VERSION;
  },
  set API_VERSION(version: string) {
    this._apiVersion = version;
  },
  /** Full base path used by the Axios client */
  get API_BASE_PATH(): string {
    return `${this.API_BASE_URL}/api/${this.API_VERSION}`;
  },
  /** SecureStore key for the short-lived access token (JWT) */
  TOKEN_KEY: 'auth_token',
  /** SecureStore key for the long-lived opaque refresh token */
  REFRESH_TOKEN_KEY: 'refresh_token',
  /** AsyncStorage key for access token expiry timestamp (ms since epoch) */
  ACCESS_TOKEN_EXPIRES_AT_KEY: 'access_token_expires_at',
  /** SecureStore key for the backend session id */
  SESSION_KEY: 'session_id',
  /** SecureStore key for the persisted tenant configuration */
  TENANT_KEY: 'tenant_config',
  /** AsyncStorage key for persisted user profile cache */
  USER_KEY: 'user_data',
  /** AsyncStorage key for theme preference */
  THEME_KEY: 'theme_preference',
};
