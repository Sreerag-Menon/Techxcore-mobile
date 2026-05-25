import { useCallback, useEffect, useMemo } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import {
  Avatar,
  Card,
  EmptyState,
  ErrorState,
  ProgressBar,
} from '../../../src/components';
import { ScreenLayout } from '../../../src/layouts';
import { useAppDispatch, useAppSelector } from '../../../src/redux';
import {
  fetchAttendance,
  fetchChildProgress,
  fetchChildren,
} from '../../../src/redux/slices/parentSlice';
import { useTheme } from '../../../src/theme';

export default function ChildDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const { children, childProgress, attendance, error } = useAppSelector(
    (state) => state.parent,
  );

  const childId = Number(id);
  const child = useMemo(
    () => children.find((item) => item.member_id === childId),
    [childId, children],
  );

  const loadDetail = useCallback(async () => {
    if (!Number.isFinite(childId)) return;

    if (!children.length) {
      await dispatch(fetchChildren()).unwrap();
    }

    await Promise.all([
      dispatch(fetchChildProgress({ member_id: childId })).unwrap(),
      dispatch(fetchAttendance({ member_id: childId })).unwrap(),
    ]);
  }, [childId, children.length, dispatch]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  if (error && !child) {
    return (
      <ScreenLayout scrollable={false}>
        <ErrorState
          title="Child details unavailable"
          message={error}
          onRetry={() => {
            void loadDetail();
          }}
        />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      {child ? (
        <View style={{ gap: 16 }}>
          <Card variant="elevated" padding="lg">
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <Avatar
                imageUrl={child.avatar_url}
                name={[child.first_name, child.last_name].filter(Boolean).join(' ')}
                size="xl"
              />
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 22,
                    fontWeight: '700',
                  }}
                >
                  {[child.first_name, child.last_name].filter(Boolean).join(' ')}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                  {child.email || 'No email available'}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  {[child.class_name, child.standard].filter(Boolean).join(' · ')}
                </Text>
              </View>
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
                Attendance Summary
              </Text>
              {attendance ? (
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {[
                    { label: 'Present', value: attendance.present_days },
                    { label: 'Absent', value: attendance.absent_days },
                    {
                      label: 'Attendance',
                      value: `${attendance.attendance_percentage}%`,
                    },
                  ].map((item) => (
                    <View
                      key={item.label}
                      style={{
                        flex: 1,
                        borderRadius: 14,
                        backgroundColor: colors.background,
                        padding: 14,
                        gap: 6,
                      }}
                    >
                      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                        {item.label}
                      </Text>
                      <Text
                        style={{
                          color: colors.text,
                          fontSize: 20,
                          fontWeight: '700',
                        }}
                      >
                        {item.value}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <EmptyState
                  title="Attendance unavailable"
                  message="Attendance details will show here when records are available."
                />
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
                Course Progress
              </Text>
              {childProgress.length === 0 ? (
                <EmptyState
                  title="No course data"
                  message="Published course progress will appear here once the learner starts studying."
                />
              ) : (
                childProgress.map((course) => (
                  <View key={course.course_id} style={{ gap: 8 }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 15,
                        fontWeight: '600',
                      }}
                    >
                      {course.course_name}
                    </Text>
                    <ProgressBar progress={course.progress_percentage} showLabel />
                  </View>
                ))
              )}
            </View>
          </Card>
        </View>
      ) : (
        <EmptyState
          title="Learner not found"
          message="We could not locate a linked learner for this profile."
        />
      )}
    </ScreenLayout>
  );
}
