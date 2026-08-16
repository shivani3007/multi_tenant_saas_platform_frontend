import { useNavigate } from 'react-router-dom';
import type { Role } from '../api/types';
import { CAPABILITY_LABEL, ROLE_LABEL, rolesWith, type Capability } from '../auth/roles';
import { IconArrowLeft, IconShieldOff } from '../components/icons';

interface ForbiddenPageProps {
  /** The capability that was missing, so the page can name who does have it. */
  capability?: Capability;
  current?: Role;
}

/** Joins role names as "Admin or Owner" / "Editor, Admin or Owner". */
function listRoles(roles: readonly Role[]): string {
  const names = roles.map((role) => ROLE_LABEL[role]);
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;
}

export function ForbiddenPage({ capability, current }: ForbiddenPageProps) {
  const navigate = useNavigate();

  // A direct hit on /403 (no history) would leave Back doing nothing, so fall
  // back to the dashboard in that case.
  const canGoBack = window.history.length > 1;

  function handleBack() {
    if (canGoBack) navigate(-1);
    else navigate('/dashboard', { replace: true });
  }

  const allowed = capability ? rolesWith(capability) : null;

  return (
    <div className="centered-page">
      <div className="card forbidden" role="alert">
        <span style={{ color: 'var(--status-critical)' }}>
          <IconShieldOff size={34} />
        </span>
        <div className="forbidden-code">403</div>
        <h1 className="page-title">You don’t have access to this page</h1>
        <p className="secondary-text">
          {capability && allowed
            ? `“${CAPABILITY_LABEL[capability]}” is limited to ${listRoles(allowed)}.`
            : 'Your account doesn’t have permission to view this page.'}
          {current && ` You’re signed in as ${ROLE_LABEL[current]}.`}
        </p>
        <div className="row" style={{ marginTop: 4 }}>
          <button type="button" className="btn btn-primary" onClick={handleBack}>
            <IconArrowLeft size={16} />
            {canGoBack ? 'Go back' : 'Back to dashboard'}
          </button>
          <button type="button" className="btn" onClick={() => navigate('/dashboard')}>
            Dashboard
          </button>
        </div>
        <p className="field-hint">If you think this is a mistake, ask an admin to update your role.</p>
      </div>
    </div>
  );
}
