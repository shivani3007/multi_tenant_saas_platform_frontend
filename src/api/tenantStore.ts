import type { Tenant } from './types';

type Listener = (tenant: Tenant | null) => void;

let tenant: Tenant | null = null;
const listeners = new Set<Listener>();

export const tenantStore = {
  get(): Tenant | null {
    return tenant;
  },

  set(next: Tenant | null): void {
    tenant = next;
    for (const l of listeners) l(tenant);
  },

  clear(): void {
    tenant = null;
    for (const l of listeners) l(tenant);
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export default tenantStore;
