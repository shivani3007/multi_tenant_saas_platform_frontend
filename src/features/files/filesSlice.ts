import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { filesApi } from '../../api/services/files';
import { ApiError } from '../../api/http';
import { env } from '../../config/env';
import type { FileRecord, FileStatus } from '../../api/types';
import type { RootState } from '../../app/store';

export type StatusFilter = FileStatus | 'all';
export type SortKey = 'uploadedAt:desc' | 'uploadedAt:asc' | 'name:asc' | 'name:desc' | 'size:desc' | 'size:asc';

export interface FilesQuery {
  page: number;
  pageSize: number;
  search: string;
  status: StatusFilter;
  sort: SortKey;
}

interface FilesState {
  query: FilesQuery;
  items: FileRecord[];
  total: number;
  totalPages: number;
  /** 'refreshing' is a background reload — the previous page stays on screen. */
  loading: 'idle' | 'loading' | 'refreshing';
  error: string | null;
  selectedId: string | null;
}

const initialState: FilesState = {
  query: {
    page: 1,
    pageSize: env.filesPageSize,
    search: '',
    status: 'all',
    sort: 'uploadedAt:desc',
  },
  items: [],
  total: 0,
  totalPages: 1,
  loading: 'idle',
  error: null,
  selectedId: null,
};

/**
 * Fetches one server page. `background: true` keeps the current rows visible
 * (used by the status poller and by refresh-after-upload) so the list never
 * flashes a skeleton over data the user is already reading.
 */
export const fetchFiles = createAsyncThunk<
  { items: FileRecord[]; total: number; totalPages: number; page: number },
  { background?: boolean } | undefined,
  { state: RootState; rejectValue: string }
>('files/fetch', async (_arg, { getState, signal, rejectWithValue }) => {
  const { query } = getState().files;
  try {
    const page = await filesApi.list({ ...query, signal });
    return { items: page.items, total: page.total, totalPages: page.totalPages, page: page.page };
  } catch (error) {
    return rejectWithValue(error instanceof ApiError ? error.message : 'Could not load files.');
  }
});

/** Re-polls only the rows that can still change, then patches them in place. */
export const pollFileStatuses = createAsyncThunk<
  Array<Pick<FileRecord, 'id' | 'status' | 'thumbnailUrl' | 'error'>>,
  void,
  { state: RootState }
>(
  'files/pollStatuses',
  async (_arg, { getState, signal }) => {
    const ids = getState()
      .files.items.filter((file) => file.status === 'pending' || file.status === 'processing')
      .map((file) => file.id);
    return filesApi.statuses(ids, signal);
  },
  {
    // Skip the round-trip entirely when nothing is in flight.
    condition: (_arg, { getState }) =>
      getState().files.items.some((file) => file.status === 'pending' || file.status === 'processing'),
  },
);

export const deleteFile = createAsyncThunk<string, string, { rejectValue: string }>(
  'files/delete',
  async (id, { rejectWithValue }) => {
    try {
      await filesApi.remove(id);
      return id;
    } catch (error) {
      return rejectWithValue(error instanceof ApiError ? error.message : 'Could not delete the file.');
    }
  },
);

const filesSlice = createSlice({
  name: 'files',
  initialState,
  reducers: {
    /** Any filter change resets to page 1 — staying on page 7 of a new result set is a bug. */
    setSearch(state, action: PayloadAction<string>) {
      state.query.search = action.payload;
      state.query.page = 1;
    },
    setStatusFilter(state, action: PayloadAction<StatusFilter>) {
      state.query.status = action.payload;
      state.query.page = 1;
    },
    setSort(state, action: PayloadAction<SortKey>) {
      state.query.sort = action.payload;
      state.query.page = 1;
    },
    setPage(state, action: PayloadAction<number>) {
      state.query.page = Math.max(1, action.payload);
    },
    setPageSize(state, action: PayloadAction<number>) {
      state.query.pageSize = action.payload;
      state.query.page = 1;
    },
    selectFile(state, action: PayloadAction<string | null>) {
      state.selectedId = action.payload;
    },
    /** Called when an upload finishes so the new row appears without a full refetch. */
    fileUploaded(state, action: PayloadAction<FileRecord>) {
      const onFirstPage = state.query.page === 1;
      const alreadyListed = state.items.some((file) => file.id === action.payload.id);
      if (onFirstPage && !alreadyListed) {
        state.items.unshift(action.payload);
        if (state.items.length > state.query.pageSize) state.items.pop();
      }
      state.total += 1;
      state.totalPages = Math.max(1, Math.ceil(state.total / state.query.pageSize));
    },
    fileStatusUpdated(
      state,
      action: PayloadAction<Pick<FileRecord, 'id' | 'status' | 'thumbnailUrl' | 'error'>>,
    ) {
      const row = state.items.find((file) => file.id === action.payload.id);
      if (!row) return;
      row.status = action.payload.status;
      row.thumbnailUrl = action.payload.thumbnailUrl ?? row.thumbnailUrl;
      row.error = action.payload.error ?? null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFiles.pending, (state, action) => {
        state.loading = action.meta.arg?.background ? 'refreshing' : 'loading';
        state.error = null;
      })
      .addCase(fetchFiles.fulfilled, (state, action) => {
        state.loading = 'idle';
        state.items = action.payload.items;
        state.total = action.payload.total;
        state.totalPages = action.payload.totalPages;
        state.query.page = action.payload.page;
      })
      .addCase(fetchFiles.rejected, (state, action) => {
        state.loading = 'idle';
        // An aborted request is a superseded query, not a failure worth showing.
        if (action.meta.aborted) return;
        state.error = action.payload ?? 'Could not load files.';
      })
      .addCase(pollFileStatuses.fulfilled, (state, action) => {
        for (const update of action.payload) {
          const row = state.items.find((file) => file.id === update.id);
          if (!row) continue;
          row.status = update.status;
          row.thumbnailUrl = update.thumbnailUrl ?? row.thumbnailUrl;
          row.error = update.error ?? null;
        }
      })
      .addCase(deleteFile.fulfilled, (state, action) => {
        state.items = state.items.filter((file) => file.id !== action.payload);
        state.total = Math.max(0, state.total - 1);
        if (state.selectedId === action.payload) state.selectedId = null;
      });
    // deleteFile.rejected deliberately has no reducer: the page surfaces that
    // failure as a toast, and setting `error` here would show it twice.
  },
});

export const {
  setSearch,
  setStatusFilter,
  setSort,
  setPage,
  setPageSize,
  selectFile,
  fileUploaded,
  fileStatusUpdated,
} = filesSlice.actions;

export default filesSlice.reducer;

// ── Selectors ───────────────────────────────────────────────────────────────
export const selectFilesState = (state: RootState) => state.files;
export const selectFileItems = (state: RootState) => state.files.items;
export const selectFilesQuery = (state: RootState) => state.files.query;
export const selectSelectedFile = (state: RootState) =>
  state.files.items.find((file) => file.id === state.files.selectedId) ?? null;
/** Drives the poller: no in-flight work, no interval. */
export const selectHasPendingFiles = (state: RootState) =>
  state.files.items.some((file) => file.status === 'pending' || file.status === 'processing');
