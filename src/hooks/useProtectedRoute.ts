import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';

import { useAuth } from './useAuth';

type AllowedRole = 'student' | 'parent';

export function useProtectedRoute(allowedRole?: AllowedRole) {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isRestoringSession, isParent } = useAuth();
  const segmentKey = segments.join('/');

  useEffect(() => {
    if (isRestoringSession) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
      return;
    }

    if (inAuthGroup) {
      router.replace(isParent ? '/(parent)/(tabs)' : '/(student)/(tabs)');
      return;
    }

    if (allowedRole === 'parent' && !isParent) {
      router.replace('/(student)/(tabs)');
      return;
    }

    if (allowedRole === 'student' && isParent) {
      router.replace('/(parent)/(tabs)');
    }
  }, [
    allowedRole,
    isAuthenticated,
    isParent,
    isRestoringSession,
    router,
    segmentKey,
    segments,
  ]);
}
