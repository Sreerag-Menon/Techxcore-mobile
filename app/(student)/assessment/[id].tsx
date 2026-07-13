import { useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { AssessmentPlayerScreen } from '../../../src/components/player/assessment/AssessmentPlayerScreen';
import { ErrorState, LoadingScreen } from '../../../src/components';
import { useGetTraineeAssessmentsListQuery } from '../../../src/redux/api/assessmentApi';
import { logAssessment } from '../../../src/utils/assessmentDebugLog';

export default function AssessmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const routeId = useMemo(() => Number(id), [id]);
  const { data: assessments = [], isLoading, error, refetch } = useGetTraineeAssessmentsListQuery();

  const publishId = useMemo(() => {
    if (!Number.isFinite(routeId) || routeId <= 0) return 0;
    const byPublish = assessments.find((a) => a.publishId === routeId);
    if (byPublish) return byPublish.publishId;
    const byTest = assessments.find((a) => a.testId === routeId);
    const resolved = byTest?.publishId ?? routeId;
    logAssessment('route:publishId-resolved', {
      routeId,
      resolved,
      matchedBy: byPublish ? 'publishId' : byTest ? 'testId' : 'fallback-routeId',
      assessmentCount: assessments.length,
    });
    return resolved;
  }, [assessments, routeId]);

  if (isLoading && assessments.length === 0) {
    return <LoadingScreen />;
  }

  if (error && publishId <= 0) {
    return (
      <ErrorState
        message="Unable to resolve assessment."
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  if (publishId <= 0) {
    return <ErrorState message="Invalid assessment id." />;
  }

  return (
    <View style={{ flex: 1 }}>
      <AssessmentPlayerScreen
        publishId={publishId}
        onComplete={() => router.replace('/(student)/(tabs)/assessments')}
        onAllViewed={() => router.replace('/(student)/(tabs)/assessments')}
      />
    </View>
  );
}
