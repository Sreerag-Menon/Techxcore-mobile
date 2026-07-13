import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

export default function ProfileStackLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Back',
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="password" options={{ title: 'Change Password' }} />
      <Stack.Screen name="language" options={{ title: 'Language' }} />
      <Stack.Screen name="appearance" options={{ title: 'Appearance' }} />
      <Stack.Screen name="progress" options={{ title: 'My Progress' }} />
      <Stack.Screen name="skills" options={{ title: 'Skills' }} />
      <Stack.Screen
        name="skill-assessment"
        options={{ title: 'Skill Assessment' }}
      />
      <Stack.Screen name="helpdesk" options={{ title: 'Helpdesk' }} />
    </Stack>
  );
}
