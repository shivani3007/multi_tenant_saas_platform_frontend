import type { FileStatus } from '../../api/types';
import { IconAlert, IconCheck, IconClock, IconSpinner } from '../icons';

const CONFIG: Record<FileStatus, { label: string; className: string; color: string }> = {
  pending: { label: 'Pending', className: 'badge-pending', color: 'var(--status-neutral)' },
  processing: { label: 'Processing', className: 'badge-processing', color: 'var(--status-warning)' },
  done: { label: 'Done', className: 'badge-done', color: 'var(--status-good)' },
  failed: { label: 'Failed', className: 'badge-failed', color: 'var(--status-critical)' },
};

/**
 * Status is carried by an icon *and* a word — never by colour alone, which
 * matters both for CVD readers and because two of these steps sit below 3:1 on
 * the light surface. The colour is a reinforcement, not the message.
 */
export function StatusBadge({ status, title }: { status: FileStatus; title?: string }) {
  const { label, className, color } = CONFIG[status];

  return (
    <span className={`badge ${className}`} title={title ?? label}>
      <span className="badge-icon" style={{ color }} aria-hidden="true">
        {status === 'pending' && <IconClock size={13} />}
        {status === 'processing' && <IconSpinner size={13} />}
        {status === 'done' && <IconCheck size={13} />}
        {status === 'failed' && <IconAlert size={13} />}
      </span>
      {label}
    </span>
  );
}
