import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import {
  EmptyState,
  ErrorState,
  LoadingScreen,
  ProgressBar,
} from '@/components';
import { ScreenLayout } from '@/layouts';
import { useAppDispatch, useAppSelector } from '@/redux';
import { fetchWeeklyActivity } from '@/redux/slices/dashboardSlice';
import { asNumber, asString } from '@/api';
import { fetchProgressSummaries } from '@/services/profile';
import { useTheme } from '@/theme';

function ProgressSection({
  title,
  rows,
  emptyMessage,
}: {
  title: string;
  rows: Array<{ id: string; label: string; progress: number; meta?: string }>;
  emptyMessage: string;
}) {
  const { colors, fontFamily } = useTheme();

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        gap: 14,
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontSize: 16,
          fontFamily: fontFamily.bold,
        }}
      >
        {title}
      </Text>

      {rows.length === 0 ? (
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
          {emptyMessage}
        </Text>
      ) : (
        rows.map((row) => (
          <View key={row.id} style={{ gap: 6 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <Text
                style={{
                  flex: 1,
                  color: colors.text,
                  fontSize: 14,
                  fontFamily: fontFamily.medium,
                }}
                numberOfLines={1}
              >
                {row.label}
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 12,
                  fontFamily: fontFamily.regular,
                }}
              >
                {row.meta ?? `${Math.round(row.progress)}%`}
              </Text>
            </View>
            <ProgressBar progress={Math.min(100, Math.max(0, row.progress))} />
          </View>
        ))
      )}
    </View>
  );
}

export default function ProgressScreen() {
  const dispatch = useAppDispatch();
  const { colors, fontFamily } = useTheme();
  const authUser = useAppSelector((state) => state.auth.user);
  const weeklyActivity = useAppSelector((state) => state.dashboard.weeklyActivity);
  const stats = useAppSelector((state) => state.dashboard.stats);

  const [courseRows, setCourseRows] = useState<
    Array<{ id: string; label: string; progress: number; meta?: string }>
  >([]);
  const [assessmentRows, setAssessmentRows] = useState<
    Array<{ id: string; label: string; progress: number; meta?: string }>
  >([]);
  const [liveRows, setLiveRows] = useState<
    Array<{ id: string; label: string; progress: number; meta?: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      await dispatch(fetchWeeklyActivity());
      const summaries = await fetchProgressSummaries(authUser?.acad_year_id);

      setCourseRows(
        summaries.courses.slice(0, 8).map((row, index) => ({
          id: String(asNumber(row.course_id ?? row.id, index)),
          label: asString(row.course_name ?? row.name ?? row.title, `Course ${index + 1}`),
          progress: asNumber(
            row.progress ?? row.completion ?? row.percentage ?? row.pct,
            0,
          ),
        })),
      );

      setAssessmentRows(
        summaries.assessments.slice(0, 8).map((row, index) => ({
          id: String(asNumber(row.test_id ?? row.assessment_id ?? row.id, index)),
          label: asString(
            row.test_name ?? row.assessment_name ?? row.name ?? row.title,
            `Assessment ${index + 1}`,
          ),
          progress: asNumber(row.score ?? row.progress ?? row.percentage, 0),
          meta:
            row.score != null
              ? `Score ${asNumber(row.score)}%`
              : undefined,
        })),
      );

      setLiveRows(
        summaries.liveSessions.slice(0, 8).map((row, index) => ({
          id: String(asNumber(row.session_id ?? row.id, index)),
          label: asString(
            row.session_name ?? row.name ?? row.title,
            `Session ${index + 1}`,
          ),
          progress: asNumber(row.progress ?? row.attendance ?? row.percentage, 0),
        })),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load progress.',
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [authUser?.acad_year_id, dispatch]);

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoading) return <LoadingScreen label="Loading progress..." />;

  if (error && courseRows.length === 0 && assessmentRows.length === 0) {
    return (
      <ScreenLayout scrollable={false}>
        <ErrorState title="Progress unavailable" message={error} onRetry={load} />
      </ScreenLayout>
    );
  }

  const totalStudyMinutes = weeklyActivity.reduce(
    (sum, day) => sum + (day.total_duration || 0),
    0,
  );

  return (
    <ScreenLayout
      refreshing={isRefreshing}
      onRefresh={() => {
        setIsRefreshing(true);
        void load();
      }}
    >
      <View style={{ gap: 16, paddingTop: 8 }}>
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            borderCurve: 'continuous',
            borderWidth: 1,
            borderColor: colors.border,
            padding: 16,
            gap: 8,
          }}
        >
          <Text
            style={{
              color: colors.text,
              fontSize: 18,
              fontFamily: fontFamily.bold,
            }}
          >
            Weekly overview
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
            Study time this week: {Math.round(totalStudyMinutes)} min
          </Text>
          {stats ? (
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
              Avg completion {Math.round(stats.avgCompletionRate)}% · Avg assessment{' '}
              {Math.round(stats.avgAssessmentScore)}%
            </Text>
          ) : null}

          {weeklyActivity.length === 0 ? (
            <EmptyState
              title="No study activity"
              message="Study sessions from this week will show up here."
            />
          ) : (
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
              {weeklyActivity.map((day) => {
                const max = Math.max(
                  ...weeklyActivity.map((item) => item.total_duration || 0),
                  1,
                );
                const height = 24 + ((day.total_duration || 0) / max) * 56;
                return (
                  <View
                    key={`${day.day}-${day.date ?? ''}`}
                    style={{ flex: 1, alignItems: 'center', gap: 6 }}
                  >
                    <View
                      style={{
                        width: '100%',
                        height,
                        borderRadius: 8,
                        backgroundColor: colors.primaryLight,
                        justifyContent: 'flex-end',
                        overflow: 'hidden',
                      }}
                    >
                      <View
                        style={{
                          height: Math.max(8, height * 0.7),
                          backgroundColor: colors.primary,
                          borderRadius: 8,
                        }}
                      />
                    </View>
                    <Text
                      style={{
                        color: colors.textTertiary,
                        fontSize: 10,
                        fontFamily: fontFamily.medium,
                      }}
                    >
                      {day.day || '—'}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <ProgressSection
          title="Curriculum"
          rows={courseRows}
          emptyMessage="No curriculum progress available yet."
        />
        <ProgressSection
          title="Assessments"
          rows={assessmentRows}
          emptyMessage="No assessment progress available yet."
        />
        <ProgressSection
          title="Live sessions"
          rows={liveRows}
          emptyMessage="No live session progress available yet."
        />
      </View>
    </ScreenLayout>
  );
}
