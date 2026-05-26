import { useMemo } from 'react';

import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import {
  loginUser,
  logoutUser,
  refreshToken,
  restoreSession,
} from '@/redux/slices/authSlice';
import { isParentMemberType, normalizeMemberType } from '@/utils';

export function useAuth() {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state) => state.auth);

  return useMemo(() => {
    const memberType = normalizeMemberType(auth.user?.member_type);
    const isParent = isParentMemberType(auth.user?.member_type);

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
