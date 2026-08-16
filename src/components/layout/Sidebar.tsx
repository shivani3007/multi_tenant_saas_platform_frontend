import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { closeSidebar, selectSidebarOpen } from '../../features/ui/uiSlice';
import { useAuth } from '../../auth/useAuth';
import { useTenant } from '../../auth/useTenant';
import { can, ROLE_LABEL, type Capability } from '../../auth/roles';
import { IconDashboard, IconFiles, IconSettings, IconUsers } from '../icons';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  /** Omitted = visible to everyone signed in. */
  requires?: Capability;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <IconDashboard size={17} /> },
  { to: '/files', label: 'File Manager', icon: <IconFiles size={17} />, requires: 'files:view' },
  { to: '/users', label: 'User Management', icon: <IconUsers size={17} />, requires: 'users:manage' },
  { to: '/settings', label: 'Settings', icon: <IconSettings size={17} /> },
];

export function Sidebar() {
  const { role } = useAuth();
  const { tenant } = useTenant();
  const open = useAppSelector(selectSidebarOpen);
  const dispatch = useAppDispatch();

  // The same predicate the route guard uses — a link is never shown for a page
  // that would immediately 403.
  const visibleItems = NAV_ITEMS.filter((item) => !item.requires || can(role, item.requires));

  return (
    <>
      {open && (
        <div className="sidebar-backdrop" onClick={() => dispatch(closeSidebar())} aria-hidden="true" />
      )}
      <nav className={`sidebar${open ? ' open' : ''}`} aria-label="Main">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            {(tenant?.name ?? 'RD').slice(0, 2).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="brand-name">{tenant?.name ?? 'Workspace'}</div>
            <div className="brand-tenant">{tenant?.plan ? `${tenant.plan} plan` : tenant?.slug ?? ''}</div>
          </div>
        </div>

        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            onClick={() => dispatch(closeSidebar())}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}

        <div className="sidebar-footer">
          <div className="brand-tenant" style={{ padding: '0 10px' }}>
            Signed in as {role ? ROLE_LABEL[role] : 'guest'}
          </div>
        </div>
      </nav>
    </>
  );
}
