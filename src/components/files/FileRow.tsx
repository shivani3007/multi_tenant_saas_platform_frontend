import { memo } from 'react';
import type { FileRecord } from '../../api/types';
import { formatBytes, formatRelative } from '../../utils/format';
import { StatusBadge } from './StatusBadge';
import { Thumbnail } from './Thumbnail';
import { IconTrash } from '../icons';

interface FileRowProps {
  file: FileRecord;
  selected: boolean;
  canDelete: boolean;
  onSelect: (id: string) => void;
  onDelete: (file: FileRecord) => void;
}

/**
 * Memoised because the poller patches one row's status at a time — without this
 * every tick re-renders the whole page of rows.
 */
export const FileRow = memo(function FileRow({ file, selected, canDelete, onSelect, onDelete }: FileRowProps) {
  console.log("file : ",file)
  return (
    <div
      className="file-row"
      role="row"
      aria-selected={selected}
      tabIndex={0}
      onClick={() => onSelect(file.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(file.id);
        }
      }}
    >
      <div role="cell">
        <Thumbnail name={file.name} mimeType={file.mimeType} url={file.thumbnailUrl} />
      </div>

      <div role="cell" style={{ minWidth: 0 }}>
        <div className="file-name" title={file.name}>
          {file.name}
        </div>
        <div className="file-sub">
          {formatBytes(file.sizeBytes)} · {file.mimeType}
        </div>
      </div>

      <div role="cell">
        <StatusBadge status={file.status} title={file.error ?? undefined} />
      </div>

      <div role="cell" className="file-col-owner file-sub">
        {file.uploadedBy?.name ?? '—'}
      </div>

      <div role="cell" className="file-col-date file-sub tnum">
        {formatRelative(file.uploadedAt)}
      </div>

      {/* <div role="cell">
        {canDelete && (
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(file);
            }}
            aria-label={`Delete ${file.name}`}
            title="Delete"
          >
            <IconTrash size={15} />
          </button>
        )}
      </div> */}
    </div>
  );
});
