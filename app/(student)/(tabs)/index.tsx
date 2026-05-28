import { useCallback, useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  ProgressBar,
  SkeletonCard,
} from '../../../src/components';
import { ScreenLayout, TabLayout } from '../../../src/layouts';
import { useAppDispatch, useAppSelector } from '../../../src/redux';
import {
  fetchDashboardCourses,
} from '../../../src/redux/slices/courseSlice';
import { fetchHomeAssessments } from '../../../src/redux/slices/assessmentSlice';
import { fetchNotifications } from '../../../src/redux/slices/notificationSlice';
import { fetchUserProfile } from '../../../src/redux/slices/userSlice';
import { fetchRecentActivity, type DashboardActivity } from '../../../src/services';
import { useTheme } from '../../../src/theme';
import type { AssessmentStatus } from '../../../src/types/assessment.types';
import { formatDate, timeAgo } from '../../../src/utils';

function formatAssessmentStatus(status?: AssessmentStatus): string {
  return status ? status.replace(/_/g, ' ') : 'scheduled';
}

function getAssessmentStatusVariant(
  status?: AssessmentStatus,
): 'primary' | 'success' | 'warning' | 'neutral' {
  switch (status) {
    case 'completed':
      return 'success';
    case 'in_progress':
      return 'warning';
    case 'expired':
      return 'neutral';
    case 'pending':
      return 'primary';
    default:
      return 'neutral';
  }
}

function getHomeAssessmentMetrics(
  totalQuestions?: number,
  totalMarks?: number,
): string | null {
  const parts: string[] = [];

  if (typeof totalQuestions === 'number' && Number.isFinite(totalQuestions)) {
    parts.push(`${totalQuestions} questions`);
  }

  if (typeof totalMarks === 'number' && Number.isFinite(totalMarks)) {
    parts.push(`${totalMarks} marks`);
  }

  return parts.length ? parts.join(' · ') : null;
}

function getDueDateLabel(dueDate?: string): string | null {
  if (!dueDate) {
    return null;
  }

  return formatDate(dueDate) || dueDate;
}

export default function StudentDashboard() {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const { user } = useAppSelector((state) => state.auth);
  const { dashboardCourses, isLoading, error } = useAppSelector(
    (state) => state.course,
  );
  const homeAssessments = useAppSelector(
    (state) => state.assessment.homeAssessments,
  );
  const unreadCount = useAppSelector((state) => state.notification.unreadCount);
  const profile = useAppSelector((state) => state.user.profile);
  const [activities, setActivities] = useState<DashboardActivity[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setActivityError(null);

    try {
      const recentActivity = await Promise.all([
        dispatch(fetchDashboardCourses()).unwrap(),
        dispatch(fetchHomeAssessments()).unwrap(),
        dispatch(fetchNotifications()).unwrap(),
        dispatch(fetchUserProfile()).unwrap().catch(() => null),
        fetchRecentActivity(),
      ]);

      setActivities(recentActivity[4]);
    } catch (loadError) {
      setActivityError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load your dashboard right now.',
      );
    }
  }, [dispatch]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadDashboard();
    setIsRefreshing(false);
  }, [loadDashboard]);

  const displayName = useMemo(() => {
    const source = profile ?? user;
    return [source?.first_name, source?.last_name].filter(Boolean).join(' ');
  }, [profile, user]);

  const stats = useMemo(() => {
    if (dashboardCourses.length === 0) {
      return [
        { label: 'Courses', value: '0' },
        { label: 'Average progress', value: '0%' },
        { label: 'Completed', value: '0' },
      ];
    }

    const averageProgress = Math.round(
      dashboardCourses.reduce(
        (sum, course) => sum + (course.progress_percentage || 0),
        0,
      ) / dashboardCourses.length,
    );

    return [
      { label: 'Courses', value: String(dashboardCourses.length) },
      { label: 'Average progress', value: `${averageProgress}%` },
      {
        label: 'Completed',
        value: String(
          dashboardCourses.filter((course) => course.status === 'completed').length,
        ),
      },
    ];
  }, [dashboardCourses]);

  if (!dashboardCourses.length && !activities.length && (error || activityError) && !isLoading) {
    return (
      <ScreenLayout scrollable={false}>
        <ErrorState
          title="Dashboard unavailable"
          message={error ?? activityError ?? 'Unable to load dashboard data.'}
          onRetry={() => {
            void loadDashboard();
          }}
        />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout refreshing={isRefreshing} onRefresh={onRefresh}>
      <TabLayout
        title={`Hello${displayName ? `, ${displayName}` : ''}`}
        subtitle="Track courses, assessments, and the latest learning activity from one place."
        rightAction={
          <Pressable
            onPress={() => router.push('/(student)/notifications')}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: 11,
                fontWeight: '700',
                letterSpacing: 0.6,
              }}
            >
              ALERTS
            </Text>
            {unreadCount > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: colors.error,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 4,
                }}
              >
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 10,
                    fontWeight: '700',
                  }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        }
      >
        <Card variant="elevated" padding="lg">
          <View style={{ gap: 12 }}>
            <Text
              style={{
                color: colors.text,
                fontSize: 18,
                fontWeight: '700',
              }}
            >
              Progress Overview
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {stats.map((stat) => (
                <View
                  key={stat.label}
                  style={{
                    flex: 1,
                    borderRadius: 14,
                    backgroundColor: colors.background,
                    padding: 14,
                    gap: 6,
                  }}
                >
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 12,
                      lineHeight: 18,
                    }}
                  >
                    {stat.label}
                  </Text>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 20,
                      fontWeight: '700',
                    }}
                  >
                    {stat.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </Card>

        <View style={{ gap: 12 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: 18,
                fontWeight: '700',
              }}
            >
              Enrolled Courses
            </Text>
            <Pressable onPress={() => router.push('/(student)/(tabs)/courses')}>
              <Text style={{ color: colors.primary, fontWeight: '600' }}>See all</Text>
            </Pressable>
          </View>

          {isLoading && dashboardCourses.length === 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {[0, 1].map((item) => (
                  <View key={item} style={{ width: 260 }}>
                    <SkeletonCard />
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : dashboardCourses.length === 0 ? (
            <EmptyState
              title="No courses yet"
              message="Your enrolled courses will show up here once they are published."
            />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {dashboardCourses.map((course) => (
                  <Card
                    key={course.course_publish_id || course.course_id}
                    variant="elevated"
                    padding="lg"
                    onPress={() =>
                      router.push({
                        pathname: '/(student)/course/[id]',
                        params: {
                          id: String(
                            course.course_publish_id || course.course_id,
                          ),
                        },
                      })
                    }
                    style={{ width: 280, gap: 12 }}
                  >
                    <View style={{ gap: 10 }}>
                      <Badge
                        label={course.status.replace('_', ' ')}
                        variant={
                          course.status === 'completed'
                            ? 'success'
                            : course.status === 'in_progress'
                              ? 'primary'
                              : 'neutral'
                        }
                      />
                      <Text
                        style={{
                          color: colors.text,
                          fontSize: 16,
                          fontWeight: '700',
                        }}
                      >
                        {course.course_name}
                      </Text>
                      {course.course_description ? (
                        <Text
                          style={{
                            color: colors.textSecondary,
                            fontSize: 13,
                            lineHeight: 19,
                          }}
                          numberOfLines={3}
                        >
                          {course.course_description}
                        </Text>
                      ) : null}
                      <ProgressBar progress={course.progress_percentage || 0} showLabel />
                    </View>
                  </Card>
                ))}
              </View>
            </ScrollView>
          )}
        </View>

        <View style={{ gap: 12 }}>
          <Text
            style={{
              color: colors.text,
              fontSize: 18,
              fontWeight: '700',
            }}
          >
            Upcoming Assessments
          </Text>

          {homeAssessments.length === 0 ? (
            <Card variant="outlined" padding="lg">
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                No assessments are due right now.
              </Text>
            </Card>
          ) : (
            homeAssessments.slice(0, 3).map((assessment, index) => {
              const canOpenAssessment =
                typeof assessment.test_id === 'number' &&
                Number.isFinite(assessment.test_id);
              const metricsLabel = getHomeAssessmentMetrics(
                assessment.total_questions,
                assessment.total_marks,
              );
              const dueDateLabel = getDueDateLabel(assessment.due_date);

              return (
                <Card
                  key={
                    assessment.test_id ??
                    `${assessment.test_name.toLowerCase().replace(/\s+/g, '-')}-${index}`
                  }
                  variant="default"
                  padding="lg"
                  onPress={
                    canOpenAssessment
                      ? () =>
                          router.push({
                            pathname: '/(student)/assessment/[id]',
                            params: { id: String(assessment.test_id) },
                          })
                      : undefined
                  }
                >
                  <View style={{ gap: 10 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.text,
                          fontSize: 16,
                          fontWeight: '700',
                          flex: 1,
                        }}
                      >
                        {assessment.test_name}
                      </Text>
                      <Badge
                        label={formatAssessmentStatus(assessment.status)}
                        variant={getAssessmentStatusVariant(assessment.status)}
                      />
                    </View>
                    {metricsLabel ? (
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: 13,
                        }}
                      >
                        {metricsLabel}
                      </Text>
                    ) : null}
                    {dueDateLabel ? (
                      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                        Due {dueDateLabel}
                      </Text>
                    ) : null}
                  </View>
                </Card>
              );
            })
          )}
        </View>

        <View style={{ gap: 12 }}>
          <Text
            style={{
              color: colors.text,
              fontSize: 18,
              fontWeight: '700',
            }}
          >
            Recent Activity
          </Text>

          {activities.length === 0 ? (
            <Card variant="outlined" padding="lg">
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                Your latest activity will appear here after you start learning.
              </Text>
            </Card>
          ) : (
            activities.slice(0, 4).map((activity) => (
              <Card key={activity.activity_id} variant="default" padding="lg">
                <View style={{ gap: 6 }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 15,
                      fontWeight: '600',
                    }}
                  >
                    {activity.title}
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 13,
                      lineHeight: 19,
                    }}
                  >
                    {activity.description}
                  </Text>
                  <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
                    {timeAgo(activity.created_at)}
                  </Text>
                </View>
              </Card>
            ))
          )}
        </View>
      </TabLayout>
    </ScreenLayout>
  );
}
