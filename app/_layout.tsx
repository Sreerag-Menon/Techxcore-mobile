import '../global.css';

import { useEffect } from 'react';
import { AppState, I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Provider } from 'react-redux';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import Toast from 'react-native-toast-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useFonts } from 'expo-font';

import { store } from '../src/redux/store';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { refreshStoredAuthToken } from '../src/api/client';
import { APP_CONFIG } from '../src/constants/config';
import { restoreSession } from '../src/redux/slices/authSlice';
import { restoreTenant } from '../src/redux/slices/tenantSlice';
import { useAppDispatch, useAppSelector } from '../src/redux/hooks';

// Keep splash screen visible until fonts, tenant and auth state are all resolved
SplashScreen.preventAutoHideAsync();

function AppNavigator() {
  const dispatch = useAppDispatch();
  const isRestoringSession = useAppSelector(
    (state) => state.auth.isRestoringSession,
  );
  const isRestoringTenant = useAppSelector(
    (state) => state.tenant.isRestoringTenant,
  );

  // Load Satoshi font slices from assets/fonts/
  const [fontsLoaded] = useFonts({
    'Satoshi-Regular': require('../assets/fonts/Satoshi-Regular.ttf'),
    'Satoshi-Medium': require('../assets/fonts/Satoshi-Medium.ttf'),
    'Satoshi-Bold': require('../assets/fonts/Satoshi-Bold.ttf'),
    'Satoshi-Black': require('../assets/fonts/Satoshi-Black.ttf'),
  });

  useEffect(() => {
    // Restore tenant config first — this sets the API base URL
    // so that restoreSession can call the correct tenant's backend
    dispatch(restoreTenant()).then(() => {
      dispatch(restoreSession());
    });
  }, [dispatch]);

  useEffect(() => {
    AsyncStorage.getItem(APP_CONFIG.DIRECTION_KEY)
      .then((saved) => {
        if (saved !== 'ltr' && saved !== 'rtl') return;
        const shouldBeRtl = saved === 'rtl';
        if (I18nManager.isRTL === shouldBeRtl) return;
        I18nManager.allowRTL(shouldBeRtl);
        I18nManager.forceRTL(shouldBeRtl);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    // Only hide splash when fonts + both redux slices are ready
    if (!isRestoringTenant && !isRestoringSession && fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [isRestoringTenant, isRestoringSession, fontsLoaded]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', async (state) => {
      if (state !== 'active') return;
      try {
        const expiresAt = Number(
          await AsyncStorage.getItem(APP_CONFIG.ACCESS_TOKEN_EXPIRES_AT_KEY),
        );
        if (expiresAt && expiresAt - Date.now() < 2 * 60 * 1000) {
          await refreshStoredAuthToken();
        }
      } catch {
        // Silent – interceptor handles hard failures on the next API call
      }
    });
    return () => sub.remove();
  }, []);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <BottomSheetModalProvider>
            <AppNavigator />
            <Toast />
          </BottomSheetModalProvider>
        </GestureHandlerRootView>
      </ThemeProvider>
    </Provider>
  );
}
