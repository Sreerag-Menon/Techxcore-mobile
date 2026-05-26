import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { useAppSelector } from '../src/redux/hooks';
import { useTheme } from '../src/theme';
import { isParentMemberType } from '../src/utils';

export default function Index() {
  const { colors } = useTheme();
  const { isAuthenticated, isRestoringSession, user } = useAppSelector(
    (state) => state.auth,
  );

  // Splash screen is still visible while restoring – render nothing
  if (isRestoringSession) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  // Route based on member_type
  if (isParentMemberType(user?.member_type)) {
    return <Redirect href="/(parent)/(tabs)" />;
  }

  // Default → student
  return <Redirect href="/(student)/(tabs)" />;
}
