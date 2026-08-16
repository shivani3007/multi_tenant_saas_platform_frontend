import { http, toApiError } from '../http';
import { endpoints } from '../endpoints';
import { adaptUser } from './auth';
import type { Page, Role, User } from '../types';

export interface ListUsersParams {
  page: number;
  pageSize: number;
  search?: string;
  signal?: AbortSignal;
}

/** ── Adapt to your API here ── mirrors the files pagination envelope. */
function adaptPage(payload: unknown, requestedPage: number, requestedSize: number): Page<User> {
  if (Array.isArray(payload)) {
    const items = payload.map(adaptUser);
    return { items, page: 1, pageSize: items.length, total: items.length, totalPages: 1 };
  }

  const data = (payload ?? {}) as Record<string, any>;
  const rawItems: unknown[] = data.items ?? data.data ?? data.results ?? data.users ?? [];
  const meta = (data.meta ?? data.pagination ?? data) as Record<string, any>;

  const total = Number(meta.total ?? meta.totalCount ?? meta.count ?? rawItems.length) || 0;
  const pageSize = Number(meta.pageSize ?? meta.per_page ?? meta.limit ?? requestedSize) || requestedSize;
  const page = Number(meta.page ?? meta.currentPage ?? requestedPage) || requestedPage;
  const totalPages = Number(meta.totalPages ?? meta.pageCount) || Math.max(1, Math.ceil(total / pageSize));

  return { items: rawItems.map(adaptUser), page, pageSize, total, totalPages };
}

export const usersApi = {
  async list({ page, pageSize, search, signal }: ListUsersParams): Promise<Page<User>> {
    try {
      const { data } = await http.get<unknown>(endpoints.users.list, {
        signal,
        params: { page, pageSize, ...(search ? { search } : {}) },
      });
      return adaptPage(data, page, pageSize);
    } catch (error) {
      throw toApiError(error);
    }
  },

  async invite(input: { email: string; firstName: string; lastName: string; role: Role }): Promise<User> {
    try {
      const body = {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
      };
      const { data } = await http.post<unknown>(endpoints.users.create, body);
      return adaptUser(data);
    } catch (error) {
      throw toApiError(error);
    }
  },

  async updateRole(id: string, role: Role): Promise<User> {
    try {
      const { data } = await http.patch<unknown>(endpoints.users.byId(id), { role });
      return adaptUser(data);
    } catch (error) {
      throw toApiError(error);
    }
  },

  async remove(id: string): Promise<void> {
    try {
      await http.delete(endpoints.users.byId(id));
    } catch (error) {
      throw toApiError(error);
    }
  },
};
