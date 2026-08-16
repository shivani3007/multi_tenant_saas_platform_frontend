/**
 * Framework-agnostic holder for the current tokens.
 *
 * Kept outside React on purpose: the Axios interceptors run during requests that
 * may be fired from anywhere (including outside the component tree), so they need
 * a synchronous, render-independent read.
 *
 * Storage note: the access token lives in memory *and* localStorage so a page
 * reload keeps you signed in. If your API returns the refresh token as an
 * httpOnly cookie instead of in the body, leave `refreshToken` null — the refresh
 * call sends credentials, and nothing here needs to change.
 */
import type { AuthTokens } from './types';
import { getTokenExpiry } from './jwt';

const STORAGE_KEY = 'rd.auth.tokens';

type Listener = (tokens: AuthTokens | null) => void;

let tokens: AuthTokens | null = null;
const listeners = new Set<Listener>();
let hydrated = false;

function read(): AuthTokens | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthTokens>;
    if (typeof parsed.accessToken !== 'string' || parsed.accessToken === '') return null;
    return {
      accessToken: parsed.accessToken,
      refreshToken: typeof parsed.refreshToken === 'string' ? parsed.refreshToken : null,
      expiresAt: typeof parsed.expiresAt === 'number' ? parsed.expiresAt : getTokenExpiry(parsed.accessToken),
    };
  } catch {
    return null;
  }
}

function emit(): void {
  for (const listener of listeners) listener(tokens);
}

export const tokenStore = {
  get(): AuthTokens | null {
    if (!hydrated) {
      tokens = read();
      hydrated = true;
    }
    return tokens;
  },

  getAccessToken(): string | null {
    return tokenStore.get()?.accessToken ?? null;
  },

  set(next: AuthTokens): void {
    tokens = {
      ...next,
      // Trust the server's expiry if it sent one; otherwise read it off the JWT.
      expiresAt: next.expiresAt ?? getTokenExpiry(next.accessToken),
    };
    hydrated = true;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
    } catch {
      /* private mode / quota — the in-memory copy still works for this tab */
    }
    emit();
  },

  clear(): void {
    tokens = null;
    hydrated = true;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    emit();
  },

  /**
   * True when the access token is known to expire within `skewMs`.
   * Returns false when the expiry is unknown — we can't preempt what we can't read,
   * and the response interceptor still covers that case.
   */
  isExpiring(skewMs: number): boolean {
    const current = tokenStore.get();
    if (!current?.expiresAt) return false;
    return current.expiresAt - Date.now() <= skewMs;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/** Keeps sibling tabs in sync — signing out in one tab signs out the rest. */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return;
    tokens = read();
    hydrated = true;
    emit();
  });
}
