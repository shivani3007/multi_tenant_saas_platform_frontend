import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import { FullPageSpinner } from '../components/feedback/FullPageSpinner';

/**
 * Gate for "you must be signed in".
 *
 * While the session rehydrates we render a spinner rather than redirecting —
 * bouncing to /login on every refresh and back again is the classic flicker.
 * The attempted URL rides along in location state so login can return you to it.
 */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageSpinner label="Restoring your session…" />;

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
