import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { metricsApi } from '../../api/services/metrics';
import { ApiError } from '../../api/http';
import type { DailyUploadPoint, MetricsSummary } from '../../api/types';
import type { RootState } from '../../app/store';

interface MetricsState {
  summary: MetricsSummary | null;
  daily: DailyUploadPoint[];
  loading: 'idle' | 'loading' | 'refreshing';
  error: string | null;
  lastLoadedAt: number | null;
}

const initialState: MetricsState = {
  summary: null,
  daily: [],
  loading: 'idle',
  error: null,
  lastLoadedAt: null,
};

/** The dashboard needs both payloads to render; one thunk keeps them in step. */
export const fetchDashboard = createAsyncThunk<
  { summary: MetricsSummary; daily: DailyUploadPoint[] },
  { days?: number } | undefined,
  { rejectValue: string }
>('metrics/fetchDashboard', async (arg, { signal, rejectWithValue }) => {
  const days = arg?.days ?? 30;
  try {
    const [summary, daily] = await Promise.all([
      metricsApi.summary(signal),
      metricsApi.uploadsDaily(days, signal),
    ]);
    return { summary, daily };
  } catch (error) {
    return rejectWithValue(error instanceof ApiError ? error.message : 'Could not load dashboard metrics.');
  }
});

const metricsSlice = createSlice({
  name: 'metrics',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboard.pending, (state) => {
        // Hold the previous render on refetch instead of flashing a skeleton.
        state.loading = state.summary ? 'refreshing' : 'loading';
        state.error = null;
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.loading = 'idle';
        state.summary = action.payload.summary;
        state.daily = action.payload.daily;
        state.lastLoadedAt = Date.now();
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.loading = 'idle';
        if (action.meta.aborted) return;
        state.error = action.payload ?? 'Could not load dashboard metrics.';
      });
  },
});

export default metricsSlice.reducer;

export const selectMetrics = (state: RootState) => state.metrics;
