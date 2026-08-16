import { IconSpinner } from '../icons';

export function FullPageSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="full-page" role="status" aria-live="polite">
      <IconSpinner size={26} />
      <span>{label}</span>
    </div>
  );
}
