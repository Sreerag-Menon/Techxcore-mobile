/** Tenant configuration and site details types */

/** Represents a resolved and validated tenant instance */
export interface TenantConfig {
  /** The base URL of the tenant's API, e.g., "https://harvard.lms.com" */
  baseUrl: string;
  /** API version path, e.g., "v0.2" */
  apiVersion: string;
  /** Full API path = baseUrl + /api/ + apiVersion */
  apiBasePath: string;
  /** Tenant display name from getSiteDetails */
  siteName: string;
  /** Short name / identifier */
  shortName?: string;
  /** Logo URL for branding */
  logoUrl?: string;
  /** Favicon URL */
  faviconUrl?: string;
  /** Campus logo URL */
  campusLogoUrl?: string;
  /** Timestamp of when this tenant was last validated */
  lastValidated: string;
  /** Short code used when connecting (e.g. "AAI001") */
  tenantCode?: string;
}

/** Data returned by the /api/getSiteDetails endpoint */
export interface SiteDetailsResponse {
  name: string;
  short_name: string;
  title: string;
  logo: string;
  favicon: string;
  campus_logo: string;
  co_brand_image: string;
  home_web_banner: string;
  home_mob_banner: string;
  icon_192: string;
  icon_512: string;
  icon: string;
  captcha_enabled?: number;
  recaptcha?: string;
  [key: string]: unknown;
}

/** Redux state for tenant management */
export interface TenantState {
  /** Currently active tenant configuration */
  currentTenant: TenantConfig | null;
  /** True while validating a tenant URL */
  isValidating: boolean;
  /** True while restoring a persisted tenant on app launch */
  isRestoringTenant: boolean;
  /** Last validation or restore error */
  error: string | null;
}
