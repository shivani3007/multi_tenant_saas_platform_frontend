import { http, toApiError } from '../http';
import { endpoints } from '../endpoints';
import { adaptTenant } from './auth';
import type { Tenant, UserSettings } from '../types';

/** ── Adapt to your API here ── */
function adaptSettings(payload: unknown): UserSettings {
  const data = (payload ?? {}) as Record<string, any>;
  const theme = String(data.theme ?? 'system');
  return {
    name: String(data.name ?? ''),
    email: String(data.email ?? ''),
    theme: theme === 'light' || theme === 'dark' ? theme : 'system',
    notifyOnUploadComplete: data.notifyOnUploadComplete !== false,
    notifyOnUploadFailed: data.notifyOnUploadFailed !== false,
    defaultPageSize: Number(data.defaultPageSize ?? 50) || 50,
  };
}

export const settingsApi = {
  async get(signal?: AbortSignal): Promise<UserSettings> {
    try {
      const { data } = await http.get<unknown>(endpoints.settings.me, { signal });
      return adaptSettings(data);
    } catch (error) {
      throw toApiError(error);
    }
  },

  async update(patch: Partial<UserSettings>): Promise<UserSettings> {
    try {
      const { data } = await http.patch<unknown>(endpoints.settings.me, patch);
      return adaptSettings(data);
    } catch (error) {
      throw toApiError(error);
    }
  },

  async updateTenant(patch: Partial<Pick<Tenant, 'name'>>): Promise<Tenant> {
    try {
      const { data } = await http.patch<unknown>(endpoints.settings.tenant, patch);
      return adaptTenant(data);
    } catch (error) {
      throw toApiError(error);
    }
  },
};
