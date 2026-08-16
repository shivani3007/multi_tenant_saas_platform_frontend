import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      {icon && <div className="muted">{icon}</div>}
      <div className="empty-title">{title}</div>
      {description && <p style={{ maxWidth: 420 }}>{description}</p>}
      {action}
    </div>
  );
}
