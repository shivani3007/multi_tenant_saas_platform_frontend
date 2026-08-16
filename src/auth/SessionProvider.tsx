import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { authApi } from '../api/services/authProvider';
import type { LoginInput, RegisterInput } from '../api/services/auth.contract';
import { onSessionExpired } from '../api/http';
import { sessionStore } from '../api/sessionStore';
import { tokenStore } from '../api/tokenStore';
import { tenantStore } from '../api/tenantStore';
import type { Tenant, User } from '../api/types';
import { AuthContext, type AuthContextValue, type AuthStatus } from './authContext';
import { TenantContext, type TenantContextValue } from './tenantContext';

/**
 * Owns the two pieces of state the spec says belong in Context — who you are and
 * which workspace you're in — and nothing else. Feature state lives in Redux.
 *
 * Both contexts are provided from one component because both are filled by the
 * same session response; splitting the providers would mean fetching twice.
 */
function restoreSession(): { status: AuthStatus; user: User | null; tenant: Tenant | null } {
  if (!tokenStore.getAccessToken()) {
    return { status: 'unauthenticated', user: null, tenant: null };
  }

  const stored = sessionStore.get();
  if (stored) {
    tenantStore.set(stored.tenant);
    return { status: 'authenticated', user: stored.user, tenant: stored.tenant };
  }

  return { status: 'authenticated', user: null, tenant: null };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const initial = restoreSession();
  const [status, setStatus] = useState<AuthStatus>(initial.status);
  const [user, setUser] = useState<User | null>(initial.user);
  const [tenant, setTenant] = useState<Tenant | null>(initial.tenant);
  const [expired, setExpired] = useState(false);

  // Guards against a rehydrate response landing after a logout.
  const generation = useRef(0);

  // The refresh interceptor gave up: the session is genuinely over.
  useEffect(
    () =>
      onSessionExpired(() => {
        generation.current += 1;
        setUser(null);
        setTenant(null);
        sessionStore.clear();
        tenantStore.clear();
        setExpired(true);
        setStatus('unauthenticated');
      }),
    [],
  );

  const login = useCallback(async (input: LoginInput): Promise<User> => {
    const session = await authApi.login(input);
    generation.current += 1;
    sessionStore.set({ user: session.user, tenant: session.tenant });
    setUser(session.user);
    setTenant(session.tenant);
    tenantStore.set(session.tenant);
    setExpired(false);
    setStatus('authenticated');
    return session.user;
  }, []);

  // Registration returns a signed-in session, so it lands the user in exactly
  // the same state as a login — no second round trip, no re-entering the password.
  const register = useCallback(async (input: RegisterInput): Promise<User> => {
    const session = await authApi.register(input);
    generation.current += 1;
    sessionStore.set({ user: session.user, tenant: session.tenant });
    setUser(session.user);
    setTenant(session.tenant);
    tenantStore.set(session.tenant);
    setExpired(false);
    setStatus('authenticated');
    return session.user;
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    generation.current += 1;
    // Clear locally first so the UI can never flash authenticated content while
    // the revocation request is still in flight.
    setUser(null);
    setTenant(null);
    sessionStore.clear();
    tenantStore.clear();
    setExpired(false);
    setStatus('unauthenticated');
    await authApi.logout();
  }, []);

  const authValue = useMemo<AuthContextValue>(
    () => ({ status, user, role: user?.role, login, register, logout, expired }),
    [status, user, login, register, logout, expired],
  );

  const setTenantWithStore = useCallback((t: Tenant) => {
    setTenant(t);
    tenantStore.set(t);
  }, []);

  const tenantValue = useMemo<TenantContextValue>(() => ({ tenant, setTenant: setTenantWithStore }), [tenant, setTenantWithStore]);

  return (
    <AuthContext.Provider value={authValue}>
      <TenantContext.Provider value={tenantValue}>{children}</TenantContext.Provider>
    </AuthContext.Provider>
  );
}
