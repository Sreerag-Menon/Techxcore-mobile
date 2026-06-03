import { useCallback, useEffect, useState } from 'react';

import { useAppDispatch, useAppSelector } from '@/redux';
import { fetchHomeAssessments } from '@/redux/slices/assessmentSlice';
import {
  fetchDashboardCourses,
  fetchOpenCourses,
} from '@/redux/slices/courseSlice';
import {
  fetchDashboardStats,
  fetchMentorList,
  fetchWeeklyActivity,
} from '@/redux/slices/dashboardSlice';
import { fetchMenuItems } from '@/redux/slices/menuSlice';
import { fetchNotifications } from '@/redux/slices/notificationSlice';
import { fetchUserProfile } from '@/redux/slices/userSlice';

export function useDashboardData() {
  const dispatch = useAppDispatch();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const stats = useAppSelector((state) => state.dashboard.stats);
  const statsError = useAppSelector((state) => state.dashboard.statsError);
  const isLoadingStats = useAppSelector((state) => state.dashboard.isLoadingStats);

  const dashboardCourses = useAppSelector((state) => state.course.dashboardCourses);
  const openCourses = useAppSelector((state) => state.course.openCourses);
  const isLoadingCourses = useAppSelector((state) => state.course.isLoading);
  const isLoadingOpenCourses = useAppSelector((state) => state.course.isLoadingOpenCourses);
  const coursesError = useAppSelector((state) => state.course.error);
  const openCoursesError = useAppSelector((state) => state.course.openCoursesError);

  const homeAssessments = useAppSelector((state) => state.assessment.homeAssessments);
  const isLoadingAssessments = useAppSelector((state) => state.assessment.isLoading);
  const assessmentsError = useAppSelector((state) => state.assessment.error);

  const menuItems = useAppSelector((state) => state.menu.items);
  const isLoadingMenu = useAppSelector((state) => state.menu.isLoading);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);

    await Promise.allSettled([
      dispatch(fetchDashboardStats()),
      dispatch(fetchDashboardCourses()),
      dispatch(fetchOpenCourses()),
      dispatch(fetchHomeAssessments()),
      dispatch(fetchNotifications()),
      dispatch(fetchUserProfile()),
      dispatch(fetchMenuItems()),
      dispatch(fetchWeeklyActivity()),
      dispatch(fetchMentorList()),
    ]);

    setIsRefreshing(false);
  }, [dispatch]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isInitialLoading =
    isLoadingStats &&
    isLoadingCourses &&
    !stats &&
    dashboardCourses.length === 0;

  const hasCriticalError =
    !stats &&
    !dashboardCourses.length &&
    !homeAssessments.length &&
    Boolean(statsError || coursesError) &&
    !isLoadingStats &&
    !isLoadingCourses;

  return {
    stats,
    statsError,
    isLoadingStats,
    dashboardCourses,
    openCourses,
    isLoadingCourses,
    isLoadingOpenCourses,
    coursesError,
    openCoursesError,
    homeAssessments,
    isLoadingAssessments,
    assessmentsError,
    menuItems,
    isLoadingMenu,
    isRefreshing,
    isInitialLoading,
    hasCriticalError,
    refresh,
  };
}
