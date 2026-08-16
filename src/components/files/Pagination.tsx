import { IconChevronLeft, IconChevronRight } from '../icons';
import { formatNumber } from '../../utils/format';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  disabled?: boolean;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

/**
 * Drives the server-side query. Every control here changes the request, never a
 * client-side slice — `items` only ever holds the page the server returned.
 */
export function Pagination({
  page,
  pageSize,
  total,
  totalPages,
  disabled = false,
  pageSizeOptions = [25, 50, 100, 200],
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="pagination">
      <span className="tnum">
        {total === 0 ? 'No results' : `${formatNumber(first)}–${formatNumber(last)} of ${formatNumber(total)}`}
      </span>

      <div className="row" style={{ gap: 14 }}>
        {onPageSizeChange && (
          <label className="row" style={{ gap: 6 }}>
            <span className="muted" style={{ fontSize: 12.5 }}>
              Per page
            </span>
            <select
              className="select"
              style={{ width: 'auto', minHeight: 30, padding: '0 8px' }}
              value={pageSize}
              disabled={disabled}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="page-buttons">
          <button
            type="button"
            className="btn btn-sm btn-icon"
            onClick={() => onPageChange(page - 1)}
            disabled={disabled || page <= 1}
            aria-label="Previous page"
          >
            <IconChevronLeft size={15} />
          </button>
          <span className="tnum" style={{ minWidth: 84, textAlign: 'center' }}>
            Page {formatNumber(page)} of {formatNumber(Math.max(1, totalPages))}
          </span>
          <button
            type="button"
            className="btn btn-sm btn-icon"
            onClick={() => onPageChange(page + 1)}
            disabled={disabled || page >= totalPages}
            aria-label="Next page"
          >
            <IconChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
