import { useCallback, useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  SkeletonCard,
} from '../../../src/components';
import { ScreenLayout, TabLayout } from '../../../src/layouts';
import { useAppDispatch, useAppSelector } from '../../../src/redux';
import { fetchAssessments } from '../../../src/redux/slices/assessmentSlice';
import { useTheme } from '../../../src/theme';
import { formatDate, formatDuration } from '../../../src/utils';

type AssessmentFilter = 'all' | 'pending' | 'in_progress' | 'completed';

export default function AssessmentsScreen() {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const { assessments, isLoading, error } = useAppSelector(
    (state) => state.assessment,
  );
  const [activeFilter, setActiveFilter] = useState<AssessmentFilter>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadAssessments = useCallback(async () => {
    await dispatch(fetchAssessments()).unwrap();
  }, [dispatch]);

  useEffect(() => {
    void loadAssessments();
  }, [loadAssessments]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadAssessments();
    } finally {
      setIsRefreshing(false);
    }
  }, [loadAssessments]);

  const filteredAssessments = useMemo(() => {
    return assessments.filter((assessment) =>
      activeFilter === 'all' ? true : assessment.status === activeFilter,
    );
  }, [activeFilter, assessments]);

  return (
    <ScreenLayout refreshing={isRefreshing} onRefresh={onRefresh}>
      <TabLayout
        title="Assessments"
        subtitle="Review upcoming tests, continue in-progress attempts, and revisit completed results."
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {(
            ['all', 'pending', 'in_progress', 'completed'] as AssessmentFilter[]
          ).map((filter) => (
            <Button
              key={filter}
              title={filter.replace('_', ' ')}
              onPress={() => setActiveFilter(filter)}
              variant={activeFilter === filter ? 'primary' : 'outline'}
              size="sm"
            />
          ))}
        </View>

        {error && !assessments.length && !isLoading ? (
          <ErrorState
            title="Assessments unavailable"
            message={error}
            onRetry={() => {
              void loadAssessments();
            }}
          />
        ) : null}

        {isLoading && !assessments.length ? (
          <View style={{ gap: 16 }}>
            {[0, 1, 2].map((item) => (
              <SkeletonCard key={item} />
            ))}
          </View>
        ) : filteredAssessments.length === 0 ? (
          <EmptyState
            title="No assessments found"
            message="New assessments will appear here once they are assigned to you."
          />
        ) : (
          filteredAssessments.map((assessment) => (
            <Card
              key={assessment.test_id}
              variant="elevated"
              padding="lg"
              onPress={() =>
                router.push({
                  pathname: '/(student)/assessment/[id]',
                  params: { id: String(assessment.test_id) },
                })
              }
            >
              <View style={{ gap: 12 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 17,
                        fontWeight: '700',
                      }}
                    >
                      {assessment.test_name}
                    </Text>
                    {assessment.test_description ? (
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: 13,
                          lineHeight: 19,
                        }}
                        numberOfLines={2}
                      >
                        {assessment.test_description}
                      </Text>
                    ) : null}
                  </View>
                  <Badge
                    label={assessment.status.replace('_', ' ')}
                    variant={
                      assessment.status === 'completed'
                        ? 'success'
                        : assessment.status === 'in_progress'
                          ? 'warning'
                          : 'primary'
                    }
                  />
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {assessment.total_questions} questions
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {assessment.total_marks} marks
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {formatDuration(assessment.duration_minutes)}
                  </Text>
                </View>

                {assessment.due_date ? (
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    Due {formatDate(assessment.due_date)}
                  </Text>
                ) : null}

                {typeof assessment.percentage === 'number' ? (
                  <Text
                    style={{
                      color: colors.primary,
                      fontSize: 13,
                      fontWeight: '600',
                    }}
                  >
                    Latest score: {Math.round(assessment.percentage)}%
                  </Text>
                ) : null}
              </View>
            </Card>
          ))
        )}
      </TabLayout>
    </ScreenLayout>
  );
}
