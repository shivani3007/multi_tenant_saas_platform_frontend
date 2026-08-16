import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { selectTheme, setTheme, toggleSidebar, type ThemePreference } from '../../features/ui/uiSlice';
import { useAuth } from '../../auth/useAuth';
import { ROLE_LABEL } from '../../auth/roles';
import { initialsOf } from '../../utils/format';
import { IconLogout, IconMenu, IconMonitor, IconMoon, IconSettings, IconSun } from '../icons';

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string; icon: ReactNode }> = [
  { value: 'light', label: 'Light', icon: <IconSun size={14} /> },
  { value: 'dark', label: 'Dark', icon: <IconMoon size={14} /> },
  { value: 'system', label: 'System', icon: <IconMonitor size={14} /> },
];

export function Topbar({ title }: { title: string }) {
  const { user, logout } = useAuth();
  const theme = useAppSelector(selectTheme);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  async function handleLogout() {
    // Remove authentication data
    localStorage.removeItem('rd.auth.tokens');
    setMenuOpen(false);
    await logout();
    navigate('/login', { replace: true });
  }

  const displayName = user?.firstName ?? '?';

  return (
    <header className="topbar">
      <button
        type="button"
        className="btn btn-ghost btn-icon mobile-only"
        onClick={() => dispatch(toggleSidebar())}
        aria-label="Toggle navigation"
      >
        <IconMenu size={18} />
      </button>

      <h1 style={{ fontSize: 15, fontWeight: 620 }}>{title}</h1>
      <div className="topbar-spacer" />

      <div className="segmented" role="group" aria-label="Colour theme">
        {THEME_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={theme === option.value}
            onClick={() => dispatch(setTheme(option.value))}
            title={`${option.label} theme`}
          >
            {option.icon}
            <span className="visually-hidden">{option.label} theme</span>
          </button>
        ))}
      </div>

      <div style={{ position: 'relative' }} ref={menuRef}>
        <button
          type="button"
          className="user-chip"
          onClick={() => setMenuOpen((open) => !open)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <span className="avatar" aria-hidden="true">
            {user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initialsOf(displayName)}
          </span>
          <span style={{ display: 'grid', lineHeight: 1.25 }}>
            <span style={{ fontSize: 13, fontWeight: 570 }}>{displayName}</span>
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
              {user ? ROLE_LABEL[user.role] : ''}
            </span>
          </span>
        </button>

        {menuOpen && (
          <div className="menu" role="menu">
            <div className="menu-header">
              <div style={{ fontWeight: 570 }}>{user?.firstName}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {user?.email}
              </div>
            </div>
            <Link to="/settings" className="menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>
              <IconSettings size={15} />
              Settings
            </Link>
            <div className="menu-separator" />
            <button type="button" className="menu-item" role="menuitem" onClick={handleLogout}>
              <IconLogout size={15} />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
