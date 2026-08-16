import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../app/store';

export type ThemePreference = 'system' | 'light' | 'dark';

export interface Toast {
  id: string;
  tone: 'success' | 'error' | 'info';
  message: string;
}

interface UiState {
  theme: ThemePreference;
  sidebarOpen: boolean;
  toasts: Toast[];
}

const THEME_KEY = 'rd.ui.theme';

function readStoredTheme(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  } catch {
    return 'system';
  }
}

const initialState: UiState = {
  theme: readStoredTheme(),
  sidebarOpen: false,
  toasts: [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<ThemePreference>) {
      state.theme = action.payload;
      try {
        localStorage.setItem(THEME_KEY, action.payload);
      } catch {
        /* preference just won't persist */
      }
    },
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    closeSidebar(state) {
      state.sidebarOpen = false;
    },
    pushToast: {
      reducer(state, action: PayloadAction<Toast>) {
        state.toasts.push(action.payload);
      },
      prepare(message: string, tone: Toast['tone'] = 'info') {
        return { payload: { id: nanoid(), message, tone } };
      },
    },
    dismissToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
    },
  },
});

export const { setTheme, toggleSidebar, closeSidebar, pushToast, dismissToast } = uiSlice.actions;

export default uiSlice.reducer;

export const selectTheme = (state: RootState) => state.ui.theme;
export const selectSidebarOpen = (state: RootState) => state.ui.sidebarOpen;
export const selectToasts = (state: RootState) => state.ui.toasts;
