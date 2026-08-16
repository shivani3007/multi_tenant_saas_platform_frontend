import { useCallback, useRef, useState, type DragEvent } from 'react';
import { IconUpload } from '../icons';
import { formatBytes } from '../../utils/format';

interface DropZoneProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  disabledReason?: string;
  maxSizeBytes?: number;
  accept?: string;
}

export function DropZone({
  onFiles,
  disabled = false,
  disabledReason,
  maxSizeBytes,
  accept,
}: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rejected, setRejected] = useState<string | null>(null);

  /*
   * dragenter/dragleave fire for every child element the pointer crosses, so a
   * boolean flickers. Counting enters and leaves is what keeps the highlight
   * steady while the pointer moves across the icon and the text.
   */
  const dragDepth = useRef(0);

  const accept_ = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const all = Array.from(fileList);
      const tooBig = maxSizeBytes ? all.filter((file) => file.size > maxSizeBytes) : [];
      const allowed = maxSizeBytes ? all.filter((file) => file.size <= maxSizeBytes) : all;

      setRejected(
        tooBig.length > 0
          ? `${tooBig.length} file${tooBig.length === 1 ? '' : 's'} skipped — over the ${formatBytes(maxSizeBytes!)} limit.`
          : null,
      );
      if (allowed.length > 0) onFiles(allowed);
    },
    [maxSizeBytes, onFiles],
  );

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (disabled) return;
    dragDepth.current += 1;
    setDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (disabled) return;
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    // Without this the browser navigates to the dropped file instead.
    event.preventDefault();
    if (!disabled) event.dataTransfer.dropEffect = 'copy';
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (disabled) return;
    accept_(event.dataTransfer.files);
  }

  return (
    <div>
      <div
        className={`dropzone${dragging ? ' dragging' : ''}${disabled ? ' disabled' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-label="Upload files: drop files here or press Enter to browse"
      >
        <span className="dropzone-icon">
          <IconUpload size={24} />
        </span>
        <span className="dropzone-title">
          {dragging ? 'Drop to upload' : 'Drag files here, or click to browse'}
        </span>
        <span className="field-hint">
          {disabled
            ? (disabledReason ?? 'Uploading is disabled for your role.')
            : maxSizeBytes
              ? `Up to ${formatBytes(maxSizeBytes)} per file. Multiple files are fine.`
              : 'Multiple files are fine.'}
        </span>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          className="visually-hidden"
          disabled={disabled}
          onChange={(event) => {
            accept_(event.target.files);
            // Reset so re-picking the same file still fires a change event.
            event.target.value = '';
          }}
        />
      </div>

      {rejected && (
        <p className="field-error" style={{ marginTop: 8 }} role="alert">
          {rejected}
        </p>
      )}
    </div>
  );
}
