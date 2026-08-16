import type { ReactNode } from 'react';
import { IconAlert, IconClose } from '../icons';

interface BannerProps {
  tone?: 'error' | 'info' | 'warning';
  children: ReactNode;
  onDismiss?: () => void;
}

export function Banner({ tone = 'error', children, onDismiss }: BannerProps) {
  return (
    <div className={`banner banner-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <IconAlert size={17} style={{ flex: 'none', marginTop: 1 }} />
      <div style={{ flex: 1 }}>{children}</div>
      {onDismiss && (
        <button type="button" className="btn btn-ghost btn-icon" onClick={onDismiss} aria-label="Dismiss">
          <IconClose size={15} />
        </button>
      )}
    </div>
  );
}
