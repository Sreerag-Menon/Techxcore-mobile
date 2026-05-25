import '../global.css';

import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import Toast from 'react-native-toast-message';

import { store } from '../src/redux/store';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { restoreSession } from '../src/redux/slices/authSlice';
import { useAppDispatch, useAppSelector } from '../src/redux/hooks';

// Keep splash screen visible until auth state is resolved
SplashScreen.preventAutoHideAsync();

function AppNavigator() {
  const dispatch = useAppDispatch();
  const isRestoringSession = useAppSelector(
    (state) => state.auth.isRestoringSession,
  );

  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);

  useEffect(() => {
    if (!isRestoringSession) {
      SplashScreen.hideAsync();
    }
  }, [isRestoringSession]);

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
