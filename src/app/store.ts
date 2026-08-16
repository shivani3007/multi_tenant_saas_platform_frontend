import { configureStore } from '@reduxjs/toolkit';
import filesReducer from '../features/files/filesSlice';
import uploadsReducer from '../features/uploads/uploadsSlice';
import usersReducer from '../features/users/usersSlice';
import metricsReducer from '../features/metrics/metricsSlice';
import uiReducer from '../features/ui/uiSlice';

export const store = configureStore({
  reducer: {
    files: filesReducer,
    uploads: uploadsReducer,
    users: usersReducer,
    metrics: metricsReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // `File` objects ride along in the thunk arg only; they are never stored.
        ignoredActionPaths: ['meta.arg.file'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
