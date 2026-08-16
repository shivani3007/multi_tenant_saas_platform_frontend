import type { ReactNode } from 'react';
import { formatPercent } from '../../utils/format';

interface MetricCardProps {
  label: string;
  /** Pre-formatted so each card controls its own compaction (bytes vs counts). */
  value: string;
  unit?: string;
  icon?: ReactNode;
  /** Fraction, e.g. 0.124 for +12.4%. */
  delta?: number;
  deltaLabel?: string;
  /** For queue depth, "up" is bad — this flips the delta colouring. */
  upIsGood?: boolean;
  hint?: string;
  loading?: boolean;
}

/**
 * A stat tile, not a one-bar chart: these four numbers are headline values, so
 * the number *is* the visualisation.
 */
export function MetricCard({
  label,
  value,
  unit,
  icon,
  delta,
  deltaLabel = 'vs. last 30 days',
  upIsGood = true,
  hint,
  loading = false,
}: MetricCardProps) {
  const hasDelta = typeof delta === 'number' && Number.isFinite(delta);
  const isGood = hasDelta && (delta > 0 ? upIsGood : !upIsGood);

  return (
    <div className="card metric-card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="metric-label">{label}</span>
        {icon && <span className="muted">{icon}</span>}
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 34, width: '62%' }} aria-hidden="true" />
      ) : (
        <div className="metric-value">
          {value}
          {unit && (
            <span style={{ fontSize: 15, fontWeight: 550, color: 'var(--text-secondary)', marginLeft: 4 }}>
              {unit}
            </span>
          )}
        </div>
      )}

      <div className="metric-foot">
        {hasDelta && !loading && (
          <>
            <span className={`metric-delta ${isGood ? 'up' : 'down'}`}>{formatPercent(delta)}</span>
            <span>{deltaLabel}</span>
          </>
        )}
        {!hasDelta && hint && <span>{hint}</span>}
      </div>
    </div>
  );
}
