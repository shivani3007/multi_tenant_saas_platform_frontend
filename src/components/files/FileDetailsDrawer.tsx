import { useEffect, type ReactNode } from 'react';
import type { FileRecord } from '../../api/types';
import { formatBytes, formatDateTime, isImage } from '../../utils/format';
import { StatusBadge } from './StatusBadge';
import { Banner } from '../feedback/Banner';
import { IconClose, IconDownload, IconImage, IconTrash } from '../icons';

interface FileDetailsDrawerProps {
  file: FileRecord | null;
  canDelete: boolean;
  onClose: () => void;
  onDelete: (file: FileRecord) => void;
}

export function FileDetailsDrawer({ file, canDelete, onClose, onDelete }: FileDetailsDrawerProps) {
  useEffect(() => {
    if (!file) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [file, onClose]);

  if (!file) return null;

  const previewUrl = file.thumbnailUrl ?? (isImage(file.mimeType) ? file.downloadUrl : null);

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={`Details for ${file.name}`}>
        <div className="drawer-head">
          <h2 className="section-title" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {file.name}
          </h2>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close details">
            <IconClose size={17} />
          </button>
        </div>

        <div className="drawer-body">
          {file.status === 'failed' && file.error && <Banner tone="error">{file.error}</Banner>}

          <div className="preview-frame">
            {previewUrl && isImage(file.mimeType) ? (
              <img src={previewUrl} alt={`Preview of ${file.name}`} />
            ) : (
              <div className="empty-state" style={{ padding: 24 }}>
                <IconImage size={26} />
                <span className="field-hint">
                  {isImage(file.mimeType)
                    ? 'Preview is generated once processing finishes.'
                    : 'No preview available for this file type.'}
                </span>
              </div>
            )}
          </div>

          <dl className="detail-list">
            <Detail label="Status">
              <StatusBadge status={file.status} />
            </Detail>
            <Detail label="Size">{formatBytes(file.sizeBytes)}</Detail>
            <Detail label="Type">{file.mimeType}</Detail>
            <Detail label="Uploaded">{formatDateTime(file.uploadedAt)}</Detail>
            <Detail label="Uploaded by">{file.uploadedBy?.name ?? '—'}</Detail>
            <Detail label="File ID">
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{file.id}</code>
            </Detail>
          </dl>

          <div className="row" style={{ gap: 8 }}>
            {file.downloadUrl && file.status === 'done' && (
              <a
                className="btn"
                href={file.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none' }}
              >
                <IconDownload size={16} />
                Download
              </a>
            )}
            {canDelete && (
              <button type="button" className="btn btn-danger" onClick={() => onDelete(file)}>
                <IconTrash size={16} />
                Delete
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="detail-row">
      <dt className="detail-key">{label}</dt>
      <dd className="detail-value" style={{ margin: 0 }}>
        {children}
      </dd>
    </div>
  );
}
