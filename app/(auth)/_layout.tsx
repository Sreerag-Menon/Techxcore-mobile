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
        // Transparent so AuthShell gradient shows through during transition
        contentStyle: { backgroundColor: 'transparent' },
        // Smooth directional slide — same as Framer's page transition default
        animation: 'slide_from_right',
        animationDuration: 280,
        // Prevent flash of background color during transition
        presentation: 'card',
      }}
    >
      <Stack.Screen name="select-tenant" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen
        name="forgot-password"
        options={{
          headerShown: false, // We use our own back button in AuthShell
        }}
      />
    </Stack>
  );
}
