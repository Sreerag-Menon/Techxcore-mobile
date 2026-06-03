import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';

import { asNumber, asString, extractArray, post } from '../../api';
import { ENDPOINTS } from '../../api/endpoints';
import type { RootState } from '../store';
import type { MenuItem, MenuState } from '../../types/menu.types';

const initialState: MenuState = {
  items: [],
  isLoading: false,
  error: null,
};

function extractErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return (
    axiosError?.response?.data?.message ??
    axiosError?.message ??
    'Failed to load menu'
  );
}

function mapMenuItem(row: unknown): MenuItem | null {
  const record = row as Record<string, unknown>;
  const menu_id = asNumber(record.menu_id, Number.NaN);
  const menu_name = asString(record.menu_name, '').trim();

  if (!Number.isFinite(menu_id) || !menu_name) return null;

  return {
    menu_id,
    screen_id: asNumber(record.screen_id, 0) || undefined,
    menu_name,
    route: asString(record.route, ''),
    logo: asString(record.logo, '') || undefined,
    parent_id: asNumber(record.parent_id, 0) || undefined,
    has_children: record.has_children as boolean | number | undefined,
    permissions: asString(record.permissions, '') || undefined,
    non_link: record.non_link as boolean | number | undefined,
    home: record.home as boolean | number | undefined,
    hidden: record.hidden as boolean | number | undefined,
  };
}

export const fetchMenuItems = createAsyncThunk<
  MenuItem[],
  void,
  { rejectValue: string; state: RootState }
>('menu/fetchMenuItems', async (_, { rejectWithValue, getState }) => {
  const user = getState().auth.user;

  try {
    const response = await post<unknown>(ENDPOINTS.USER.MENU, {
      newUser: 0,
      academicYearId: user?.acad_year_id,
      roleId: user?.role_id,
    });

    return extractArray(response)
      .map(mapMenuItem)
      .filter((item): item is MenuItem => item != null);
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error));
  }
});

const menuSlice = createSlice({
  name: 'menu',
  initialState,
  reducers: {
    clearMenuError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMenuItems.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMenuItems.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchMenuItems.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to load menu';
      });
  },
});

export const { clearMenuError } = menuSlice.actions;
export default menuSlice.reducer;
