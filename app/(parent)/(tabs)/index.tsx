import { useCallback, useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  ErrorState,
  ProgressBar,
} from '../../../src/components';
import { ScreenLayout, TabLayout } from '../../../src/layouts';
import { useAppDispatch, useAppSelector } from '../../../src/redux';
import { fetchNotifications } from '../../../src/redux/slices/notificationSlice';
import {
  fetchAttendance,
  fetchChildProgress,
  fetchChildren,
  selectChild,
} from '../../../src/redux/slices/parentSlice';
import { useTheme } from '../../../src/theme';

export default function ParentDashboardScreen() {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const { children, selectedChild, childProgress, attendance, isLoading, error } =
    useAppSelector((state) => state.parent);
  const notifications = useAppSelector(
    (state) => state.notification.notifications,
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadChildren = useCallback(async () => {
    await Promise.all([
      dispatch(fetchChildren()).unwrap(),
      dispatch(fetchNotifications()).unwrap().catch(() => []),
    ]);
  }, [dispatch]);

  useEffect(() => {
    void loadChildren();
  }, [loadChildren]);

  useEffect(() => {
    if (!selectedChild) return;

    void Promise.all([
      dispatch(
        fetchChildProgress({ member_id: selectedChild.member_id }),
      ).unwrap(),
      dispatch(fetchAttendance({ member_id: selectedChild.member_id })).unwrap(),
    ]);
  }, [dispatch, selectedChild]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);

    try {
      await loadChildren();

      if (selectedChild) {
        await Promise.all([
          dispatch(
            fetchChildProgress({ member_id: selectedChild.member_id }),
          ).unwrap(),
          dispatch(fetchAttendance({ member_id: selectedChild.member_id })).unwrap(),
        ]);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [dispatch, loadChildren, selectedChild]);

  const progressAverage = useMemo(() => {
    if (!childProgress.length) return 0;

    return Math.round(
      childProgress.reduce((sum, course) => sum + course.progress_percentage, 0) /
        childProgress.length,
    );
  }, [childProgress]);

  return (
    <ScreenLayout refreshing={isRefreshing} onRefresh={onRefresh}>
      <TabLayout
        title="Parent Dashboard"
        subtitle="Track your child’s attendance, course progress, and recent learning updates."
      >
        {error && !children.length && !isLoading ? (
          <ErrorState
            title="Parent dashboard unavailable"
            message={error}
            onRetry={() => {
              void loadChildren();
            }}
          />
        ) : children.length === 0 ? (
          <EmptyState
            title="No children linked"
            message="Linked learner accounts will appear here once they are assigned to your parent profile."
          />
        ) : (
          <>
            <View style={{ gap: 12 }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 18,
                  fontWeight: '700',
                }}
              >
                Child Selector
              </Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {children.map((child) => {
                    const isSelected = child.member_id === selectedChild?.member_id;
                    const childName = [child.first_name, child.last_name]
                      .filter(Boolean)
                      .join(' ');

                    return (
                      <Card
                        key={child.member_id}
                        variant={isSelected ? 'elevated' : 'outlined'}
                        padding="md"
                        onPress={() => dispatch(selectChild(child))}
                        style={{
                          width: 220,
                          borderWidth: isSelected ? 0 : 1,
                          borderColor: isSelected ? undefined : colors.border,
                        }}
                      >
                        <View style={{ gap: 12 }}>
                          <Avatar
                            imageUrl={child.avatar_url}
                            name={childName}
                            size="lg"
                          />
                          <View style={{ gap: 4 }}>
                            <Text
                              style={{
                                color: colors.text,
                                fontSize: 16,
                                fontWeight: '700',
                              }}
                            >
                              {childName}
                            </Text>
                            {child.class_name || child.standard ? (
                              <Text
                                style={{ color: colors.textSecondary, fontSize: 12 }}
                              >
                                {[child.class_name, child.standard]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      </Card>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {selectedChild ? (
              <>
                <Card variant="elevated" padding="lg">
                  <View style={{ gap: 12 }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 18,
                        fontWeight: '700',
                      }}
                    >
                      Overview
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <View
                        style={{
                          flex: 1,
                          borderRadius: 14,
                          padding: 14,
                          backgroundColor: colors.background,
                          gap: 6,
                        }}
                      >
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                          Average progress
                        </Text>
                        <Text
                          style={{
                            color: colors.text,
                            fontSize: 22,
                            fontWeight: '700',
                          }}
                        >
                          {progressAverage}%
                        </Text>
                      </View>
                      <View
                        style={{
                          flex: 1,
                          borderRadius: 14,
                          padding: 14,
                          backgroundColor: colors.background,
                          gap: 6,
                        }}
                      >
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                          Attendance
                        </Text>
                        <Text
                          style={{
                            color: colors.text,
                            fontSize: 22,
                            fontWeight: '700',
                          }}
                        >
                          {attendance?.attendance_percentage ?? 0}%
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: '/(parent)/child/[id]',
                          params: { id: String(selectedChild.member_id) },
                        })
                      }
                    >
                      <Text
                        style={{
                          color: colors.primary,
                          fontSize: 14,
                          fontWeight: '600',
                        }}
                      >
                        View detailed report
                      </Text>
                    </Pressable>
                  </View>
                </Card>

                <Card variant="elevated" padding="lg">
                  <View style={{ gap: 12 }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 18,
                        fontWeight: '700',
                      }}
                    >
                      Course Progress
                    </Text>

                    {childProgress.length === 0 ? (
                      <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                        No course progress available for this learner yet.
                      </Text>
                    ) : (
                      childProgress.map((course) => (
                        <View key={course.course_id} style={{ gap: 8 }}>
                          <View
                            style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              gap: 12,
                            }}
                          >
                            <Text
                              style={{
                                color: colors.text,
                                fontSize: 15,
                                fontWeight: '600',
                                flex: 1,
                              }}
                            >
                              {course.course_name}
                            </Text>
                            <Badge
                              label={`${course.progress_percentage}%`}
                              variant="primary"
                            />
                          </View>
                          <ProgressBar progress={course.progress_percentage} />
                        </View>
                      ))
                    )}
                  </View>
                </Card>

                <Card variant="elevated" padding="lg">
                  <View style={{ gap: 12 }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 18,
                        fontWeight: '700',
                      }}
                    >
                      Notifications Preview
                    </Text>
                    {notifications.length === 0 ? (
                      <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                        No recent notifications available.
                      </Text>
                    ) : (
                      notifications.slice(0, 3).map((notification) => (
                        <View key={notification.notification_id} style={{ gap: 4 }}>
                          <Text
                            style={{
                              color: colors.text,
                              fontSize: 14,
                              fontWeight: '600',
                            }}
                          >
                            {notification.title}
                          </Text>
                          <Text
                            style={{
                              color: colors.textSecondary,
                              fontSize: 12,
                              lineHeight: 18,
                            }}
                          >
                            {notification.message}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                </Card>
              </>
            ) : null}
          </>
        )}
      </TabLayout>
    </ScreenLayout>
  );
}
