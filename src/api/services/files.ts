import { http, toApiError } from '../http';
import { endpoints } from '../endpoints';
import { FILE_STATUSES, type FileRecord, type FileStatus, type Page } from '../types';

export interface ListFilesParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: FileStatus | 'all';
  sort?: string;
  signal?: AbortSignal;
}

/** ── Adapt to your API here ── */
export function adaptFile(payload: unknown): FileRecord {
  const data = (payload ?? {}) as Record<string, any>;
  console.log("data : ",data)
  const rawStatus = String(data.status ?? 'pending').toLowerCase();
  const uploader = data.uploadedBy ?? data.owner ?? data.uploader ?? null;

  return {
    id: String(data._id ?? data.fileId ?? ''),
    name: String(data.name ?? data.filename ?? data.originalName ?? 'Untitled'),
    sizeBytes: Number(data.sizeBytes ?? data.size ?? 0) || 0,
    mimeType: String(data.mimeType ?? data.contentType ?? data.type ?? 'application/octet-stream'),
    status: (FILE_STATUSES as readonly string[]).includes(rawStatus)
      ? (rawStatus as FileStatus)
      : rawStatus === 'processed' ? 'done' : rawStatus === 'failed' ? 'failed' : 'pending',
    thumbnailUrl: data.thumbnailUrl ?? data.thumbnail_url ?? data.previewUrl ?? null,
    downloadUrl: data.downloadUrl ?? data.url ?? null,
    uploadedAt: String(data.uploadedAt ?? data.createdAt ?? data.created_at ?? new Date(0).toISOString()),
    uploadedBy: uploader ? { id: String(uploader._id ?? ''), name: String(uploader.firstName ?? uploader.email ?? '—') } : null,
    error: data.error ?? data.failureReason ?? null, 
  };
}

/**
 * ── Adapt to your API here ──
 * Reads the pagination envelope. Handles the three common spellings:
 * `{items,total}`, `{data,meta:{total}}`, and a bare array (single page).
 */
function adaptPage(payload: unknown, requestedPage: number, requestedSize: number): Page<FileRecord> {
  if (Array.isArray(payload)) {
    const items = payload.map(adaptFile);
    return { items, page: 1, pageSize: items.length, total: items.length, totalPages: 1 };
  }

  const data = (payload ?? {}) as Record<string, any>;
  const rawItems: unknown[] = data.items ?? data.data ?? data.results ?? data.files ?? [];
  const meta = (data.meta ?? data.pagination ?? data) as Record<string, any>;

  const total = Number(meta.total ?? meta.totalCount ?? meta.count ?? rawItems.length) || 0;
  const pageSize = Number(meta.pageSize ?? meta.per_page ?? meta.limit ?? requestedSize) || requestedSize;
  const page = Number(meta.page ?? meta.currentPage ?? requestedPage) || requestedPage;
  const totalPages = Number(meta.totalPages ?? meta.pageCount) || Math.max(1, Math.ceil(total / pageSize));

  return { items: rawItems.map(adaptFile), page, pageSize, total, totalPages };
}

export const filesApi = {
  /**
   * Server-side pagination: the server returns exactly one page. Nothing here
   * slices a bigger client-side array.
   */
  async list({ page, pageSize, search, status, sort, signal }: ListFilesParams): Promise<Page<FileRecord>> {
    try {
      const { data } = await http.get<unknown>(endpoints.files.list, {
        signal,
        params: {
          page,
          pageSize,
          ...(search ? { name: search } : {}),
          ...(status && status !== 'all' ? { status } : {}),
          ...(sort ? { sort } : {}),
        },
      });
      return adaptPage(data, page, pageSize);
    } catch (error) {
      throw toApiError(error);
    }
  },

  /**
   * Multipart upload with byte-level progress.
   * `onProgress` receives 0–100; it is called from Axios' XHR progress events.
   */
  async upload(
    file: File,
    options: { onProgress?: (percent: number) => void; signal?: AbortSignal } = {},
  ): Promise<FileRecord> {
    const body = new FormData();
    body.append('file', file, file.name);

    try {
      const { data } = await http.post<unknown>(endpoints.files.upload, body, {
        signal: options.signal,
        onUploadProgress: (event) => {
          if (!options.onProgress) return;
          // `total` is absent on some proxies; fall back to the File's own size.
          const total = event.total ?? file.size;
          if (!total) return;
          options.onProgress(Math.min(100, Math.round((event.loaded / total) * 100)));
        },
      });
      return adaptFile(data);
    } catch (error) {
      throw toApiError(error);
    }
  },

  /** Bulk status refresh for the rows that are still pending/processing. */
  async statuses(ids: string[], signal?: AbortSignal): Promise<Array<Pick<FileRecord, 'id' | 'status' | 'thumbnailUrl' | 'error'>>> {
    if (ids.length === 0) return [];
    try {
      const { data } = await http.get<unknown>(endpoints.files.statuses, {
        signal,
        params: { ids: ids.join(',') },
      });
      const rows: unknown[] = Array.isArray(data) ? data : ((data as Record<string, any>)?.items ?? []);
      return rows.map((row) => {
        const file = adaptFile(row);
        return { id: file.id, status: file.status, thumbnailUrl: file.thumbnailUrl, error: file.error };
      });
    } catch (error) {
      throw toApiError(error);
    }
  },

  async remove(id: string): Promise<void> {
    try {
      await http.delete(endpoints.files.byId(id));
    } catch (error) {
      throw toApiError(error);
    }
  },
};
