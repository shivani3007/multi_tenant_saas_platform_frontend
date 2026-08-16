import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { ApiError } from '../api/http';
// Mock credentials and mock mode removed — always use real API.
import { Banner } from '../components/feedback/Banner';
import { IconSpinner } from '../components/icons';

interface RedirectState {
  from?: { pathname: string; search?: string; hash?: string };
}

export function LoginPage() {
  const { status, login, expired } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Where the guard bounced them from, so sign-in returns them there.
  const state = location.state as RedirectState | null;
  const from = state?.from
    ? `${state.from.pathname}${state.from.search ?? ''}${state.from.hash ?? ''}`
    : '/dashboard';

  // Already signed in (e.g. hit /login directly, or a second tab): don't show the form.
  if (status === 'authenticated') return <Navigate to={from} replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      await login({ email: email.trim(), password });
      navigate(from, { replace: true });
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.status === 401
          ? 'That email and password combination is not right.'
          : caught instanceof ApiError
            ? caught.message
            : 'Could not sign in. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="centered-page">
      <div className="card auth-card">
        <div className="auth-head">
          <div className="brand-mark" style={{ margin: '0 auto 8px' }} aria-hidden="true">
            RD
          </div>
          <h1 className="page-title">Login</h1>
          <p className="page-subtitle">Use your workspace account to continue.</p>
        </div>

        {expired && (
          <Banner tone="warning">Your session expired. Sign in again to pick up where you left off.</Banner>
        )}
        {error && <Banner tone="error">{error}</Banner>}

        <form onSubmit={handleSubmit} className="stack" style={{ gap: 14 }} noValidate>
          <div className="field">
            <label className="field-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              aria-invalid={error != null}
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              aria-invalid={error != null}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || email.trim() === '' || password === ''}
            style={{ width: '100%', minHeight: 40 }}
          >
            {submitting && <IconSpinner size={16} />}
            {submitting ? 'Signing in…' : 'Login'}
          </button>
        </form>

        <p className="auth-switch">
          Don’t have an account? <Link to="/register">Create account</Link>
        </p>

        <p className="field-hint" style={{ textAlign: 'center' }}>
          Trouble signing in? Contact your workspace admin.
        </p>
      </div>
    </div>
  );
}
