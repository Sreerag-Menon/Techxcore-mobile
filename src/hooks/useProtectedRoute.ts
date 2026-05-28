import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';

import { useAppSelector } from '@/redux/hooks';
import { useAuth } from './useAuth';

type AllowedRole = 'student' | 'parent';

export function useProtectedRoute(allowedRole?: AllowedRole) {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isRestoringSession, isParent } = useAuth();
  const { currentTenant, isRestoringTenant } = useAppSelector(
    (state) => state.tenant,
  );
  const segmentKey = segments.join('/');

  useEffect(() => {
    if (isRestoringSession || isRestoringTenant) return;

    const inAuthGroup = segments[0] === '(auth)';

    // No tenant configured → redirect to tenant selection
    if (!currentTenant) {
      if (segments.join('/') !== '(auth)/select-tenant') {
        router.replace('/(auth)/select-tenant');
      }
      return;
    }

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
    currentTenant,
    isAuthenticated,
    isParent,
    isRestoringSession,
    isRestoringTenant,
    router,
    segmentKey,
    segments,
  ]);
}
