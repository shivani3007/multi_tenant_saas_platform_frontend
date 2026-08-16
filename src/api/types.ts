/** Domain types. These describe the shapes the *app* works with. */

/** Ordered least → most privileged. The order is load-bearing: see `roles.ts`. */
export const ROLES = ['Viewer', 'Editor', 'Admin', 'Owner'] as const;
export type Role = (typeof ROLES)[number];

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  tenantId?: string | null;
  role: Role;
  avatarUrl?: string | null;
  status: 'active' | 'invited' | 'suspended';
  lastActiveAt?: string | null;
  createdAt?: string | null;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan?: string | null;
  storageQuotaBytes?: number | null;
  logoUrl?: string | null;
}

export const FILE_STATUSES = ['pending', 'processing', 'done', 'failed'] as const;
export type FileStatus = (typeof FILE_STATUSES)[number];

export interface FileRecord {
  id: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  status: FileStatus;
  /** Present once the server has generated one; images only. */
  thumbnailUrl?: string | null;
  downloadUrl?: string | null;
  uploadedAt: string;
  uploadedBy?: { id: string; name: string } | null;
  /** Set when status === 'failed'. */
  error?: string | null;
}

/** Server-side pagination envelope. `items` is one page, never the whole set. */
export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface MetricsSummary {
  totalFiles: number;
  storageUsedBytes: number;
  activeUsers: number;
  jobsQueued: number;
  /** Optional period-over-period deltas, as fractions (0.12 === +12%). */
  deltas?: Partial<Record<'totalFiles' | 'storageUsedBytes' | 'activeUsers' | 'jobsQueued', number>>;
}

/** One point of "files uploaded per day". */
export interface DailyUploadPoint {
  /** ISO date, `YYYY-MM-DD`. */
  date: string;
  count: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string | null;
  /** Epoch ms. Derived from the JWT `exp` when the server doesn't send one. */
  expiresAt: number | null;
}

export interface Session {
  user: User;
  tenant: Tenant;
  tokens: AuthTokens;
}

export interface UserSettings {
  name: string;
  email: string;
  theme: 'system' | 'light' | 'dark';
  notifyOnUploadComplete: boolean;
  notifyOnUploadFailed: boolean;
  defaultPageSize: number;
}
