import type { Session, Tenant, User } from '../types';

export interface LoginInput {
  email: string;
  password: string;
  remember?: boolean;
}

/**
 * Sign-up creates a workspace *and* its first user in one call, so the new
 * account is the Owner of the organisation it just created.
 */
export interface RegisterInput {
  tenantName: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

/** Shape returned by login/register endpoints. */
export interface AuthResponse {
  access: string;
  user: {
    id: string;
    firstName: string;
    role: string;
    tenantId?: string;
    [key: string]: unknown;
  };
}

/**
 * The surface the app uses to authenticate.
 *
 * The application authentication surface implemented by `auth.ts`.
 *
 * The app talks to this interface so implementations can be swapped without
 * changing calling code.
 */
export interface AuthApi {
  login(input: LoginInput): Promise<Session>;
  /**
   * Creates the organisation and its first user, and returns a signed-in
   * session — registration lands the user straight on the dashboard rather than
   * bouncing them back to a login form they've just filled in.
   */
  register(input: RegisterInput): Promise<Session>;
  /** Rehydrates a session on page load from a persisted token. */
  me(signal?: AbortSignal): Promise<{ user: User; tenant: Tenant }>;
  logout(): Promise<void>;
}
