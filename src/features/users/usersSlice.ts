import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { usersApi } from '../../api/services/users';
import { ApiError } from '../../api/http';
import type { Role, User } from '../../api/types';
import type { RootState } from '../../app/store';

interface UsersState {
  items: User[];
  page: number;
  pageSize: number;
  search: string;
  total: number;
  totalPages: number;
  loading: 'idle' | 'loading' | 'refreshing';
  error: string | null;
  /** Ids with a role change or removal in flight, so their row can show a spinner. */
  mutatingIds: string[];
}

const initialState: UsersState = {
  items: [],
  page: 1,
  pageSize: 25,
  search: '',
  total: 0,
  totalPages: 1,
  loading: 'idle',
  error: null,
  mutatingIds: [],
};

export const fetchUsers = createAsyncThunk<
  { items: User[]; total: number; totalPages: number; page: number },
  { background?: boolean } | undefined,
  { state: RootState; rejectValue: string }
>('users/fetch', async (_arg, { getState, signal, rejectWithValue }) => {
  const { page, pageSize, search } = getState().users;
  try {
    const result = await usersApi.list({ page, pageSize, search, signal });
    return { items: result.items, total: result.total, totalPages: result.totalPages, page: result.page };
  } catch (error) {
    return rejectWithValue(error instanceof ApiError ? error.message : 'Could not load users.');
  }
});

export const inviteUser = createAsyncThunk<
  User,
  { email: string; firstName: string; lastName: string; role: Role },
  { rejectValue: string }
>('users/invite', async (input, { rejectWithValue }) => {
  try {
    return await usersApi.invite(input);
  } catch (error) {
    return rejectWithValue(error instanceof ApiError ? error.message : 'Could not send the invite.');
  }
});

export const changeUserRole = createAsyncThunk<User, { id: string; role: Role }, { rejectValue: string }>(
  'users/changeRole',
  async ({ id, role }, { rejectWithValue }) => {
    try {
      return await usersApi.updateRole(id, role);
    } catch (error) {
      return rejectWithValue(error instanceof ApiError ? error.message : 'Could not update the role.');
    }
  },
);

export const removeUser = createAsyncThunk<string, string, { rejectValue: string }>(
  'users/remove',
  async (id, { rejectWithValue }) => {
    try {
      await usersApi.remove(id);
      return id;
    } catch (error) {
      return rejectWithValue(error instanceof ApiError ? error.message : 'Could not remove the user.');
    }
  },
);

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    setUserSearch(state, action: PayloadAction<string>) {
      state.search = action.payload;
      state.page = 1;
    },
    setUsersPage(state, action: PayloadAction<number>) {
      state.page = Math.max(1, action.payload);
    },
    clearUsersError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state, action) => {
        state.loading = action.meta.arg?.background ? 'refreshing' : 'loading';
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = 'idle';
        state.items = action.payload.items;
        state.total = action.payload.total;
        state.totalPages = action.payload.totalPages;
        state.page = action.payload.page;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = 'idle';
        if (action.meta.aborted) return;
        state.error = action.payload ?? 'Could not load users.';
      })
      .addCase(inviteUser.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
        state.total += 1;
      })
      .addCase(inviteUser.rejected, (state, action) => {
        state.error = action.payload ?? 'Could not send the invite.';
      })
      .addCase(changeUserRole.pending, (state, action) => {
        state.mutatingIds.push(action.meta.arg.id);
      })
      .addCase(changeUserRole.fulfilled, (state, action) => {
        state.mutatingIds = state.mutatingIds.filter((id) => id !== action.payload.id);
        const index = state.items.findIndex((user) => user.id === action.payload.id);
        if (index !== -1) state.items[index] = action.payload;
      })
      .addCase(changeUserRole.rejected, (state, action) => {
        state.mutatingIds = state.mutatingIds.filter((id) => id !== action.meta.arg.id);
        state.error = action.payload ?? 'Could not update the role.';
      })
      .addCase(removeUser.pending, (state, action) => {
        state.mutatingIds.push(action.meta.arg);
      })
      .addCase(removeUser.fulfilled, (state, action) => {
        state.mutatingIds = state.mutatingIds.filter((id) => id !== action.payload);
        state.items = state.items.filter((user) => user.id !== action.payload);
        state.total = Math.max(0, state.total - 1);
      })
      .addCase(removeUser.rejected, (state, action) => {
        state.mutatingIds = state.mutatingIds.filter((id) => id !== action.meta.arg);
        state.error = action.payload ?? 'Could not remove the user.';
      });
  },
});

export const { setUserSearch, setUsersPage, clearUsersError } = usersSlice.actions;

export default usersSlice.reducer;

export const selectUsersState = (state: RootState) => state.users;
