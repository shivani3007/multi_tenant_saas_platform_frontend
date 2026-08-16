/**
 * The Axios instance every service uses, plus transparent token refresh.
 *
 * Two layers, on purpose:
 *
 *  1. **Request interceptor (the primary mechanism).** Before a request leaves,
 *     if the access token is within `tokenRefreshSkewMs` of expiring, we refresh
 *     it first and send the *fresh* token. The user therefore never generates a
 *     401 in the normal course of things — expiry is handled before the wire.
 *
 *  2. **Response interceptor (the safety net).** A token can still be rejected
 *     early — revoked server-side, clock skew, an expiry we couldn't read because
 *     the token is opaque rather than a JWT. On a 401 we refresh once and replay
 *     the original request. The caller's promise resolves with the real response,
 *     so no component ever sees the 401.
 *
 * Refresh is **single-flight**: ten requests hitting 401 together produce one
 * refresh call, and all ten wait on it and then replay. Without this you get a
 * refresh stampede and, on APIs with rotating refresh tokens, a logout loop as
 * each response invalidates the previous one's token.
 */
import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { env } from '../config/env';
import { AUTH_FREE_PATHS, endpoints } from './endpoints';
import { tokenStore } from './tokenStore';
import { tenantStore } from './tenantStore';
import type { AuthTokens } from './types';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Opt a request out of the Authorization header and the refresh dance. */
    skipAuth?: boolean;
  }
}

interface RetryableConfig extends InternalAxiosRequestConfig {
  /** Set once we've already replayed this request after a refresh. */
  _retried?: boolean;
}

/** Normalised error the UI can render without knowing about Axios. */
export class ApiError extends Error {
  readonly status: number | null;
  readonly code: string | null;
  readonly details: unknown;

  constructor(message: string, status: number | null, code: string | null, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  get isNetworkError(): boolean {
    return this.status === null;
  }
}

export const http: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  // Needed when the refresh token is delivered as an httpOnly cookie.
  withCredentials: true,
  headers: { Accept: 'application/json' },
});

/**
 * A second instance with **no interceptors**. The refresh call itself must go
 * through this one — otherwise a failing refresh would trigger the response
 * interceptor, which would call refresh again, forever.
 */
const bareHttp: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  withCredentials: true,
  headers: { Accept: 'application/json' },
});

// ── Session-expiry broadcast ────────────────────────────────────────────────
// When refresh genuinely fails there's nothing left to do but sign out. The auth
// layer subscribes here rather than http.ts importing React.

type ExpiryListener = () => void;
const expiryListeners = new Set<ExpiryListener>();

export function onSessionExpired(listener: ExpiryListener): () => void {
  expiryListeners.add(listener);
  return () => {
    expiryListeners.delete(listener);
  };
}

function broadcastSessionExpired(): void {
  tokenStore.clear();
  for (const listener of expiryListeners) listener();
}

// ── Single-flight refresh ───────────────────────────────────────────────────

let inFlightRefresh: Promise<AuthTokens> | null = null;

/** How a fresh token is obtained. Swappable so alternative auth handlers can supply their own. */
export type RefreshHandler = () => Promise<AuthTokens>;

async function requestRefreshFromApi(): Promise<AuthTokens> {
  const current = tokenStore.get();

  // With a cookie-based refresh token there is nothing to send; with a body-based
  // one, an absent token means we have no way to refresh at all.
  const response = await bareHttp.post<unknown>(endpoints.auth.refresh, {
    refreshToken: current?.refreshToken ?? undefined,
  });

  return adaptTokens(response.data);
}

let refreshHandler: RefreshHandler = requestRefreshFromApi;

/**
 * Replaces how tokens are refreshed.
 *
 * Alternative auth providers can install their own handler so the interceptors
 * keep working end-to-end — expiry, single-flight and replay all behave the
 * same as with the default refresh implementation.
 */
export function setRefreshHandler(handler: RefreshHandler): void {
  refreshHandler = handler;
}

async function performRefresh(): Promise<AuthTokens> {
  const next = await refreshHandler();
  tokenStore.set(next);
  return next;
}

/**
 * Refresh the session, coalescing concurrent callers onto one network call.
 * Rejects (and signs the user out) when the refresh token is itself dead.
 */
export function refreshSession(): Promise<AuthTokens> {
  if (!inFlightRefresh) {
    inFlightRefresh = performRefresh()
      .catch((error: unknown) => {
        broadcastSessionExpired();
        throw toApiError(error);
      })
      .finally(() => {
        inFlightRefresh = null;
      });
  }
  return inFlightRefresh;
}

// ── Interceptors ────────────────────────────────────────────────────────────

function isAuthFree(url: string | undefined): boolean {
  if (!url) return false;
  return AUTH_FREE_PATHS.some((path) => url === path || url.endsWith(path));
}


http.interceptors.request.use(async (config: RetryableConfig) => {
  // Only include tenant context while the app is explicitly running in test mode.
  const isTestMode = String(import.meta.env.VITE_TEST_MODE ?? 'true').trim().toLowerCase() === 'true';
  const tenant = tenantStore.get();
  console.log("tenant => ",tenant)
  console.log("env.tenantId => ",env.tenantId)
  console.log("isTestMode => ",isTestMode)
  if (isTestMode) {
    // axios headers may be a Headers-like object with `set`, or a plain object.
    const tenantId = env.tenantId;
    if (config.headers && typeof (config.headers as any).set === 'function') {
      (config.headers as any).set('X-Subdomain', tenantId);
    } else {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>)['X-Subdomain'] = tenantId;
    }
  }

  if (config.skipAuth || isAuthFree(config.url)) return config;

  const tokens = tokenStore.get();
  if (!tokens) return config;

  // Proactive refresh: swap a nearly-dead token for a fresh one before sending.
  if (tokenStore.isExpiring(env.tokenRefreshSkewMs)) {
    try {
      await refreshSession();
    } catch {
      // Refresh failed; broadcastSessionExpired already ran. Let the request go
      // out unauthenticated and fail naturally rather than hanging here.
      return config;
    }
  }

  const accessToken = tokenStore.getAccessToken();
  if (accessToken) config.headers.set('Authorization', `Bearer ${accessToken}`);
  return config;
});

http.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) throw toApiError(error);

    const config = error.config as RetryableConfig | undefined;
    const status = error.response?.status ?? null;

    const canRetry =
      status === 401 && config != null && !config._retried && !config.skipAuth && !isAuthFree(config.url);

    if (!canRetry) throw toApiError(error);

    config._retried = true;
    try {
      const tokens = await refreshSession();
      config.headers.set('Authorization', `Bearer ${tokens.accessToken}`);
      return await http.request(config);
    } catch {
      // Refresh failed — the session really is over.
      throw new ApiError('Your session has ended. Please sign in again.', 401, 'session_expired');
    }
  },
);

// ── Payload adapters ────────────────────────────────────────────────────────

/**
 * Maps a login/refresh payload onto `AuthTokens`.
 *
 * ── Point this at your real API ──
 * Accepts the common spellings (`access_token`/`accessToken`, `expires_in`
 * seconds or `expires_at`). Add yours here if it differs.
 */
export function adaptTokens(payload: unknown): AuthTokens {
  const data = (payload ?? {}) as Record<string, unknown>;
  const nested = (data.tokens ?? data.data ?? data) as Record<string, unknown>;

  const accessToken = String(
    nested.accessToken ?? nested.access_token ?? nested.token ?? nested.access ?? (data as Record<string, unknown>).access ?? '',
  );
  if (!accessToken) {
    throw new ApiError('Auth response did not include an access token.', null, 'bad_auth_payload', payload);
  }

  const refreshRaw = nested.refreshToken ?? nested.refresh_token ?? null;
  const expiresIn = Number(nested.expiresIn ?? nested.expires_in);
  const expiresAtRaw = nested.expiresAt ?? nested.expires_at;

  let expiresAt: number | null = null;
  if (Number.isFinite(expiresIn)) expiresAt = Date.now() + expiresIn * 1000;
  else if (typeof expiresAtRaw === 'number') expiresAt = expiresAtRaw < 1e12 ? expiresAtRaw * 1000 : expiresAtRaw;
  else if (typeof expiresAtRaw === 'string') {
    const parsed = Date.parse(expiresAtRaw);
    if (!Number.isNaN(parsed)) expiresAt = parsed;
  }

  return {
    accessToken,
    refreshToken: typeof refreshRaw === 'string' ? refreshRaw : null,
    expiresAt,
  };
}

/** Turns anything thrown by Axios into an `ApiError` with a human-readable message. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<Record<string, unknown>>;
    const status = axiosError.response?.status ?? null;
    const body = axiosError.response?.data;

    const baseMessage =
      pickMessage(body) ??
      (status === null
        ? 'Could not reach the server. Check your connection and try again.'
        : `Request failed (${status}).`);

    // Include method + url so the UI shows which endpoint failed (helps debug 404s).
    const method = (axiosError.config?.method ?? 'get').toString().toUpperCase();
    const url = axiosError.config?.url ?? 'unknown URL';
    const message = `${baseMessage} (${method} ${url})`;

    const code = typeof body?.code === 'string' ? body.code : null;
    return new ApiError(message, status, code, body);
  }

  return new ApiError(error instanceof Error ? error.message : 'Something went wrong.', null, null, error);
}

function pickMessage(body: unknown): string | null {
  if (typeof body === 'string' && body.trim() !== '') return body;
  if (!body || typeof body !== 'object') return null;
  const record = body as Record<string, unknown>;
  for (const key of ['message', 'error', 'detail', 'error_description'] as const) {
    const value = record[key];
    if (typeof value === 'string' && value.trim() !== '') return value;
  }
  return null;
}
