/**
 * Application configuration constants derived from environment variables.
 * All EXPO_PUBLIC_ vars are inlined at build time by Expo.
 */
export const APP_CONFIG = {
  API_BASE_URL:
    process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.220.40:8081',
  API_VERSION: process.env.EXPO_PUBLIC_API_VERSION || 'v0.2',
  /** Full base path used by the Axios client */
  get API_BASE_PATH(): string {
    return `${this.API_BASE_URL}/api/${this.API_VERSION}`;
  },
  /** SecureStore key for the auth token */
  TOKEN_KEY: 'auth_token',
  /** SecureStore key for the backend session id */
  SESSION_KEY: 'session_id',
  /** AsyncStorage key for persisted user profile cache */
  USER_KEY: 'user_data',
  /** AsyncStorage key for theme preference */
  THEME_KEY: 'theme_preference',
} as const;
