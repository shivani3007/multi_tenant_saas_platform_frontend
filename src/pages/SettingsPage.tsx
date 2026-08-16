import { useState, type ReactNode } from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { selectTheme, setTheme, type ThemePreference } from '../features/ui/uiSlice';
import { useAuth } from '../auth/useAuth';
import {
  can,
  CAPABILITY_LABEL,
  PERMISSIONS,
  ROLE_DESCRIPTION,
  ROLE_LABEL,
  type Capability,
} from '../auth/roles';
import type { UserSettings } from '../api/types';
import { Banner } from '../components/feedback/Banner';
import { IconCheck, IconClose, IconMonitor, IconMoon, IconSpinner, IconSun } from '../components/icons';

const THEME_CHOICES: Array<{ value: ThemePreference; label: string; icon: ReactNode }> = [
  { value: 'light', label: 'Light', icon: <IconSun size={14} /> },
  { value: 'dark', label: 'Dark', icon: <IconMoon size={14} /> },
  { value: 'system', label: 'System', icon: <IconMonitor size={14} /> },
];

export function SettingsPage() {
  const { role } = useAuth();
  const theme = useAppSelector(selectTheme);
  const dispatch = useAppDispatch();

  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading] = useState(true);
  const [saving] = useState(false);
  const [error] = useState<string | null>(null);

  // useEffect(() => {
  //   const controller = new AbortController();
  //   settingsApi
  //     .get(controller.signal)
  //     .then((loaded) => {
  //       setSettings(loaded);
  //       setError(null);
  //     })
  //     .catch((caught: unknown) => {
  //       if (controller.signal.aborted) return;
  //       // Settings are a convenience, not a blocker — fall back to what we know
  //       // from the session so the page is still usable.
  //       setSettings({
  //         name: user?.firstName ?? '',
  //         email: user?.email ?? '',
  //         theme,
  //         notifyOnUploadComplete: true,
  //         notifyOnUploadFailed: true,
  //         defaultPageSize: 50,
  //       });
  //       setError(caught instanceof ApiError ? caught.message : 'Could not load your saved settings.');
  //     })
  //     .finally(() => {
  //       if (!controller.signal.aborted) setLoading(false);
  //     });

  //   return () => controller.abort();
  //   // Intentionally runs once: `theme` and `user` are only seeds for the fallback.
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, []);

  // async function handleSaveWorkspace(event: FormEvent<HTMLFormElement>) {
  //   event.preventDefault();
  //   setSavingWorkspace(true);
  //   try {
  //     const updated = await settingsApi.updateTenant({ name: workspaceName.trim() });
  //     setTenant(updated);
  //     dispatch(pushToast('Workspace updated.', 'success'));
  //   } catch (caught) {
  //     dispatch(pushToast(caught instanceof ApiError ? caught.message : 'Could not update the workspace.', 'error'));
  //   } finally {
  //     setSavingWorkspace(false);
  //   }
  // }

  function patchSettings(patch: Partial<UserSettings>) {
    setSettings((current) => (current ? { ...current, ...patch } : current));
  }

  return (
    <div className="stack">
      <div>
        <h2 className="page-title">Settings</h2>
        <p className="page-subtitle">Your account and appearance preferences.</p>
      </div>

      {error && <Banner tone="warning">{error}</Banner>}

      <div className="settings-grid">
        <form className="card settings-section">
          <h3 className="section-title">Profile</h3>

          <div className="field">
            <label className="field-label" htmlFor="settings-name">
              Display name
            </label>
            <input
              id="settings-name"
              className="input"
              value={settings?.name ?? ''}
              disabled={loading}
              onChange={(event) => patchSettings({ name: event.target.value })}
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="settings-email">
              Email
            </label>
            <input id="settings-email" className="input" value={settings?.email ?? ''} disabled readOnly />
            <span className="field-hint">Contact an admin to change the email on your account.</span>
          </div>

          <div className="field">
            <span className="field-label">Role</span>
            <div className="row">
              <span className="badge badge-role">{role ? ROLE_LABEL[role] : '—'}</span>
              <span className="field-hint">{role ? ROLE_DESCRIPTION[role] : ''}</span>
            </div>
          </div>

          {/* Reads straight from the permission table, so it can't drift from
              what the guards actually enforce. */}
          <div className="field">
            <span className="field-label">Your access</span>
            <ul className="capability-list">
              {(Object.keys(PERMISSIONS) as Capability[]).map((capability) => {
                const granted = can(role, capability);
                return (
                  <li key={capability} className={granted ? 'granted' : 'denied'}>
                    <span aria-hidden="true" style={{ display: 'flex' }}>
                      {granted ? <IconCheck size={14} /> : <IconClose size={14} />}
                    </span>
                    <span>{CAPABILITY_LABEL[capability]}</span>
                    <span className="visually-hidden">{granted ? ': allowed' : ': not allowed'}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <button type="submit" className="btn btn-primary" disabled={loading || saving}>
              {saving && <IconSpinner size={15} />}
              Save changes
            </button>
          </div>
        </form>

        <div className="card settings-section">
          <h3 className="section-title">Appearance</h3>
          <div className="switch-row">
            <div>
              <div style={{ fontWeight: 550 }}>Theme</div>
              <div className="field-hint">“System” follows your operating system setting.</div>
            </div>
            <div className="segmented" role="group" aria-label="Theme preference">
              {THEME_CHOICES.map((choice) => (
                <button
                  key={choice.value}
                  type="button"
                  aria-pressed={theme === choice.value}
                  onClick={() => {
                    dispatch(setTheme(choice.value));
                    patchSettings({ theme: choice.value });
                  }}
                >
                  {choice.icon}
                  <span style={{ marginLeft: 5 }}>{choice.label}</span>
                </button>
              ))}
            </div>
          </div>

          <h3 className="section-title" style={{ marginTop: 6 }}>
            Notifications
          </h3>

          <label className="switch-row" style={{ cursor: 'pointer' }}>
            <span>
              <span style={{ fontWeight: 550, display: 'block' }}>Upload finished</span>
              <span className="field-hint">Notify me when a file finishes processing.</span>
            </span>
            <input
              type="checkbox"
              checked={settings?.notifyOnUploadComplete ?? true}
              disabled={loading}
              onChange={(event) => patchSettings({ notifyOnUploadComplete: event.target.checked })}
            />
          </label>

          <label className="switch-row" style={{ cursor: 'pointer' }}>
            <span>
              <span style={{ fontWeight: 550, display: 'block' }}>Upload failed</span>
              <span className="field-hint">Notify me when processing fails.</span>
            </span>
            <input
              type="checkbox"
              checked={settings?.notifyOnUploadFailed ?? true}
              disabled={loading}
              onChange={(event) => patchSettings({ notifyOnUploadFailed: event.target.checked })}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
