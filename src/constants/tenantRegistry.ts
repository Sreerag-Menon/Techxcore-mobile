/**
 * Bundled institution registry (short code → API base URL).
 *
 * Adding or changing entries requires an app release unless you migrate
 * to a remote registry later. Keep lookup logic pure so remote config can
 * reuse normalizeTenantCode / resolveTenantCode.
 */
import { APP_CONFIG } from './config';

export interface TenantRegistryEntry {
  /** Canonical uppercase code, e.g. "SCHOOL01" */
  code: string;
  /** Optional label shown before getSiteDetails resolves site name */
  displayName?: string;
  /** Institution API origin, e.g. "https://school.example.com" */
  baseUrl: string;
  /** API version path segment; defaults to APP_CONFIG.DEFAULT_API_VERSION */
  apiVersion?: string;
  /** When false, code lookup fails with inactive message */
  active?: boolean;
}

/**
 * Institution short codes. Add one entry per client.
 * LOCAL: Android emulator → host machine API on port 8081.
 */
export const TENANT_REGISTRY: TenantRegistryEntry[] = [
  {
    code: 'LOCAL',
    displayName: 'Local Development',
    baseUrl: 'http://10.0.2.2:8000',
    active: true,
  },
  // Example production entry — replace with real institution URLs:
  // {
  //   code: 'SCHOOL01',
  //   displayName: 'Example School LMS',
  //   baseUrl: 'https://school.example.com',
  //   active: true,
  // },
];

const registryByCode = new Map(
  TENANT_REGISTRY.map((entry) => [entry.code.toUpperCase(), entry]),
);

/** Trim and uppercase for lookup. */
export function normalizeTenantCode(input: string): string {
  return input.trim().toUpperCase();
}

/**
 * Resolve a short code to a registry entry.
 * Returns null if unknown or inactive.
 */
export function resolveTenantCode(code: string): TenantRegistryEntry | null {
  const normalized = normalizeTenantCode(code);
  if (!normalized) return null;

  const entry = registryByCode.get(normalized);
  if (!entry) return null;

  if (entry.active === false) {
    return null;
  }

  return entry;
}

/** Resolved base URL and API version for validation. */
export function getTenantBaseUrlFromCode(code: string): {
  baseUrl: string;
  apiVersion: string;
  tenantCode: string;
  displayName?: string;
} | null {
  const entry = resolveTenantCode(code);
  if (!entry) return null;

  return {
    baseUrl: entry.baseUrl.replace(/\/+$/, ''),
    apiVersion: entry.apiVersion ?? APP_CONFIG.DEFAULT_API_VERSION,
    tenantCode: normalizeTenantCode(code),
    displayName: entry.displayName,
  };
}
