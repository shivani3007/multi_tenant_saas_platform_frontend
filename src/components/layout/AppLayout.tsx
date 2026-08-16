import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Toaster } from '../feedback/Toaster';

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/files': 'File Manager',
  '/users': 'User Management',
  '/settings': 'Settings',
};

export function AppLayout() {
  const { pathname } = useLocation();
  const title = TITLES[pathname] ?? 'Dashboard';

  return (
    <div className="shell">
      <Sidebar />
      <div className="main">
        <Topbar title={title} />
        <main className="content">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  );
}
