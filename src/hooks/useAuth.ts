import { useMemo } from 'react';

import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import {
  loginUser,
  logoutUser,
  refreshToken,
  restoreSession,
} from '@/redux/slices/authSlice';

export function useAuth() {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state) => state.auth);

  return useMemo(() => {
    const memberType = auth.user?.member_type?.toLowerCase() ?? '';
    const isParent = memberType.includes('parent');

    return {
      ...auth,
      memberType,
      isParent,
      isStudent: auth.isAuthenticated && !isParent,
      login: (payload: Parameters<typeof loginUser>[0]) => dispatch(loginUser(payload)),
      logout: () => dispatch(logoutUser()),
      refresh: () => dispatch(refreshToken()),
      restore: () => dispatch(restoreSession()),
    };
  }, [auth, dispatch]);
}
