import { configureStore } from '@reduxjs/toolkit';

import assessmentReducer from './slices/assessmentSlice';
import authReducer from './slices/authSlice';
import courseReducer from './slices/courseSlice';
import notificationReducer from './slices/notificationSlice';
import parentReducer from './slices/parentSlice';
import userReducer from './slices/userSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    course: courseReducer,
    assessment: assessmentReducer,
    notification: notificationReducer,
    parent: parentReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore non-serialisable values in these action paths (e.g. Date objects)
        ignoredActions: ['auth/restoreSession/fulfilled'],
      },
    }),
});

/** Inferred root-state type */
export type RootState = ReturnType<typeof store.getState>;

/** Typed dispatch including thunk support */
export type AppDispatch = typeof store.dispatch;
