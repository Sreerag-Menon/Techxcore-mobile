import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingScreen,
  ProgressBar,
} from '../index';
import { ScreenLayout } from '../../layouts';
import { useAppDispatch, useAppSelector } from '../../redux';
import {
  clearCurrentResult,
  fetchQuestions,
  submitAssessment,
} from '../../redux/slices/assessmentSlice';
import {
  fetchAssessmentDetails,
  type AssessmentDetails,
} from '../../services';
import { useTheme } from '../../theme';
import { formatDuration, formatSeconds } from '../../utils';

export type AssessmentRunnerProps = {
  testId: number;
  onExit?: () => void;
  onComplete?: () => void;
};

export function AssessmentRunner({ testId, onExit, onComplete }: AssessmentRunnerProps) {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const {
    currentQuestions,
    currentResult,
    isLoading,
    isSubmitting,
    error,
  } = useAppSelector((state) => state.assessment);
  const [details, setDetails] = useState<AssessmentDetails | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [screenError, setScreenError] = useState<string | null>(null);

  const loadAssessment = useCallback(async () => {
    if (!Number.isFinite(testId)) return;

    setScreenError(null);
    dispatch(clearCurrentResult());

    try {
      const [assessmentDetails] = await Promise.all([
        fetchAssessmentDetails({ test_id: testId }),
        dispatch(fetchQuestions({ test_id: testId })).unwrap(),
      ]);

      setDetails(assessmentDetails);
      setAnswers({});
      setCurrentIndex(0);
      setHasStarted(false);
      setSecondsLeft((assessmentDetails?.duration_minutes ?? 0) * 60);
    } catch (loadError) {
      setScreenError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load assessment details.',
      );
    }
  }, [dispatch, testId]);

  useEffect(() => {
    void loadAssessment();
    return () => {
      dispatch(clearCurrentResult());
    };
  }, [dispatch, loadAssessment]);

  const handleSubmitAssessment = useCallback(async () => {
    if (!Number.isFinite(testId)) return;

    try {
      await dispatch(
        submitAssessment({
          test_id: testId,
          answers: Object.entries(answers).map(([questionId, optionId]) => ({
            question_id: Number(questionId),
            option_id: optionId,
          })),
        }),
      ).unwrap();

      Toast.show({
        type: 'success',
        text1: 'Assessment submitted',
        text2: 'Your answers were submitted successfully.',
      });

      onComplete?.();
    } catch (submitError) {
      Toast.show({
        type: 'error',
        text1: 'Submission failed',
        text2:
          submitError instanceof Error
            ? submitError.message
            : 'Unable to submit the assessment right now.',
      });
    }
  }, [answers, dispatch, onComplete, testId]);

  useEffect(() => {
    if (!hasStarted || currentResult || secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((currentValue) => currentValue - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [currentResult, hasStarted, secondsLeft]);

  useEffect(() => {
    if (hasStarted && secondsLeft === 0 && !currentResult) {
      void handleSubmitAssessment();
    }
  }, [currentResult, handleSubmitAssessment, hasStarted, secondsLeft]);

  const currentQuestion = currentQuestions[currentIndex];
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  if (isLoading && !currentQuestions.length && !details) {
    return <LoadingScreen label="Loading assessment..." />;
  }

  if ((error || screenError) && !currentQuestions.length) {
    return (
      <ScreenLayout scrollable={false}>
        <ErrorState
          title="Assessment unavailable"
          message={error ?? screenError ?? 'Unable to load this assessment.'}
          onRetry={() => {
            void loadAssessment();
          }}
        />
      </ScreenLayout>
    );
  }

  if (currentResult) {
    return (
      <ScreenLayout>
        <Card variant="elevated" padding="lg">
          <View style={{ gap: 16 }}>
            <Badge
              label={currentResult.passed ? 'Passed' : 'Needs review'}
              variant={currentResult.passed ? 'success' : 'warning'}
            />
            <Text
              style={{
                color: colors.text,
                fontSize: 28,
                fontWeight: '700',
              }}
            >
              Result Summary
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 15 }}>
              You scored {currentResult.score} out of {currentResult.total_marks}.
            </Text>
            <ProgressBar progress={currentResult.percentage} showLabel />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {[
                { label: 'Correct', value: currentResult.correct },
                { label: 'Wrong', value: currentResult.wrong },
                { label: 'Attempted', value: currentResult.attempted },
              ].map((metric) => (
                <View
                  key={metric.label}
                  style={{
                    flex: 1,
                    borderRadius: 14,
                    backgroundColor: colors.background,
                    padding: 14,
                    gap: 6,
                  }}
                >
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {metric.label}
                  </Text>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 20,
                      fontWeight: '700',
                    }}
                  >
                    {metric.value}
                  </Text>
                </View>
              ))}
            </View>
            <Button
              title="Done"
              onPress={() => {
                onExit?.();
              }}
              fullWidth
            />
          </View>
        </Card>
      </ScreenLayout>
    );
  }

  if (!hasStarted) {
    return (
      <ScreenLayout>
        <Card variant="elevated" padding="lg">
          <View style={{ gap: 16 }}>
            <Badge label="Assessment" variant="primary" />
            <Text
              style={{
                color: colors.text,
                fontSize: 26,
                fontWeight: '700',
              }}
            >
              {details?.test_name ?? 'Assessment'}
            </Text>
            {details?.test_description ? (
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 14,
                  lineHeight: 22,
                }}
              >
                {details.test_description}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Badge label={`${currentQuestions.length} questions`} variant="info" />
              <Badge label={`${details?.total_marks ?? 0} marks`} variant="neutral" />
              <Badge
                label={formatDuration(details?.duration_minutes ?? 0)}
                variant="warning"
              />
            </View>
            {details?.instructions ? (
              <Card variant="outlined" padding="md">
                <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 20 }}>
                  {details.instructions}
                </Text>
              </Card>
            ) : null}
            <Button title="Start Assessment" onPress={() => setHasStarted(true)} fullWidth />
          </View>
        </Card>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      {currentQuestion ? (
        <View style={{ gap: 16 }}>
          <Card variant="elevated" padding="lg">
            <View style={{ gap: 14 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <Badge
                  label={`Question ${currentIndex + 1}/${currentQuestions.length}`}
                  variant="primary"
                />
                <Text
                  style={{
                    color: colors.warning,
                    fontSize: 14,
                    fontWeight: '700',
                  }}
                >
                  {formatSeconds(secondsLeft)}
                </Text>
              </View>

              <ProgressBar progress={(answeredCount / currentQuestions.length) * 100} showLabel />

              <Text
                style={{
                  color: colors.text,
                  fontSize: 20,
                  fontWeight: '700',
                  lineHeight: 28,
                }}
              >
                {currentQuestion.question_text}
              </Text>

              <View style={{ gap: 12 }}>
                {currentQuestion.options.map((option) => {
                  const isSelected = answers[currentQuestion.question_id] === option.option_id;

                  return (
                    <Pressable
                      key={option.option_id}
                      onPress={() =>
                        setAnswers((currentAnswers) => ({
                          ...currentAnswers,
                          [currentQuestion.question_id]: option.option_id,
                        }))
                      }
                      style={{
                        borderRadius: 14,
                        borderWidth: 1.5,
                        borderColor: isSelected ? colors.primary : colors.border,
                        backgroundColor: isSelected ? colors.primaryLight : colors.surface,
                        padding: 16,
                      }}
                    >
                      <Text
                        style={{
                          color: isSelected ? colors.primary : colors.text,
                          fontSize: 15,
                          fontWeight: isSelected ? '700' : '500',
                          lineHeight: 22,
                        }}
                      >
                        {option.option_text}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Card>

          <Card variant="elevated" padding="lg">
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <Button
                title="Previous"
                onPress={() => setCurrentIndex((value) => Math.max(0, value - 1))}
                variant="outline"
                disabled={currentIndex === 0}
              />
              {currentIndex === currentQuestions.length - 1 ? (
                <Button
                  title="Submit"
                  onPress={() => {
                    void handleSubmitAssessment();
                  }}
                  loading={isSubmitting}
                />
              ) : (
                <Button
                  title="Next"
                  onPress={() =>
                    setCurrentIndex((value) =>
                      Math.min(currentQuestions.length - 1, value + 1),
                    )
                  }
                />
              )}
            </View>
          </Card>
        </View>
      ) : (
        <EmptyState
          title="No questions available"
          message="This assessment does not contain any published questions yet."
        />
      )}
    </ScreenLayout>
  );
}

