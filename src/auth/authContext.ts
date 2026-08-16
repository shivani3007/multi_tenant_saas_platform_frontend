import { createContext } from 'react';
import type { Role, User } from '../api/types';
import type { LoginInput, RegisterInput } from '../api/services/auth.contract';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  /** Convenience mirror of `user.role`, so guards don't null-check twice. */
  role: Role | undefined;
  login: (input: LoginInput) => Promise<User>;
  /** Creates the workspace and signs the new Owner in, in one step. */
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  /** True when the last session ended because a refresh failed, not a click. */
  expired: boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
