import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  cancelUpload,
  clearFinishedUploads,
  dismissUpload,
  selectOverallUploadProgress,
  selectUploads,
  type UploadItem,
} from '../../features/uploads/uploadsSlice';
import { formatBytes } from '../../utils/format';
import { Thumbnail } from './Thumbnail';
import { IconCheck, IconClose } from '../icons';

function statusText(upload: UploadItem): string {
  switch (upload.status) {
    case 'queued':
      return 'Waiting…';
    case 'uploading':
      return `${upload.progress}% · ${formatBytes((upload.sizeBytes * upload.progress) / 100)} of ${formatBytes(upload.sizeBytes)}`;
    case 'done':
      return `Uploaded · ${formatBytes(upload.sizeBytes)}`;
    case 'canceled':
      return 'Canceled';
    case 'failed':
      return upload.error ?? 'Upload failed';
  }
}

export function UploadQueue() {
  const uploads = useAppSelector(selectUploads);
  const overall = useAppSelector(selectOverallUploadProgress);
  const dispatch = useAppDispatch();

  if (uploads.length === 0) return null;

  const finishedCount = uploads.filter((upload) => upload.status !== 'uploading' && upload.status !== 'queued').length;

  return (
    <section className="card" style={{ padding: 14 }} aria-label="Upload queue">
      <div className="row-between" style={{ marginBottom: 10 }}>
        <div className="row" style={{ gap: 8 }}>
          <h3 className="section-title">Uploads</h3>
          <span className="muted" style={{ fontSize: 12.5 }}>
            {overall !== null ? `${overall}% of this batch` : `${uploads.length} in this session`}
          </span>
        </div>
        {finishedCount > 0 && (
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => dispatch(clearFinishedUploads())}>
            Clear finished
          </button>
        )}
      </div>

      {/* Batch-level bar, weighted by bytes rather than file count. */}
      {overall !== null && (
        <div className="progress-track" style={{ marginBottom: 12 }} role="progressbar" aria-valuenow={overall} aria-valuemin={0} aria-valuemax={100} aria-label="Overall upload progress">
          <div className="progress-fill" style={{ width: `${overall}%` }} />
        </div>
      )}

      <div className="upload-list">
        {uploads.map((upload) => {
          const active = upload.status === 'uploading' || upload.status === 'queued';
          return (
            <div key={upload.id} className="upload-row">
              <Thumbnail name={upload.name} mimeType={upload.mimeType} url={upload.previewUrl} />

              <div style={{ minWidth: 0 }}>
                <div className="row" style={{ gap: 6 }}>
                  <span className="upload-name" title={upload.name}>
                    {upload.name}
                  </span>
                  {upload.status === 'done' && (
                    <span style={{ color: 'var(--status-good)', display: 'flex' }} aria-hidden="true">
                      <IconCheck size={14} />
                    </span>
                  )}
                </div>
                <div className="upload-meta">{statusText(upload)}</div>
                <div
                  className="progress-track"
                  role="progressbar"
                  aria-valuenow={upload.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Upload progress for ${upload.name}`}
                >
                  <div
                    className={`progress-fill${
                      upload.status === 'failed'
                        ? ' failed'
                        : upload.status === 'canceled'
                          ? ' canceled'
                          : upload.status === 'done'
                            ? ' done'
                            : ''
                    }`}
                    style={{ width: `${upload.status === 'done' ? 100 : upload.progress}%` }}
                  />
                </div>
              </div>

              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={() => dispatch(active ? cancelUpload(upload.id) : dismissUpload(upload.id))}
                aria-label={active ? `Cancel upload of ${upload.name}` : `Dismiss ${upload.name}`}
                title={active ? 'Cancel' : 'Dismiss'}
              >
                <IconClose size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
