import { createContext } from 'react';
import type { Tenant } from '../api/types';

export interface TenantContextValue {
  tenant: Tenant | null;
  /** Used by Settings after a workspace rename, so the shell updates immediately. */
  setTenant: (tenant: Tenant) => void;
}

export const TenantContext = createContext<TenantContextValue | null>(null);
