import { configureStore } from '@reduxjs/toolkit';

import assessmentReducer from './slices/assessmentSlice';
import authReducer from './slices/authSlice';
import courseReducer from './slices/courseSlice';
import dashboardReducer from './slices/dashboardSlice';
import menuReducer from './slices/menuSlice';
import notificationReducer from './slices/notificationSlice';
import parentReducer from './slices/parentSlice';
import playerReducer from './slices/playerSlice';
import tenantReducer from './slices/tenantSlice';
import userReducer from './slices/userSlice';
import { playerApi } from './api/playerApi';

export const store = configureStore({
  reducer: {
    tenant: tenantReducer,
    auth: authReducer,
    user: userReducer,
    course: courseReducer,
    dashboard: dashboardReducer,
    menu: menuReducer,
    assessment: assessmentReducer,
    notification: notificationReducer,
    parent: parentReducer,
    player: playerReducer,
    [playerApi.reducerPath]: playerApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore non-serialisable values in these action paths (e.g. Date objects)
        ignoredActions: [
          'auth/restoreSession/fulfilled',
          'tenant/restoreTenant/fulfilled',
        ],
      },
    }).concat(playerApi.middleware),
});

/** Inferred root-state type */
export type RootState = ReturnType<typeof store.getState>;

/** Typed dispatch including thunk support */
export type AppDispatch = typeof store.dispatch;
