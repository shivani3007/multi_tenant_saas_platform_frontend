import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DailyUploadPoint } from '../../api/types';
import { buildDailySeries, summariseSeries } from '../../features/metrics/series';
import { formatDayLabel, formatFullDay, formatNumber } from '../../utils/format';
import { useChartTokens } from './useChartTokens';

interface UploadsChartProps {
  points: DailyUploadPoint[];
  days?: number;
  loading?: boolean;
  /** True during a refetch — the previous render is held rather than replaced. */
  stale?: boolean;
}

interface TooltipPayloadEntry {
  payload: DailyUploadPoint;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadEntry[] }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-date">{formatFullDay(point.date)}</div>
      <div className="chart-tooltip-value">
        <span className="tooltip-key" aria-hidden="true" />
        <span className="tnum">{formatNumber(point.count)}</span>
        <span style={{ fontWeight: 450, color: 'var(--text-secondary)' }}>
          {point.count === 1 ? 'file' : 'files'}
        </span>
      </div>
    </div>
  );
}

/**
 * Files uploaded per day, last 30 days.
 *
 * One series, so no legend — the card title names what is plotted. Only the peak
 * carries a direct label; the axis and the tooltip carry the rest, and the table
 * view below is the WCAG-clean twin so no value is reachable by hover alone.
 */
export function UploadsChart({ points, days = 30, loading = false, stale = false }: UploadsChartProps) {
  const tokens = useChartTokens();

  const series = useMemo(() => buildDailySeries(points, days), [points, days]);
  const stats = useMemo(() => summariseSeries(series), [series]);

  // ~6 labels across 30 days keeps the axis readable without rotating text.
  const tickInterval = Math.max(0, Math.ceil(series.length / 6) - 1);

  return (
    <section className="card chart-card" aria-labelledby="uploads-chart-title">
      <div className="chart-head">
        <div>
          <h2 className="section-title" id="uploads-chart-title">
            Files uploaded per day
          </h2>
          <p className="page-subtitle">Last {days} days</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="metric-value" style={{ fontSize: 22 }}>
            {formatNumber(stats.total)}
          </div>
          <div className="metric-foot" style={{ justifyContent: 'flex-end' }}>
            total · {stats.average.toFixed(1)}/day avg
          </div>
        </div>
      </div>

      <div className={`chart-body${stale ? ' stale' : ''}`}>
        {loading ? (
          <div className="skeleton" style={{ height: '100%', width: '100%' }} aria-hidden="true" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 18, right: 12, bottom: 4, left: -8 }}>
              <defs>
                {/* A wash, not a saturated block: 10% at the top, fading out. */}
                <linearGradient id="uploads-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={tokens.series1} stopOpacity={0.16} />
                  <stop offset="100%" stopColor={tokens.series1} stopOpacity={0.02} />
                </linearGradient>
              </defs>

              {/* Solid hairlines, horizontal only — dashed grids read as thresholds. */}
              <CartesianGrid stroke={tokens.grid} strokeWidth={1} vertical={false} />

              <XAxis
                dataKey="date"
                interval={tickInterval}
                tickFormatter={formatDayLabel}
                tick={{ fill: tokens.muted, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: tokens.axis, strokeWidth: 1 }}
                tickMargin={8}
                minTickGap={4}
              />
              <YAxis
                width={48}
                allowDecimals={false}
                tick={{ fill: tokens.muted, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => formatNumber(value)}
              />

              <Tooltip
                content={<ChartTooltip />}
                cursor={{ stroke: tokens.axis, strokeWidth: 1 }}
                animationDuration={120}
              />

              <Area
                type="monotone"
                dataKey="count"
                stroke={tokens.series1}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="url(#uploads-fill)"
                // The dot only appears on hover; a marker on all 30 points is noise.
                dot={false}
                activeDot={{ r: 4.5, fill: tokens.series1, stroke: tokens.surface, strokeWidth: 2 }}
                isAnimationActive={false}
                name="Files uploaded"
              />

              {/* The one direct label: the busiest day. */}
              {stats.peak && (
                <ReferenceDot
                  x={stats.peak.date}
                  y={stats.peak.count}
                  r={4}
                  fill={tokens.series1}
                  stroke={tokens.surface}
                  strokeWidth={2}
                  label={{
                    value: formatNumber(stats.peak.count),
                    position: 'top',
                    fill: 'var(--text-secondary)',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <details style={{ marginTop: 8 }}>
        <summary
          className="secondary-text"
          style={{ cursor: 'pointer', fontSize: 12.5, padding: '6px 2px' }}
        >
          View as table
        </summary>
        <div className="table-scroll" style={{ marginTop: 8 }}>
          <table className="data-table">
            <caption className="visually-hidden">Files uploaded per day over the last {days} days</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col" className="num">
                  Files uploaded
                </th>
              </tr>
            </thead>
            <tbody>
              {series.map((point) => (
                <tr key={point.date}>
                  <td>{formatFullDay(point.date)}</td>
                  <td className="num">{formatNumber(point.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
