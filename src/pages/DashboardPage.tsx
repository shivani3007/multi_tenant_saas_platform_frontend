import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { fetchDashboard, selectMetrics } from '../features/metrics/metricsSlice';
import { MetricCard } from '../components/dashboard/MetricCard';
import { UploadsChart } from '../components/dashboard/UploadsChart';
import { Banner } from '../components/feedback/Banner';
import { formatCompact, splitBytes } from '../utils/format';
import { IconDatabase, IconFiles, IconLayers, IconUsers } from '../components/icons';

const DAYS = 30;

export function DashboardPage() {
  const { summary, daily, loading, error } = useAppSelector(selectMetrics);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const promise = dispatch(fetchDashboard({ days: DAYS }));
    return () => promise.abort();
  }, [dispatch]);

  const initialLoad = loading === 'loading' && !summary;
  const storage = splitBytes(summary?.storageUsedBytes ?? 0);

  return (
    <div className="stack">
      <div className="row-between">
        <div>
          <h2 className="page-title">Overview</h2>
          <p className="page-subtitle">Workspace activity at a glance.</p>
        </div>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => dispatch(fetchDashboard({ days: DAYS }))}
          disabled={loading !== 'idle'}
        >
          {loading === 'refreshing' ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && <Banner tone="error">{error}</Banner>}

      <div className={`metric-grid${loading === 'refreshing' ? ' stale' : ''}`}>
        <MetricCard
          label="Total files"
          value={formatCompact(summary?.totalFiles ?? 0)}
          icon={<IconFiles size={16} />}
          delta={summary?.deltas?.totalFiles}
          hint="Across all folders"
          loading={initialLoad}
        />
        <MetricCard
          label="Storage used"
          value={storage.value}
          unit={storage.unit}
          icon={<IconDatabase size={16} />}
          delta={summary?.deltas?.storageUsedBytes}
          hint="Of your plan allowance"
          loading={initialLoad}
        />
        <MetricCard
          label="Active users"
          value={formatCompact(summary?.activeUsers ?? 0)}
          icon={<IconUsers size={16} />}
          delta={summary?.deltas?.activeUsers}
          hint="Seen in the last 30 days"
          loading={initialLoad}
        />
        <MetricCard
          label="Jobs queued"
          value={formatCompact(summary?.jobsQueued ?? 0)}
          icon={<IconLayers size={16} />}
          delta={summary?.deltas?.jobsQueued}
          // A growing queue is a bad sign, so the delta colouring inverts here.
          upIsGood={false}
          hint="Waiting to be processed"
          loading={initialLoad}
        />
      </div>

      <UploadsChart points={daily} days={DAYS} loading={initialLoad} stale={loading === 'refreshing'} />
    </div>
  );
}
