import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { filesApi } from '../../api/services/files';
import { ApiError } from '../../api/http';
import { fileUploaded } from '../files/filesSlice';
import type { FileRecord } from '../../api/types';
import type { RootState } from '../../app/store';

export type UploadStatus = 'queued' | 'uploading' | 'done' | 'failed' | 'canceled';

export interface UploadItem {
  /** Client-side id. The server's file id lands in `fileId` once the upload lands. */
  id: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  progress: number;
  status: UploadStatus;
  error: string | null;
  /** Object URL for an instant local preview — images only, revoked on clear. */
  previewUrl: string | null;
  fileId: string | null;
}

/**
 * Non-serialisable handles never enter the store. Redux holds the description of
 * each upload; these maps hold the machinery.
 */
const controllers = new Map<string, AbortController>();
const objectUrls = new Map<string, string>();

interface UploadsState {
  items: UploadItem[];
}

const initialState: UploadsState = { items: [] };

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `u_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export const startUpload = createAsyncThunk<
  { uploadId: string; file: FileRecord },
  { uploadId: string; file: File },
  { state: RootState; rejectValue: { uploadId: string; message: string; canceled: boolean } }
>('uploads/start', async ({ uploadId, file }, { dispatch, rejectWithValue }) => {
  const controller = new AbortController();
  controllers.set(uploadId, controller);

  try {
    const record = await filesApi.upload(file, {
      signal: controller.signal,
      onProgress: (percent) => dispatch(uploadProgress({ id: uploadId, progress: percent })),
    });
    // Put the row in the list immediately; the poller takes it from pending → done.
    dispatch(fileUploaded(record));
    return { uploadId, file: record };
  } catch (error) {
    const canceled = controller.signal.aborted;
    return rejectWithValue({
      uploadId,
      message: canceled ? 'Upload canceled.' : error instanceof ApiError ? error.message : 'Upload failed.',
      canceled,
    });
  } finally {
    controllers.delete(uploadId);
  }
});

const uploadsSlice = createSlice({
  name: 'uploads',
  initialState,
  reducers: {
    /** `prepare` mints the id and the preview URL so the caller stays a one-liner. */
    enqueueUpload: {
      reducer(state, action: PayloadAction<UploadItem>) {
        state.items.unshift(action.payload);
      },
      prepare(file: File) {
        const id = newId();
        let previewUrl: string | null = null;
        if (file.type.startsWith('image/')) {
          previewUrl = URL.createObjectURL(file);
          objectUrls.set(id, previewUrl);
        }
        return {
          payload: {
            id,
            name: file.name,
            sizeBytes: file.size,
            mimeType: file.type || 'application/octet-stream',
            progress: 0,
            status: 'queued' as UploadStatus,
            error: null,
            previewUrl,
            fileId: null,
          },
        };
      },
    },
    uploadProgress(state, action: PayloadAction<{ id: string; progress: number }>) {
      const item = state.items.find((upload) => upload.id === action.payload.id);
      if (!item) return;
      item.progress = action.payload.progress;
      if (item.status === 'queued') item.status = 'uploading';
    },
    cancelUpload(state, action: PayloadAction<string>) {
      controllers.get(action.payload)?.abort();
      const item = state.items.find((upload) => upload.id === action.payload);
      if (item && (item.status === 'queued' || item.status === 'uploading')) {
        item.status = 'canceled';
        item.error = 'Upload canceled.';
      }
    },
    dismissUpload(state, action: PayloadAction<string>) {
      releaseObjectUrl(action.payload);
      state.items = state.items.filter((upload) => upload.id !== action.payload);
    },
    /** Clears everything that has finished, leaving in-flight uploads alone. */
    clearFinishedUploads(state) {
      for (const item of state.items) {
        if (item.status !== 'uploading' && item.status !== 'queued') releaseObjectUrl(item.id);
      }
      state.items = state.items.filter((upload) => upload.status === 'uploading' || upload.status === 'queued');
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(startUpload.pending, (state, action) => {
        const item = state.items.find((upload) => upload.id === action.meta.arg.uploadId);
        if (item) item.status = 'uploading';
      })
      .addCase(startUpload.fulfilled, (state, action) => {
        const item = state.items.find((upload) => upload.id === action.payload.uploadId);
        if (!item) return;
        item.status = 'done';
        item.progress = 100;
        item.fileId = action.payload.file.id;
        item.error = null;
      })
      .addCase(startUpload.rejected, (state, action) => {
        const uploadId = action.payload?.uploadId ?? action.meta.arg.uploadId;
        const item = state.items.find((upload) => upload.id === uploadId);
        if (!item) return;
        item.status = action.payload?.canceled ? 'canceled' : 'failed';
        item.error = action.payload?.message ?? 'Upload failed.';
      });
  },
});

function releaseObjectUrl(id: string): void {
  const url = objectUrls.get(id);
  if (!url) return;
  URL.revokeObjectURL(url);
  objectUrls.delete(id);
}

export const { enqueueUpload, uploadProgress, cancelUpload, dismissUpload, clearFinishedUploads } =
  uploadsSlice.actions;

export default uploadsSlice.reducer;

// ── Selectors ───────────────────────────────────────────────────────────────
export const selectUploads = (state: RootState) => state.uploads.items;
export const selectActiveUploads = (state: RootState) =>
  state.uploads.items.filter((upload) => upload.status === 'uploading' || upload.status === 'queued');
/** Aggregate bar across the whole batch, weighted by byte count rather than file count. */
export const selectOverallUploadProgress = (state: RootState): number | null => {
  const active = state.uploads.items.filter((upload) => upload.status === 'uploading' || upload.status === 'queued');
  if (active.length === 0) return null;
  const totalBytes = active.reduce((sum, upload) => sum + upload.sizeBytes, 0);
  if (totalBytes === 0) return 0;
  const sentBytes = active.reduce((sum, upload) => sum + (upload.sizeBytes * upload.progress) / 100, 0);
  return Math.round((sentBytes / totalBytes) * 100);
};
