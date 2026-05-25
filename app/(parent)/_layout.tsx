import { Stack } from 'expo-router';

import { useProtectedRoute } from '../../src/hooks';
import { useTheme } from '../../src/theme';

export default function ParentLayout() {
  const { colors } = useTheme();
  useProtectedRoute('parent');

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="child/[id]"
        options={{ headerShown: true, headerTitle: 'Child Detail', headerBackTitle: 'Back' }}
      />
    </Stack>
  );
}
