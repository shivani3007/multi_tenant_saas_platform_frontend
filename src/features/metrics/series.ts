import type { DailyUploadPoint } from '../../api/types';

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Expands the server's points into a continuous day-by-day series ending today.
 *
 * Backends usually omit days with no uploads. Plotting only the days that exist
 * would compress the x-axis and make a quiet week look like a busy one, so the
 * gaps are filled with explicit zeroes here — at the presentation layer, leaving
 * the API adapter a faithful read of the response.
 */
export function buildDailySeries(points: DailyUploadPoint[], days = 30): DailyUploadPoint[] {
  const byDate = new Map(points.map((point) => [point.date, point.count]));

  const series: DailyUploadPoint[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() - (days - 1));

  for (let index = 0; index < days; index += 1) {
    const date = toIsoDate(cursor);
    series.push({ date, count: byDate.get(date) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  return series;
}

export interface SeriesStats {
  total: number;
  peak: DailyUploadPoint | null;
  average: number;
}

export function summariseSeries(series: DailyUploadPoint[]): SeriesStats {
  if (series.length === 0) return { total: 0, peak: null, average: 0 };
  const total = series.reduce((sum, point) => sum + point.count, 0);
  const peak = series.reduce((best, point) => (point.count > best.count ? point : best), series[0]);
  return { total, peak: peak.count > 0 ? peak : null, average: total / series.length };
}
