import { useCallback, useEffect } from 'react';
import { Text, View } from 'react-native';
import Svg, { G, Rect, Text as SvgText } from 'react-native-svg';

import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  ProgressBar,
} from '../../../src/components';
import { ScreenLayout, TabLayout } from '../../../src/layouts';
import { useAppDispatch, useAppSelector } from '../../../src/redux';
import {
  fetchAttendance,
  fetchChildProgress,
  fetchChildren,
} from '../../../src/redux/slices/parentSlice';
import { useTheme } from '../../../src/theme';

function ProgressChart({
  labels,
  values,
  barColor,
  textColor,
}: {
  labels: string[];
  values: number[];
  barColor: string;
  textColor: string;
}) {
  const width = 320;
  const height = 180;
  const barWidth = Math.max(32, width / Math.max(values.length, 1) - 20);

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      {values.map((value, index) => {
        const x = 16 + index * (barWidth + 16);
        const barHeight = (Math.max(0, value) / 100) * 110;
        const y = 130 - barHeight;

        return (
          <G key={`${labels[index]}-${value}`}>
            <Rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={8}
              fill={barColor}
            />
            <SvgText
              x={x + barWidth / 2}
              y={150}
              textAnchor="middle"
              fontSize="11"
              fill={textColor}
            >
              {labels[index]}
            </SvgText>
            <SvgText
              x={x + barWidth / 2}
              y={y - 8}
              textAnchor="middle"
              fontSize="11"
              fill={textColor}
            >
              {`${Math.round(value)}%`}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

export default function ParentPerformanceScreen() {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const { children, selectedChild, childProgress, attendance, error } =
    useAppSelector((state) => state.parent);

  const ensureParentData = useCallback(async () => {
    if (!children.length) {
      await dispatch(fetchChildren()).unwrap();
    }
  }, [children.length, dispatch]);

  useEffect(() => {
    void ensureParentData();
  }, [ensureParentData]);

  useEffect(() => {
    if (!selectedChild) return;

    void Promise.all([
      dispatch(
        fetchChildProgress({ member_id: selectedChild.member_id }),
      ).unwrap(),
      dispatch(fetchAttendance({ member_id: selectedChild.member_id })).unwrap(),
    ]);
  }, [dispatch, selectedChild]);

  if (error && !selectedChild) {
    return (
      <ScreenLayout scrollable={false}>
        <ErrorState
          title="Performance unavailable"
          message={error}
          onRetry={() => {
            void ensureParentData();
          }}
        />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <TabLayout
        title="Performance"
        subtitle="Visualize course completion and attendance trends for the selected learner."
      >
        {!selectedChild ? (
          <EmptyState
            title="Select a learner"
            message="Choose a child from the dashboard to view performance analytics."
          />
        ) : (
          <>
            <Card variant="elevated" padding="lg">
              <View style={{ gap: 12 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 18,
                      fontWeight: '700',
                    }}
                  >
                    Selected learner
                  </Text>
                  <Badge label="Live view" variant="success" />
                </View>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 20,
                    fontWeight: '700',
                  }}
                >
                  {[selectedChild.first_name, selectedChild.last_name]
                    .filter(Boolean)
                    .join(' ')}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                  {selectedChild.email || 'No email available'}
                </Text>
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
                  Course Progress Chart
                </Text>
                {childProgress.length === 0 ? (
                  <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                    Progress data will appear here once the learner begins assigned courses.
                  </Text>
                ) : (
                  <ProgressChart
                    labels={childProgress.map((course) => course.course_name.slice(0, 8))}
                    values={childProgress.map((course) => course.progress_percentage)}
                    barColor={colors.primary}
                    textColor={colors.textSecondary}
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
                  Detailed course breakdown
                </Text>
                {childProgress.length === 0 ? (
                  <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                    No course details available yet.
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
                          label={`${course.completed_modules}/${course.total_modules}`}
                          variant="info"
                        />
                      </View>
                      <ProgressBar progress={course.progress_percentage} showLabel />
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
                  Attendance summary
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
                          padding: 14,
                          backgroundColor: colors.background,
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
                  <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                    Attendance data is not available yet.
                  </Text>
                )}
              </View>
            </Card>
          </>
        )}
      </TabLayout>
    </ScreenLayout>
  );
}
