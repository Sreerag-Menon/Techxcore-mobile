import { Stack } from 'expo-router';

import { useProtectedRoute } from '../../src/hooks';
import { useTheme } from '../../src/theme';

const STACK_HEADER = { headerShown: true as const, headerBackTitle: 'Back' };

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
        options={{ ...STACK_HEADER, headerTitle: 'Course Detail' }}
      />
      <Stack.Screen
        name="course-details/[id]"
        options={{ ...STACK_HEADER, headerTitle: 'Course Details' }}
      />
      <Stack.Screen
        name="course-variants/[id]"
        options={{ ...STACK_HEADER, headerTitle: 'Course Variants' }}
      />
      <Stack.Screen
        name="assessment/[id]"
        options={{ ...STACK_HEADER, headerTitle: 'Assessment' }}
      />
      <Stack.Screen
        name="notifications"
        options={{ ...STACK_HEADER, headerTitle: 'Notifications' }}
      />
      <Stack.Screen
        name="coming-soon"
        options={{ ...STACK_HEADER, headerTitle: 'Coming Soon' }}
      />
      <Stack.Screen
        name="calendar"
        options={{ ...STACK_HEADER, headerTitle: 'Calendar' }}
      />
      <Stack.Screen
        name="timetable"
        options={{ ...STACK_HEADER, headerTitle: 'Timetable' }}
      />
      <Stack.Screen
        name="messages"
        options={{ ...STACK_HEADER, headerTitle: 'Messages' }}
      />
      <Stack.Screen
        name="attendance"
        options={{ ...STACK_HEADER, headerTitle: 'Attendance' }}
      />
      <Stack.Screen
        name="live-sessions"
        options={{ ...STACK_HEADER, headerTitle: 'Live Sessions' }}
      />
      <Stack.Screen
        name="join"
        options={{ ...STACK_HEADER, headerTitle: 'Join Session' }}
      />
      <Stack.Screen
        name="playback"
        options={{ ...STACK_HEADER, headerTitle: 'Playback' }}
      />
      <Stack.Screen
        name="training-zone"
        options={{ ...STACK_HEADER, headerTitle: 'Training Zone' }}
      />
      <Stack.Screen
        name="knowledge-shelf"
        options={{ ...STACK_HEADER, headerTitle: 'Knowledge Shelf' }}
      />
      <Stack.Screen
        name="surveys"
        options={{ ...STACK_HEADER, headerTitle: 'Surveys' }}
      />
      <Stack.Screen
        name="fee-payment"
        options={{ ...STACK_HEADER, headerTitle: 'Fee Payment' }}
      />
      <Stack.Screen
        name="events"
        options={{ ...STACK_HEADER, headerTitle: 'Events' }}
      />
      <Stack.Screen
        name="rubrics"
        options={{ ...STACK_HEADER, headerTitle: 'Rubrics' }}
      />
      <Stack.Screen
        name="old-courses"
        options={{ ...STACK_HEADER, headerTitle: 'Old Courses' }}
      />
    </Stack>
  );
}
