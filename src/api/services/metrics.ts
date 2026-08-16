import { http, toApiError } from '../http';
import { endpoints } from '../endpoints';
import type { DailyUploadPoint, MetricsSummary } from '../types';

/** ── Adapt to your API here ── */
function adaptSummary(payload: unknown): MetricsSummary {
  const data = (payload ?? {}) as Record<string, any>;
  const source = (data.metrics ?? data.data ?? data) as Record<string, any>;
  return {
    totalFiles: Number(source.totalFiles ?? source.total_files ?? source.files ?? 0) || 0,
    storageUsedBytes: Number(source.storageUsedBytes ?? source.storage_used_bytes ?? source.storageUsed ?? 0) || 0,
    activeUsers: Number(source.activeUsers ?? source.active_users ?? 0) || 0,
    jobsQueued: Number(source.jobsQueued ?? source.jobs_queued ?? source.queueDepth ?? 0) || 0,
    deltas: (source.deltas ?? undefined) as MetricsSummary['deltas'],
  };
}

/**
 * ── Adapt to your API here ──
 * Normalises to `{ date: 'YYYY-MM-DD', count }`. Gap-filling (days the server
 * omits because nothing was uploaded) happens in the chart selector, not here —
 * this stays a faithful read of the response.
 */
function adaptDaily(payload: unknown): DailyUploadPoint[] {
  const rows: unknown[] = Array.isArray(payload)
    ? payload
    : ((payload as Record<string, any>)?.items ?? (payload as Record<string, any>)?.data ?? []);

  return rows
    .map((row) => {
      const data = (row ?? {}) as Record<string, any>;
      const rawDate = String(data.date ?? data.day ?? data.bucket ?? '');
      return {
        date: rawDate.slice(0, 10),
        count: Number(data.count ?? data.uploads ?? data.value ?? data.total ?? 0) || 0,
      };
    })
    .filter((point) => /^\d{4}-\d{2}-\d{2}$/.test(point.date))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export const metricsApi = {
  async summary(signal?: AbortSignal): Promise<MetricsSummary> {
    try {
      const { data } = await http.get<unknown>(endpoints.metrics.summary, { signal });
      return adaptSummary(data);
    } catch (error) {
      throw toApiError(error);
    }
  },

  async uploadsDaily(days = 30, signal?: AbortSignal): Promise<DailyUploadPoint[]> {
    try {
      const { data } = await http.get<unknown>(endpoints.metrics.uploadsDaily, { signal, params: { days } });
      return adaptDaily(data);
    } catch (error) {
      throw toApiError(error);
    }
  },
};
