import { Stack } from 'expo-router';

import { useProtectedRoute } from '../../src/hooks';
import { useTheme } from '../../src/theme';

export default function AuthLayout() {
  const { colors } = useTheme();
  useProtectedRoute();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen
        name="forgot-password"
        options={{
          headerShown: true,
          headerTitle: 'Forgot Password',
          headerBackTitle: 'Back',
        }}
      />
    </Stack>
  );
}
