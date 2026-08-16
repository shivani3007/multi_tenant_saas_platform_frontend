/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_AUTH_MODE?: 'mock' | 'api';
  readonly VITE_TOKEN_REFRESH_SKEW_MS?: string;
  readonly VITE_FILES_PAGE_SIZE?: string;
  readonly VITE_FILE_POLL_INTERVAL_MS?: string;
  readonly VITE_VIRTUALIZE_THRESHOLD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
