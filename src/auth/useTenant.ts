import { useContext } from 'react';
import { TenantContext, type TenantContextValue } from './tenantContext';

export function useTenant(): TenantContextValue {
  const value = useContext(TenantContext);
  if (!value) throw new Error('useTenant must be used inside <SessionProvider>.');
  return value;
}
