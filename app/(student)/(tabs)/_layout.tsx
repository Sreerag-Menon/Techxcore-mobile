import { Tabs } from 'expo-router';

import FloatingTabBar from '@/components/ui/FloatingTabBar';

export default function StudentTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
        }}
      />
      <Tabs.Screen
        name="courses"
        options={{
          title: 'Courses',
        }}
      />
      <Tabs.Screen
        name="assessments"
        options={{
          title: 'Assessments',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
    </Tabs>
  );
}
