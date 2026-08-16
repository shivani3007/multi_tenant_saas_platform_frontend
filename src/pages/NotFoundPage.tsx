import { useNavigate } from 'react-router-dom';
import { IconArrowLeft } from '../components/icons';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="centered-page">
      <div className="card forbidden">
        <div className="forbidden-code" style={{ color: 'var(--text-muted)' }}>
          404
        </div>
        <h1 className="page-title">Page not found</h1>
        <p className="secondary-text">The page you were looking for doesn’t exist or has moved.</p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/dashboard')}>
          <IconArrowLeft size={16} />
          Back to dashboard
        </button>
      </div>
    </div>
  );
}
