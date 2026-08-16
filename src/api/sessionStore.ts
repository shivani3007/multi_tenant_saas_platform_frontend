/**
 * Persists the signed-in user and workspace from login/register so a page
 * reload can restore the top bar and permission guards without another round trip.
 */
import type { Tenant, User } from './types';

const STORAGE_KEY = 'rd.auth.session';

export interface StoredSession {
  user: User;
  tenant: Tenant;
}

type Listener = (session: StoredSession | null) => void;

let session: StoredSession | null = null;
const listeners = new Set<Listener>();
let hydrated = false;

function read(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (!parsed.user || typeof parsed.user.id !== 'string' || parsed.user.id === '') return null;
    return {
      user: parsed.user as User,
      tenant: (parsed.tenant ?? { id: 'default', name: 'Workspace', slug: 'default' }) as Tenant,
    };
  } catch {
    return null;
  }
}

function emit(): void {
  for (const listener of listeners) listener(session);
}

export const sessionStore = {
  get(): StoredSession | null {
    if (!hydrated) {
      session = read();
      hydrated = true;
    }
    return session;
  },

  set(next: StoredSession): void {
    session = next;
    hydrated = true;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* private mode / quota — in-memory copy still works for this tab */
    }
    emit();
  },

  clear(): void {
    session = null;
    hydrated = true;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    emit();
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
    session = read();
    hydrated = true;
    emit();
  });
}
