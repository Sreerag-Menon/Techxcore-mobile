import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AssessmentSection,
  CourseSection,
  DashboardPromoCarousel,
  DashboardSkeleton,
  GreetingHeader,
  QuickActionsRow,
} from '@/components/dashboard';
import { ErrorState } from '@/components';
import { getFloatingTabBarScrollPadding } from '@/components/ui';
import { ScreenLayout } from '@/layouts';
import { useDashboardData } from '@/hooks/useDashboardData';

export default function StudentDashboard() {
  const insets = useSafeAreaInsets();
  const tabBarPadding = getFloatingTabBarScrollPadding(insets.bottom);

  const {
    stats,
    statsError,
    isLoadingStats,
    dashboardCourses,
    openCourses,
    isLoadingCourses,
    isLoadingOpenCourses,
    coursesError,
    homeAssessments,
    menuItems,
    isRefreshing,
    isInitialLoading,
    hasCriticalError,
    refresh,
  } = useDashboardData();

  if (hasCriticalError) {
    return (
      <ScreenLayout scrollable={false}>
        <ErrorState
          title="Dashboard unavailable"
          message={
            statsError ??
            coursesError ??
            'Unable to load your dashboard right now.'
          }
          onRetry={() => {
            void refresh();
          }}
        />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout
      refreshing={isRefreshing}
      onRefresh={refresh}
      safeAreaEdges={['left', 'right']}
      contentContainerStyle={{ paddingBottom: tabBarPadding, paddingTop: 0 }}
    >
      {isInitialLoading ? (
        <DashboardSkeleton />
      ) : (
        <View style={{ gap: 20 }}>
          {/* Hero: greeting + datetime + stat chips (all on one gradient) */}
          <GreetingHeader stats={stats} isLoading={isLoadingStats} />

          <QuickActionsRow menuItems={menuItems} />

          {/* Redesigned carousel — per-slide accent gradients, scroll-driven scale */}
          <DashboardPromoCarousel />
          <CourseSection
            enrolled={dashboardCourses}
            open={openCourses}
            isLoadingEnrolled={isLoadingCourses}
            isLoadingOpen={isLoadingOpenCourses}
          />
          <AssessmentSection assessments={homeAssessments} />
        </View>
      )}
    </ScreenLayout>
  );
}
