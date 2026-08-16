import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { ApiError } from '../api/http';
import { Banner } from '../components/feedback/Banner';
import { IconSpinner } from '../components/icons';

const MIN_PASSWORD_LENGTH = 8;

interface FieldErrors {
  organizationName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
}

function validate(values: {
  organizationName: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}): FieldErrors {
  const errors: FieldErrors = {};

  if (values.organizationName.trim() === '') {
    errors.organizationName = 'Enter your organization name.';
  }
  if (values.firstName.trim() === '') {
    errors.firstName = 'Enter your first name.';
  }
  if (values.lastName.trim() === '') {
    errors.lastName = 'Enter your last name.';
  }
  if (values.email.trim() === '') {
    errors.email = 'Enter your email address.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }
  if (values.password === '') {
    errors.password = 'Choose a password.';
  } else if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  return errors;
}

export function RegisterPage() {
  const { status, register } = useAuth();
  const navigate = useNavigate();

  const [organizationName, setOrganizationName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in (e.g. hit /register directly, or in a second tab).
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const values = { organizationName, firstName, lastName, email, password };
    const errors = validate(values);
    setFieldErrors(errors);
    setFormError(null);

    // Validate before the request so the obvious mistakes don't cost a round trip.
    if (Object.keys(errors).length > 0) return;
    console.log("tenantName : ",organizationName)
    setSubmitting(true);
    try {
      await register({
        tenantName: values.organizationName.trim(),
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        password: values.password,
      });
      console.log("now Redirect");
      // Registration signs you in, so go straight to the dashboard.
      navigate('/dashboard', { replace: true });
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        // Pin a duplicate-email failure to the field that caused it.
        setFieldErrors({ email: caught.message });
      } else {
        setFormError(
          caught instanceof ApiError ? caught.message : 'Could not create your account. Please try again.',
        );
      }
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
          <h1 className="page-title">Create your account</h1>
          <p className="page-subtitle">Set up your workspace to get started.</p>
        </div>

        {formError && <Banner tone="error">{formError}</Banner>}

        <form onSubmit={handleSubmit} className="stack" style={{ gap: 14 }} noValidate>
          <div className="field">
            <label className="field-label" htmlFor="organizationName">
              Organization Name
            </label>
            <input
              id="organizationName"
              className="input"
              autoComplete="organization"
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              placeholder="ABC Corporation"
              aria-invalid={fieldErrors.organizationName != null}
              aria-describedby={fieldErrors.organizationName ? 'organizationName-error' : undefined}
            />
            {fieldErrors.organizationName && (
              <span className="field-error" id="organizationName-error">
                {fieldErrors.organizationName}
              </span>
            )}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="firstName">
              First name
            </label>
            <input
              id="firstName"
              className="input"
              autoComplete="given-name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              placeholder="Shivani"
              aria-invalid={fieldErrors.firstName != null}
              aria-describedby={fieldErrors.firstName ? 'firstName-error' : undefined}
            />
            {fieldErrors.firstName && (
              <span className="field-error" id="firstName-error">
                {fieldErrors.firstName}
              </span>
            )}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="lastName">
              Last name
            </label>
            <input
              id="lastName"
              className="input"
              autoComplete="family-name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              placeholder="Kumar"
              aria-invalid={fieldErrors.lastName != null}
              aria-describedby={fieldErrors.lastName ? 'lastName-error' : undefined}
            />
            {fieldErrors.lastName && (
              <span className="field-error" id="lastName-error">
                {fieldErrors.lastName}
              </span>
            )}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="shivani@example.com"
              aria-invalid={fieldErrors.email != null}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            />
            {fieldErrors.email && (
              <span className="field-error" id="email-error">
                {fieldErrors.email}
              </span>
            )}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••••"
              aria-invalid={fieldErrors.password != null}
              aria-describedby={fieldErrors.password ? 'password-error' : 'password-hint'}
            />
            {fieldErrors.password ? (
              <span className="field-error" id="password-error">
                {fieldErrors.password}
              </span>
            ) : (
              <span className="field-hint" id="password-hint">
                At least {MIN_PASSWORD_LENGTH} characters.
              </span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ width: '100%', minHeight: 40 }}
          >
            {submitting && <IconSpinner size={16} />}
            {submitting ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
