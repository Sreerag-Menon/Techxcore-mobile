import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';

import { APP_CONFIG } from '../../constants/config';
import { getTenantBaseUrlFromCode } from '../../constants/tenantRegistry';
import { secureStorage } from '../../utils/storage';
import type {
  SiteDetailsResponse,
  TenantConfig,
  TenantState,
} from '../../types/tenant.types';

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

/**
 * Sanitize a user-entered URL into a usable base URL.
 * - Trims whitespace
 * - Auto-prepends https:// if no protocol is specified
 * - Strips trailing slashes and path segments
 */
export function sanitizeTenantUrl(raw: string): string {
  let url = raw.trim();

  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  try {
    const parsed = new URL(url);
    return parsed.origin;
  } catch {
    return url.replace(/\/+$/, '');
  }
}

function buildTenantConfig(
  baseUrl: string,
  siteData: SiteDetailsResponse,
  apiVersion: string,
  tenantCode?: string,
): TenantConfig {
  return {
    baseUrl,
    apiVersion,
    apiBasePath: `${baseUrl}/api/${apiVersion}`,
    siteName: siteData.name || siteData.title || 'Unknown Institution',
    shortName: siteData.short_name || undefined,
    logoUrl: siteData.logo || undefined,
    faviconUrl: siteData.favicon || undefined,
    campusLogoUrl: siteData.campus_logo || undefined,
    lastValidated: new Date().toISOString(),
    tenantCode,
  };
}

type ValidateTenantOptions = {
  baseUrl: string;
  apiVersion?: string;
  tenantCode?: string;
};

async function validateTenantByBaseUrl(
  options: ValidateTenantOptions,
): Promise<TenantConfig> {
  const baseUrl = options.baseUrl.replace(/\/+$/, '');
  const apiVersion = options.apiVersion ?? APP_CONFIG.DEFAULT_API_VERSION;

  const response = await axios.post<SiteDetailsResponse[] | SiteDetailsResponse>(
    `${baseUrl}/api/getSiteDetails`,
    {},
    {
      timeout: 15_000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    },
  );

  const data = response.data;
  const siteData: SiteDetailsResponse | undefined = Array.isArray(data)
    ? data[0]
    : data;

  if (!siteData || typeof siteData !== 'object') {
    throw new Error('Received an unexpected response from this institution.');
  }

  const config = buildTenantConfig(
    baseUrl,
    siteData,
    apiVersion,
    options.tenantCode,
  );

  await secureStorage.setItem(APP_CONFIG.TENANT_KEY, JSON.stringify(config));

  APP_CONFIG.API_BASE_URL = config.baseUrl;
  APP_CONFIG.API_VERSION = config.apiVersion;

  return config;
}

function mapValidationError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return 'Connection timed out. Please check your connection and try again.';
    }
    if (!error.response) {
      return 'Could not connect to this institution. Please try again later.';
    }
    return `Server responded with status ${error.response.status}. Please try again later.`;
  }
  return error instanceof Error
    ? error.message
    : 'An unexpected error occurred while validating the institution.';
}

// --------------------------------------------------------------------------
// Initial state
// --------------------------------------------------------------------------

const initialState: TenantState = {
  currentTenant: null,
  isValidating: false,
  isRestoringTenant: true,
  error: null,
};

// --------------------------------------------------------------------------
// Async thunks
// --------------------------------------------------------------------------

/**
 * Connect using a bundled institution short code.
 * Resolves baseUrl from tenantRegistry, then validates via getSiteDetails.
 */
export const connectTenantByCode = createAsyncThunk<
  TenantConfig,
  string,
  { rejectValue: string }
>('tenant/connectTenantByCode', async (rawCode, { rejectWithValue }) => {
  const resolved = getTenantBaseUrlFromCode(rawCode);
  if (!resolved) {
    return rejectWithValue(
      'Invalid institution code. Please check the code and try again.',
    );
  }

  try {
    return await validateTenantByBaseUrl({
      baseUrl: resolved.baseUrl,
      apiVersion: resolved.apiVersion,
      tenantCode: resolved.tenantCode,
    });
  } catch (error) {
    return rejectWithValue(mapValidationError(error));
  }
});

/**
 * Validate a tenant by URL (dev/internal use).
 * On success, persists the tenant config and updates APP_CONFIG.
 */
export const validateTenant = createAsyncThunk<
  TenantConfig,
  string,
  { rejectValue: string }
>('tenant/validateTenant', async (rawUrl, { rejectWithValue }) => {
  try {
    const baseUrl = sanitizeTenantUrl(rawUrl);
    return await validateTenantByBaseUrl({
      baseUrl,
      apiVersion: APP_CONFIG.DEFAULT_API_VERSION,
    });
  } catch (error) {
    return rejectWithValue(mapValidationError(error));
  }
});

/**
 * Restore a persisted tenant config from SecureStore on app launch.
 * Must be dispatched before restoreSession so the API base URL is set.
 */
export const restoreTenant = createAsyncThunk<
  TenantConfig | null,
  void,
  { rejectValue: string }
>('tenant/restoreTenant', async (_, { rejectWithValue }) => {
  try {
    const raw = await secureStorage.getItem(APP_CONFIG.TENANT_KEY);
    if (!raw) {
      return null;
    }

    const config: TenantConfig = JSON.parse(raw);

    if (!config.baseUrl) {
      return rejectWithValue('Invalid persisted tenant config');
    }

    APP_CONFIG.API_BASE_URL = config.baseUrl;
    APP_CONFIG.API_VERSION = config.apiVersion;

    return config;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : 'Failed to restore tenant',
    );
  }
});

/**
 * Clear the tenant config from SecureStore and reset runtime config.
 * This also clears auth data — used when switching institutions.
 */
export const clearTenant = createAsyncThunk<void, void>(
  'tenant/clearTenant',
  async () => {
    await Promise.allSettled([
      secureStorage.removeItem(APP_CONFIG.TENANT_KEY),
      secureStorage.removeItem(APP_CONFIG.TOKEN_KEY),
      secureStorage.removeItem(APP_CONFIG.SESSION_KEY),
    ]);

    APP_CONFIG.API_BASE_URL = '';
    APP_CONFIG.API_VERSION = '';
  },
);

// --------------------------------------------------------------------------
// Slice
// --------------------------------------------------------------------------

const tenantValidationHandlers = {
  pending: (state: TenantState) => {
    state.isValidating = true;
    state.error = null;
  },
  fulfilled: (state: TenantState, action: { payload: TenantConfig }) => {
    state.isValidating = false;
    state.currentTenant = action.payload;
    state.error = null;
  },
  rejected: (
    state: TenantState,
    action: { payload?: string },
    fallbackMessage: string,
  ) => {
    state.isValidating = false;
    state.error = action.payload ?? fallbackMessage;
  },
};

const tenantSlice = createSlice({
  name: 'tenant',
  initialState,
  reducers: {
    clearTenantError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(connectTenantByCode.pending, tenantValidationHandlers.pending)
      .addCase(connectTenantByCode.fulfilled, tenantValidationHandlers.fulfilled)
      .addCase(connectTenantByCode.rejected, (state, action) => {
        tenantValidationHandlers.rejected(
          state,
          action,
          'Failed to connect to institution',
        );
      });

    builder
      .addCase(validateTenant.pending, tenantValidationHandlers.pending)
      .addCase(validateTenant.fulfilled, tenantValidationHandlers.fulfilled)
      .addCase(validateTenant.rejected, (state, action) => {
        tenantValidationHandlers.rejected(
          state,
          action,
          'Failed to validate institution',
        );
      });

    builder
      .addCase(restoreTenant.pending, (state) => {
        state.isRestoringTenant = true;
      })
      .addCase(restoreTenant.fulfilled, (state, action) => {
        state.isRestoringTenant = false;
        state.currentTenant = action.payload;
      })
      .addCase(restoreTenant.rejected, (state) => {
        state.isRestoringTenant = false;
        state.currentTenant = null;
      });

    builder.addCase(clearTenant.fulfilled, (state) => {
      state.currentTenant = null;
      state.error = null;
    });
  },
});

export const { clearTenantError } = tenantSlice.actions;
export default tenantSlice.reducer;
