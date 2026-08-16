/**
 * Single source of truth for API paths.
 *
 * ── Pointing this at your real API ────────────────────────────────────────────
 * If your backend uses different paths, change them here and nowhere else.
 * If it uses different *response shapes*, change the `adapt*` functions in
 * `src/api/services/*.ts` — those are the only places that touch raw payloads.
 */
export const endpoints = {
  auth: {
    login: '/auth/login',
    /** Creates the tenant and its first (Owner) user, and returns a session. */
    register: '/auth/register',
    /** Must NOT require a valid access token, and must not be retried on 401. */
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    me: '/auth/me',
  },
  files: {
    list: '/files',
    upload: '/files/upload',
    byId: (id: string) => `/files/${encodeURIComponent(id)}`,
    /** Bulk status lookup used by the poller: ?ids=a,b,c */
    statuses: '/files/statuses',
    /** Server-sent upload status stream for active files. */
    statusStream: '/events',
  },
  users: {
    list: '/users',
    create: '/users/invite',
    byId: (id: string) => `/users/${encodeURIComponent(id)}`,
  },
  metrics: {
    summary: '/reports/summary',
    /** ?days=30 → [{ date, count }] */
    uploadsDaily: '/metrics/uploads-daily',
  },
  settings: {
    me: '/me/settings',
    tenant: '/tenant',
  },
} as const;

/** Paths the auth interceptors must never try to refresh-and-retry. */
export const AUTH_FREE_PATHS: readonly string[] = [
  endpoints.auth.login,
  endpoints.auth.register,
  endpoints.auth.refresh,
];
