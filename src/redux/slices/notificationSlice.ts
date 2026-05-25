import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';

import { extractArray, post } from '../../api';
import { ENDPOINTS } from '../../api/endpoints';
import type {
  Notification,
  NotificationState,
} from '../../types/notification.types';

// --------------------------------------------------------------------------
// Initial state
// --------------------------------------------------------------------------

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
};

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function extractErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return (
    axiosError?.response?.data?.message ??
    axiosError?.message ??
    'Failed to load notifications'
  );
}

function computeUnreadCount(notifications: Notification[]): number {
  return notifications.filter((n) => !n.is_read).length;
}

// --------------------------------------------------------------------------
// Async thunks
// --------------------------------------------------------------------------

export const fetchNotifications = createAsyncThunk<
  Notification[],
  Record<string, unknown> | undefined,
  { rejectValue: string }
>('notification/fetchNotifications', async (params = {}, { rejectWithValue }) => {
  try {
    const response = await post<unknown>(ENDPOINTS.NOTIFICATION.LIST, params);
    return extractArray<Notification>(response, ['notifications', 'rows']);
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error));
  }
});

// --------------------------------------------------------------------------
// Slice
// --------------------------------------------------------------------------

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    clearNotificationError(state) {
      state.error = null;
    },
    /** Mark a single notification as read by id */
    markAsRead(state, action: PayloadAction<number>) {
      const notification = state.notifications.find(
        (n) => n.notification_id === action.payload,
      );
      if (notification) {
        notification.is_read = true;
        state.unreadCount = computeUnreadCount(state.notifications);
      }
    },
    /** Mark all notifications as read */
    markAllAsRead(state) {
      state.notifications.forEach((n) => {
        n.is_read = true;
      });
      state.unreadCount = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notifications = action.payload;
        state.unreadCount = computeUnreadCount(action.payload);
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to load notifications';
      });
  },
});

export const { clearNotificationError, markAsRead, markAllAsRead } =
  notificationSlice.actions;
export default notificationSlice.reducer;
