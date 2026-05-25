import { Stack } from 'expo-router';

import { useProtectedRoute } from '../../src/hooks';
import { useTheme } from '../../src/theme';

export default function StudentLayout() {
  const { colors } = useTheme();
  useProtectedRoute('student');

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
        name="course/[id]"
        options={{ headerShown: true, headerTitle: 'Course Detail', headerBackTitle: 'Back' }}
      />
      <Stack.Screen
        name="assessment/[id]"
        options={{ headerShown: true, headerTitle: 'Assessment', headerBackTitle: 'Back' }}
      />
      <Stack.Screen
        name="notifications"
        options={{ headerShown: true, headerTitle: 'Notifications', headerBackTitle: 'Back' }}
      />
    </Stack>
  );
}
