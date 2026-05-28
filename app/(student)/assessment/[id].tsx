import { useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { AssessmentRunner } from '../../../src/components/player/AssessmentRunner';

export default function AssessmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const testId = useMemo(() => Number(id), [id]);

  return (
    <AssessmentRunner
      testId={testId}
      onExit={() => router.replace('/(student)/(tabs)/assessments')}
    />
  );
}
