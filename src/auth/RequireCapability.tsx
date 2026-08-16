import { Outlet } from 'react-router-dom';
import { can, type Capability } from './roles';
import { useAuth } from './useAuth';
import { ForbiddenPage } from '../pages/ForbiddenPage';

interface RequireCapabilityProps {
  /** The capability the route needs, looked up in the permission table. */
  capability: Capability;
}

/**
 * Gate for "you must be signed in *as someone who can do this*".
 *
 * Routes name a capability rather than a role, so a change to the access matrix
 * is a one-line edit in `roles.ts` and never a hunt through the route table.
 *
 * Renders the 403 in place rather than redirecting to /403: the URL stays on the
 * page the user actually asked for, so the browser Back button and the page's own
 * back action both behave, and a link shared with the right person still works.
 */
export function RequireCapability({ capability }: RequireCapabilityProps) {
  const { role } = useAuth();

  if (!can(role, capability)) {
    return <ForbiddenPage capability={capability} current={role} />;
  }

  return <Outlet />;
}
