/** Display formatting. Everything here is pure and locale-aware. */

const compactFormatter = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });
const plainFormatter = new Intl.NumberFormat();

export function formatNumber(value: number): string {
  return plainFormatter.format(value);
}

/** 1,284 stays 1,284; 12,900 becomes 12.9K. Keeps stat tiles from wrapping. */
export function formatCompact(value: number): string {
  return value < 10_000 ? plainFormatter.format(value) : compactFormatter.format(value);
}

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] as const;

export function formatBytes(bytes: number, fractionDigits = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), BYTE_UNITS.length - 1);
  const value = bytes / 1024 ** exponent;
  const digits = exponent === 0 ? 0 : value >= 100 ? 0 : fractionDigits;
  return `${value.toFixed(digits)} ${BYTE_UNITS[exponent]}`;
}

/** Splits the byte string so a stat tile can size the number and unit differently. */
export function splitBytes(bytes: number): { value: string; unit: string } {
  const [value, unit = 'B'] = formatBytes(bytes).split(' ');
  return { value, unit };
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDayLabel(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function formatFullDay(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
];

const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—';
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return '—';

  const delta = time - Date.now();
  for (const [unit, ms] of RELATIVE_UNITS) {
    if (Math.abs(delta) >= ms) return relativeFormatter.format(Math.round(delta / ms), unit);
  }
  return 'just now';
}

export function formatPercent(fraction: number): string {
  const sign = fraction > 0 ? '+' : '';
  return `${sign}${(fraction * 100).toFixed(fraction === 0 ? 0 : 1)}%`;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}
