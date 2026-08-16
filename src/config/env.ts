/**
 * The only module in the app that reads `import.meta.env`.
 * Everything else imports `env` from here.
 */

function str(value: string | undefined, fallback: string): string {
  return value && value.trim() !== '' ? value.trim() : fallback;
}

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Authentication mode: `api` calls the real /auth endpoints. Set
 * `VITE_AUTH_MODE` to `mock` only to explicitly enable the old mock mode.
 */
function authMode(value: string | undefined): 'mock' | 'api' {
  const normalised = value?.trim().toLowerCase();
  if (normalised === 'mock' || normalised === 'api') return normalised;
  // Default to the real API. Keep explicit override available via
  // `VITE_AUTH_MODE` if needed.
  return 'api';
}

function apiBaseUrlFromEnv(): string {
  const configured = str(import.meta.env.VITE_API_BASE_URL, '');
  const testMode = str(import.meta.env.VITE_TEST_MODE, 'true').trim().toLowerCase();

  if (testMode === 'false') {
    const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
    const fallback = '/api/v1';
    return origin ? `${origin}${fallback}` : (configured || fallback).replace(/\/+$/, '');
  }

  if (configured) return configured.replace(/\/+$/, '');

  return '/api';
}

export const env = {
  /** Trailing slashes stripped so path joins stay predictable. */
  apiBaseUrl: apiBaseUrlFromEnv(),
  /** Optional tenant id provided at build/runtime for login requests. */
  tenantId: str(import.meta.env.VITE_TENANT_SLUG, ''),
  authMode: authMode(import.meta.env.VITE_AUTH_MODE),
  tokenRefreshSkewMs: num(import.meta.env.VITE_TOKEN_REFRESH_SKEW_MS, 45_000),
  filesPageSize: num(import.meta.env.VITE_FILES_PAGE_SIZE, 50),
  filePollIntervalMs: num(import.meta.env.VITE_FILE_POLL_INTERVAL_MS, 3_000),
  virtualizeThreshold: num(import.meta.env.VITE_VIRTUALIZE_THRESHOLD, 100),
} as const;
