import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { dismissToast, selectToasts } from '../../features/ui/uiSlice';
import { IconAlert, IconCheck, IconClose } from '../icons';

const TOAST_TTL_MS = 5_000;

export function Toaster() {
  const toasts = useAppSelector(selectToasts);
  const dispatch = useAppDispatch();

  // One timer per toast; clearing on unmount stops a dismissed toast's timer firing.
  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((toast) =>
      window.setTimeout(() => dispatch(dismissToast(toast.id)), TOAST_TTL_MS),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [toasts, dispatch]);

  if (toasts.length === 0) return null;

  return (
    <div className="toaster" role="region" aria-label="Notifications">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.tone}`} role="status" aria-live="polite">
          <span
            style={{
              color:
                toast.tone === 'success'
                  ? 'var(--status-good)'
                  : toast.tone === 'error'
                    ? 'var(--status-critical)'
                    : 'var(--accent)',
              display: 'flex',
              marginTop: 1,
            }}
          >
            {toast.tone === 'success' ? <IconCheck size={16} /> : <IconAlert size={16} />}
          </span>
          <span style={{ flex: 1 }}>{toast.message}</span>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={() => dispatch(dismissToast(toast.id))}
            aria-label="Dismiss notification"
          >
            <IconClose size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
