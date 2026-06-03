import { useCallback, useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';

import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  SkeletonCard,
} from '../../../src/components';
import AssessmentListItem from '../../../src/components/assessments/AssessmentListItem';
import { ScreenLayout, TabLayout } from '../../../src/layouts';
import { useAppDispatch, useAppSelector } from '../../../src/redux';
import { fetchAssessments } from '../../../src/redux/slices/assessmentSlice';
import { useTheme } from '../../../src/theme';
import type { AssessmentStatus } from '../../../src/types/assessment.types';
import { formatDuration } from '../../../src/utils';
import { formatAssessmentStatus } from '../../../src/utils/assessments';

type AssessmentFilter = 'all' | 'pending' | 'in_progress' | 'completed';

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

function getAssessmentMeta(
  totalQuestions?: number,
  totalMarks?: number,
  durationMinutes?: number,
): string[] {
  const parts: string[] = [];

  if (typeof totalQuestions === 'number' && Number.isFinite(totalQuestions)) {
    parts.push(`${totalQuestions} questions`);
  }

  if (typeof totalMarks === 'number' && Number.isFinite(totalMarks)) {
    parts.push(`${totalMarks} marks`);
  }

  if (
    typeof durationMinutes === 'number' &&
    Number.isFinite(durationMinutes) &&
    durationMinutes > 0
  ) {
    parts.push(formatDuration(durationMinutes));
  }

  return parts;
}

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
          <View style={{ gap: 12 }}>
            {filteredAssessments.map((assessment, index) => {
              const canOpenAssessment =
                typeof assessment.test_id === 'number' &&
                Number.isFinite(assessment.test_id);

              const openAttempt = canOpenAssessment
                ? () =>
                    router.push({
                      pathname: '/(student)/assessment/[id]',
                      params: { id: String(assessment.test_id) },
                    })
                : undefined;

              const openResults = canOpenAssessment
                ? () =>
                    router.push({
                      pathname: '/(student)/assessment/[id]',
                      params: { id: String(assessment.test_id), mode: 'results' },
                    })
                : undefined;

              return (
                <AssessmentListItem
                  key={assessment.test_id ?? `assessment-${index}`}
                  assessment={assessment}
                  variant="list"
                  onStartOrContinue={openAttempt}
                  onOpenResults={openResults}
                />
              );
            })}
          </View>
        )}
      </TabLayout>
    </ScreenLayout>
  );
}
