import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { FileRecord } from '../../api/types';
import { env } from '../../config/env';
import { FileRow } from './FileRow';
import { EmptyState } from '../feedback/EmptyState';
import { IconFiles } from '../icons';

const ROW_HEIGHT = 64;

interface FileListProps {
  files: FileRecord[];
  selectedId: string | null;
  canDelete: boolean;
  loading: boolean;
  /** Background refetch — rows are held at reduced opacity instead of replaced. */
  stale: boolean;
  onSelect: (id: string) => void;
  onDelete: (file: FileRecord) => void;
  emptyHint?: string;
}

export function FileList({
  files,
  selectedId,
  canDelete,
  loading,
  stale,
  onSelect,
  onDelete,
  emptyHint,
}: FileListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  /*
   * Virtualisation is a cost as well as a saving: absolute positioning, a fixed
   * row height and a measured scroll container. Below the threshold the plain
   * DOM list is both simpler and faster, so we only pay for it once a page is
   * genuinely large. Note this is about *page size* — pagination itself is
   * server-side, so this never becomes a client-side slice of a bigger array.
   */
  const virtualize = files.length > env.virtualizeThreshold;

  const virtualizer = useVirtualizer({
    count: files.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
    // Keeps scroll position anchored to a row rather than a pixel when data patches.
    getItemKey: (index) => files[index]?.id ?? index,
  });

  if (loading) {
    return (
      <div className="file-list">
        <Header />
        <div style={{ padding: 12, display: 'grid', gap: 8 }}>
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="skeleton" style={{ height: 48 }} aria-hidden="true" />
          ))}
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="file-list">
        <Header />
        <EmptyState
          icon={<IconFiles size={26} />}
          title="No files here yet"
          description={emptyHint ?? 'Upload your first file with the drop zone above.'}
        />
      </div>
    );
  }

  return (
    <div className="file-list" role="table" aria-label="Files" aria-rowcount={files.length}>
      <Header />

      <div className={`file-scroll${stale ? ' stale' : ''}`} ref={scrollRef} role="rowgroup">
        {virtualize ? (
          <div className="virtual-canvas" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const file = files[virtualRow.index];
              return (
                <div
                  key={virtualRow.key}
                  className="virtual-row"
                  // Positioning wrapper only — kept out of the table semantics so
                  // the rowgroup still sees rows as its direct children.
                  role="presentation"
                  style={{ height: virtualRow.size, transform: `translateY(${virtualRow.start}px)` }}
                >
                  <FileRow
                    file={file}
                    selected={file.id === selectedId}
                    canDelete={canDelete}
                    onSelect={onSelect}
                    onDelete={onDelete}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          files.map((file) => (
            <FileRow
              key={file.id}
              file={file}
              selected={file.id === selectedId}
              canDelete={canDelete}
              onSelect={onSelect}
              onDelete={onDelete}
            />
          ))
        )}
      </div>

      {virtualize && (
        <p className="visually-hidden" role="status">
          Showing {files.length} files in a virtualised list.
        </p>
      )}
    </div>
  );
}

function Header() {
  return (
    <div className="file-head" role="row">
      {/*
       * The preview and actions headers carry their label via aria-label rather
       * than hidden text: `.visually-hidden` is absolutely positioned, which
       * would take these two out of the grid flow and shift every visible
       * column one place to the left.
       */}
      <span role="columnheader" aria-label="Preview" />
      <span role="columnheader">Name</span>
      <span role="columnheader">Status</span>
      <span role="columnheader" className="file-col-owner">
        Uploaded by
      </span>
      <span role="columnheader" className="file-col-date">
        Uploaded
      </span>
      <span role="columnheader" aria-label="Actions" />
    </div>
  );
}
