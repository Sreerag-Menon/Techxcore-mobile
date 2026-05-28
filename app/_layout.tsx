import '../global.css';

import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import Toast from 'react-native-toast-message';

import { store } from '../src/redux/store';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { restoreSession } from '../src/redux/slices/authSlice';
import { restoreTenant } from '../src/redux/slices/tenantSlice';
import { useAppDispatch, useAppSelector } from '../src/redux/hooks';

// Keep splash screen visible until both tenant and auth state are resolved
SplashScreen.preventAutoHideAsync();

function AppNavigator() {
  const dispatch = useAppDispatch();
  const isRestoringSession = useAppSelector(
    (state) => state.auth.isRestoringSession,
  );
  const isRestoringTenant = useAppSelector(
    (state) => state.tenant.isRestoringTenant,
  );

  useEffect(() => {
    // Restore tenant config first — this sets the API base URL
    // so that restoreSession can call the correct tenant's backend
    dispatch(restoreTenant()).then(() => {
      dispatch(restoreSession());
    });
  }, [dispatch]);

  useEffect(() => {
    if (!isRestoringTenant && !isRestoringSession) {
      SplashScreen.hideAsync();
    }
  }, [isRestoringTenant, isRestoringSession]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <AppNavigator />
        <Toast />
      </ThemeProvider>
    </Provider>
  );
}
