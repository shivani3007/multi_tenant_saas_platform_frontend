import { useCallback, useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { endpoints } from '../api/endpoints';
import { tokenStore } from '../api/tokenStore';
import {
  deleteFile,
  fetchFiles,
  selectFile,
  selectFilesState,
  selectHasPendingFiles,
  selectSelectedFile,
  setPage,
  setPageSize,
  setSearch,
  setSort,
  setStatusFilter,
  fileStatusUpdated,
  type SortKey,
  type StatusFilter,
} from '../features/files/filesSlice';
import { enqueueUpload, startUpload } from '../features/uploads/uploadsSlice';
import { pushToast } from '../features/ui/uiSlice';
import { useAuth } from '../auth/useAuth';
import { can } from '../auth/roles';
import { env } from '../config/env';
import { useDebouncedValue } from '../utils/useDebouncedValue';
import { DropZone } from '../components/files/DropZone';
import { UploadQueue } from '../components/files/UploadQueue';
import { FileList } from '../components/files/FileList';
import { Pagination } from '../components/files/Pagination';
import { FileDetailsDrawer } from '../components/files/FileDetailsDrawer';
import { Banner } from '../components/feedback/Banner';
import { IconSearch } from '../components/icons';
import type { FileRecord } from '../api/types';

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'done', label: 'Done' },
  { value: 'failed', label: 'Failed' },
];

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'uploadedAt:desc', label: 'Newest first' },
  { value: 'uploadedAt:asc', label: 'Oldest first' }
];

export function FileManagerPage() {
  const dispatch = useAppDispatch();
  const { role } = useAuth();
  const { query, items, total, totalPages, loading, error } = useAppSelector(selectFilesState);
  const selected = useAppSelector(selectSelectedFile);
  const hasPending = useAppSelector(selectHasPendingFiles);

  const canUpload = can(role, 'files:upload');
  // Deleting a file removes tenant data, which the access matrix reserves for
  // the Owner alone — note this is NOT "admin and above".
  const canDelete = can(role, 'tenant:delete');

  const [searchInput, setSearchInput] = useState(query.search);
  const debouncedSearch = useDebouncedValue(searchInput);

  // Local input → store query. Guarded so it doesn't re-dispatch on mount.
  useEffect(() => {
    if (debouncedSearch !== query.search) dispatch(setSearch(debouncedSearch));
  }, [debouncedSearch, query.search, dispatch]);

  /*
   * One fetch per query change. Aborting on cleanup means a fast typist's
   * superseded requests are cancelled rather than racing to overwrite the list.
   */
  useEffect(() => {
    const promise = dispatch(fetchFiles());
    return () => promise.abort();
  }, [dispatch, query]);

  /*
   * File status SSE stream. This replaces the polling loop for rows still pending
   * or processing, and closes automatically when the queue is clear.
   */
  useEffect(() => {
    if (!hasPending) return;

    const isTestMode = String(import.meta.env.VITE_TEST_MODE ?? 'true').trim().toLowerCase() === 'true';
    const controller = new AbortController();
    let tenantId = ''
    if(isTestMode){
      tenantId = env.tenantId;
    }
    const accessToken = tokenStore.getAccessToken();
    const url = new URL(`${env.apiBaseUrl}${endpoints.files.statusStream}`);

    const stream = async () => {
      try {
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            Accept: 'text/event-stream',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            ...(tenantId ? { 'X-Subdomain': tenantId } : {}),
          },
          credentials: 'include',
          signal: controller.signal,
        });

        if (!response.ok || !response.body) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!controller.signal.aborted) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';

          for (const part of parts) {
            const dataLine = part
              .split('\n')
              .find((line) => line.startsWith('data:'));
            if (!dataLine) continue;

            const raw = dataLine.slice('data:'.length).trim();
            if (!raw || raw === '[DONE]') continue;

            try {
              const payload = JSON.parse(raw) as Record<string, unknown> | Array<Record<string, unknown>>;
              const updates = Array.isArray(payload) ? payload : [payload];

              for (const item of updates) {
                const id = String(item.id ?? item.fileId ?? item.file_id ?? '');
                const status = String(item.status ?? 'pending').toLowerCase();
                if (!id) continue;

                const normalizedStatus =
                  status === 'complete' || status === 'completed' || status === 'ready'
                    ? 'done'
                    : status === 'error'
                      ? 'failed'
                      : status === 'pending' || status === 'processing' || status === 'done' || status === 'failed'
                        ? status
                        : 'pending';

                dispatch(
                  fileStatusUpdated({
                    id,
                    status: normalizedStatus as FileRecord['status'],
                    thumbnailUrl: (item.thumbnailUrl ?? item.thumbnail_url ?? item.previewUrl ?? null) as string | null,
                    error: (item.error ?? item.failureReason ?? null) as string | null,
                  }),
                );
              }
            } catch {
              // Ignore malformed SSE payloads.
            }
          }
        }
      } catch {
        // Ignore the stream closing on unmount or server disconnect.
      }
    };

    void stream();

    return () => controller.abort();
  }, [hasPending, dispatch]);

  const handleFiles = useCallback(
    (files: File[]) => {
      for (const file of files) {
        const action = dispatch(enqueueUpload(file));
        const uploadId = action.payload.id;

        void dispatch(startUpload({ uploadId, file }))
          .unwrap()
          .then((result) => {
            dispatch(pushToast(`${result.file.name} uploaded — processing now.`, 'success'));
          })
          .catch((rejection: { message?: string; canceled?: boolean } | undefined) => {
            if (rejection?.canceled) return;
            dispatch(pushToast(rejection?.message ?? `${file.name} failed to upload.`, 'error'));
          });
      }
    },
    [dispatch],
  );

  const handleDelete = useCallback(
    (file: FileRecord) => {
      const confirmed = window.confirm(`Delete “${file.name}”? This cannot be undone.`);
      if (!confirmed) return;
      void dispatch(deleteFile(file.id))
        .unwrap()
        .then(() => dispatch(pushToast(`${file.name} deleted.`, 'success')))
        .catch((message: string) => dispatch(pushToast(message, 'error')));
    },
    [dispatch],
  );

  const handleSelect = useCallback((id: string) => dispatch(selectFile(id)), [dispatch]);
  const handleCloseDrawer = useCallback(() => dispatch(selectFile(null)), [dispatch]);

  return (
    <div className="stack">
      <div className="row-between">
        <div>
          <h2 className="page-title">Files</h2>
          <p className="page-subtitle">
            Upload, track processing status, and manage everything in this workspace.
          </p>
        </div>
      </div>

      {error && <Banner tone="error">{error}</Banner>}

      <DropZone
        onFiles={handleFiles}
        disabled={!canUpload}
        disabledReason="Your role can view files but not upload them."
      />

      <UploadQueue />

      <div className="toolbar">
        <div className="search-field">
          <span className="search-icon">
            <IconSearch size={16} />
          </span>
          <input
            className="input"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search files by name…"
            aria-label="Search files"
          />
        </div>

        <select
          className="select"
          style={{ width: 'auto' }}
          value={query.status}
          onChange={(event) => dispatch(setStatusFilter(event.target.value as StatusFilter))}
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          className="select"
          style={{ width: 'auto' }}
          value={query.sort}
          onChange={(event) => dispatch(setSort(event.target.value as SortKey))}
          aria-label="Sort files"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <div style={{ flex: 1 }} />

        <button
          type="button"
          className="btn btn-sm"
          onClick={() => dispatch(fetchFiles({ background: true }))}
          disabled={loading !== 'idle'}
        >
          {loading === 'refreshing' ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="file-panel">
        <FileList
          files={items}
          selectedId={selected?.id ?? null}
          canDelete={canDelete}
          loading={loading === 'loading'}
          stale={loading === 'refreshing'}
          onSelect={handleSelect}
          onDelete={handleDelete}
          emptyHint={
            query.search || query.status !== 'all'
              ? 'No files match these filters. Try clearing the search or status filter.'
              : canUpload
                ? 'Upload your first file with the drop zone above.'
                : 'Nothing has been uploaded to this workspace yet.'
          }
        />
        <Pagination
          page={query.page}
          pageSize={query.pageSize}
          total={total}
          totalPages={totalPages}
          disabled={loading === 'loading'}
          onPageChange={(page) => dispatch(setPage(page))}
          onPageSizeChange={(size) => dispatch(setPageSize(size))}
        />
      </div>

      <FileDetailsDrawer
        file={selected}
        canDelete={canDelete}
        onClose={handleCloseDrawer}
        onDelete={(file) => {
          handleDelete(file);
          handleCloseDrawer();
        }}
      />
    </div>
  );
}
