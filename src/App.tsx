import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useThemeEffect } from './app/useThemeEffect';
import { RequireAuth } from './auth/RequireAuth';
import { RequireCapability } from './auth/RequireCapability';
import { AppLayout } from './components/layout/AppLayout';
import { FullPageSpinner } from './components/feedback/FullPageSpinner';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForbiddenPage } from './pages/ForbiddenPage';
import { NotFoundPage } from './pages/NotFoundPage';

/*
 * The four signed-in pages are split out of the initial bundle. It matters most
 * for the dashboard — the charting library is the single largest dependency, and
 * nobody should download it to render the login form.
 */
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const FileManagerPage = lazy(() =>
  import('./pages/FileManagerPage').then((m) => ({ default: m.FileManagerPage })),
);
const UserManagementPage = lazy(() =>
  import('./pages/UserManagementPage').then((m) => ({ default: m.UserManagementPage })),
);
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));

/**
 * Route table.
 *
 * Two nested guards rather than one: RequireAuth answers "are you signed in"
 * (redirect to /login, remembering where you were), RequireCapability answers
 * "are you allowed here" (render the 403 in place). Keeping them separate is what
 * makes the redirect role-aware — an unauthenticated user never sees a 403, and a
 * signed-in user is never bounced to a login form they don't need.
 */
export function App() {
  useThemeEffect();

  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        {/* Public. An unauthenticated visit to anything else lands on /login. */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/403" element={<ForbiddenPage />} />

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/files" element={<FileManagerPage />} />

            {/* Admin and Owner — see the permission table in auth/roles.ts. */}
            <Route element={<RequireCapability capability="users:manage" />}>
              <Route path="/users" element={<UserManagementPage />} />
            </Route>

            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
