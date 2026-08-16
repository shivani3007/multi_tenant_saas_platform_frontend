import { adaptTokens, http, toApiError } from '../http';
import { env } from '../../config/env';
import { endpoints } from '../endpoints';
import { tokenStore } from '../tokenStore';
import { ROLES, type Role, type Session, type Tenant, type User } from '../types';
import type { AuthApi, LoginInput, RegisterInput } from './auth.contract';

export type { LoginInput, RegisterInput };

/**
 * Role names the API may use that don't match ours, mapped onto the four in the
 * access matrix. Add yours here rather than widening the `Role` union — every
 * permission check depends on that union matching the table in `roles.ts`.
 */
const ROLE_ALIASES: Record<string, Role> = {
  member: 'Editor',
  contributor: 'Editor',
  write: 'Editor',
  read: 'Viewer',
  readonly: 'Viewer',
  administrator: 'Admin',
};

/** ── Adapt to your API here ── */
export function adaptUser(payload: unknown): User {
  const data = (payload ?? {}) as Record<string, any>;
  const rawRole = String(data.role ?? data.roleName ?? 'Viewer');
  const firstName = (data.firstName ?? data.first_name ?? data.givenName ?? null) as string | null;
  const tenantId = (data.tenantId ?? data.tenant_id ?? null) as string | null;
  return {
    id: String(data.id ?? data.userId ?? ''),
    email: String(data.email ?? ''),
    firstName: firstName ?? null,
    tenantId: tenantId ?? null,
    // Unknown roles fall back to the least privileged, never the most.
    role: (ROLES as readonly string[]).includes(rawRole)
      ? (rawRole as Role)
      : (ROLE_ALIASES[rawRole] ?? 'Viewer'),
    avatarUrl: data.avatarUrl ?? data.avatar_url ?? null,
    status: data.status === 'invited' || data.status === 'suspended' ? data.status : 'active',
    lastActiveAt: data.lastActiveAt ?? data.last_active_at ?? null,
    createdAt: data.createdAt ?? data.created_at ?? null,
  };
}

/** ── Adapt to your API here ── */
export function adaptTenant(payload: unknown): Tenant {
  const data = (payload ?? {}) as Record<string, any>;
  return {
    id: String(data.id ?? data.tenantId ?? 'default'),
    name: String(data.name ?? 'Workspace'),
    slug: String(data.slug ?? data.subdomain ?? 'default'),
    plan: data.plan ?? null,
    storageQuotaBytes: typeof data.storageQuotaBytes === 'number' ? data.storageQuotaBytes : null,
    logoUrl: data.logoUrl ?? null,
  };
}

function adaptSession(payload: unknown): Session {
  const data = (payload ?? {}) as Record<string, any>;
  return {
    user: adaptUser(data.user ?? data.profile ?? data),
    tenant: adaptTenant(data.tenant ?? data.organization ?? data.org ?? {}),
    tokens: adaptTokens(data),
  };
}

/**
 * The real backend. Reached whenever `VITE_AUTH_MODE=api` — see `authProvider.ts`.
 *
 * `satisfies AuthApi` is what keeps this and the mock interchangeable: if either
 * drifts from the contract, the build fails rather than the swap surprising you.
 */
export const realAuthApi = {
  async login(input: LoginInput): Promise<Session> {
    try {
      const headers: Record<string, string> = {};
      const isTestMode = String(import.meta.env.VITE_TEST_MODE ?? 'true').trim().toLowerCase() === 'true';
      if (isTestMode) headers['X-Subdomain'] = env.tenantId;

      const { data } = await http.post<unknown>(
        endpoints.auth.login,
        { email: input.email, password: input.password },
        { skipAuth: true, headers },
      );

      const payload = (data ?? {}) as Record<string, any>;
      // New backend shape: { access, user }
      if (typeof payload.access === 'string' && payload.user) {
        const userObj = adaptUser(payload.user);
        const tenantObj = adaptTenant({ tenantId: payload.user.tenantId ?? payload.user.tenantId ?? undefined });
        const tokens = adaptTokens(payload);
        const session: Session = { user: userObj, tenant: tenantObj, tokens };
        tokenStore.set(session.tokens);
        return session;
      }

      // Fallback for older session-shaped responses
      const session = adaptSession(data);
      tokenStore.set(session.tokens);
      return session;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async register(input: RegisterInput): Promise<Session> {
    try {
      const { data } = await http.post<unknown>(
        endpoints.auth.register,
        {
          // ── Adapt to your API here ── field names for the sign-up payload.
          tenantName: input.tenantName,
          firstName: input .firstName,
          lastName: input.lastName,
          email: input.email,
          password: input.password,
        },
        { skipAuth: true },
      );

      const payload = (data ?? {}) as Record<string, any>;
      if (typeof payload.access === 'string' && payload.user) {
        const userObj = adaptUser(payload.user);
        const tenantObj = adaptTenant({ tenantId: payload.user.tenantId ?? undefined });
        const tokens = adaptTokens(payload);
        const session: Session = { user: userObj, tenant: tenantObj, tokens };
        tokenStore.set(session.tokens);
        return session;
      }

      const session = adaptSession(data);
      tokenStore.set(session.tokens);
      return session;
    } catch (error) {
      throw toApiError(error);
    }
  },

  /** Rehydrates a session on page load from a persisted token. */
  async me(signal?: AbortSignal): Promise<{ user: User; tenant: Tenant }> {
    try {
      const { data } = await http.get<unknown>(endpoints.auth.me, { signal });
      const payload = (data ?? {}) as Record<string, any>;
      return {
        user: adaptUser(payload.user ?? payload.profile ?? payload),
        tenant: adaptTenant(payload.tenant ?? payload.organization ?? payload.org ?? {}),
      };
    } catch (error) {
      throw toApiError(error);
    }
  },

  /** Best-effort server-side revocation; local teardown happens regardless. */
  async logout(): Promise<void> {
    try {
      await http.post(endpoints.auth.logout, {});
    } catch {
      /* the local session is cleared by the caller either way */
    } finally {
      tokenStore.clear();
    }
  },
} satisfies AuthApi;
