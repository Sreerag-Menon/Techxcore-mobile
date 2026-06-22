import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import Button from '../../Button';
import Input from '../../Input';
import {
  MAX_FILL_IN_THE_BLANK_ERROR_RATE,
  MAX_TEST_ANSWER_LENGTH,
} from '../../../constants/questionTypes';
import type { AssessmentAnswer, AssessmentSessionQuestion } from '../../../types/assessmentSession.types';
import { normalizedLevenshtein } from '../../../utils/levenshtein';
import { useTheme } from '../../../theme';

export type FillBlankQuestionProps = {
  question: AssessmentSessionQuestion;
  answerData: AssessmentAnswer;
  onAnswered: (selection: string[]) => void;
};

type Status = 'idle' | 'typo' | 'incorrect' | 'correct';

export function FillBlankQuestion({ question, answerData, onAnswered }: FillBlankQuestionProps) {
  const { colors } = useTheme();
  const [userAnswer, setUserAnswer] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [submitted, setSubmitted] = useState(false);

  const correctAnswers = answerData.answers.filter((a): a is string => typeof a === 'string');

  useEffect(() => {
    setUserAnswer('');
    setStatus('idle');
    setSubmitted(false);
  }, [question.id]);

  const handleSubmit = useCallback(() => {
    if (submitted || !userAnswer.trim()) return;

    let minErr: number | null = null;
    let foundIdx: number | null = null;
    const lcUserAnswer = userAnswer.toLowerCase().trim();

    correctAnswers.forEach((answer, i) => {
      if (foundIdx === null) {
        const err = normalizedLevenshtein(lcUserAnswer, answer.toLowerCase().trim());
        if (err === 0) foundIdx = i;
        minErr = minErr === null ? err : Math.min(minErr, err);
      }
    });

    let nextTypo = false;
    if (minErr != null && minErr > 0) {
      if (status !== 'typo' && minErr <= MAX_FILL_IN_THE_BLANK_ERROR_RATE) {
        nextTypo = true;
      } else {
        foundIdx = -1;
      }
    }

    if (foundIdx === null && minErr === 0) foundIdx = 0;
    if (foundIdx === null && (minErr == null || minErr > 0) && !nextTypo) foundIdx = -1;

    if (nextTypo) {
      setStatus('typo');
      return;
    }

    setSubmitted(true);
    if (foundIdx !== null && foundIdx >= 0) {
      setStatus('correct');
      onAnswered([userAnswer]);
    } else {
      setStatus('incorrect');
      onAnswered([userAnswer]);
    }
  }, [correctAnswers, onAnswered, status, submitted, userAnswer]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <Input
        label="Your answer"
        value={userAnswer}
        onChangeText={setUserAnswer}
        multiline
        maxLength={MAX_TEST_ANSWER_LENGTH}
        disabled={submitted}
        placeholder="Type your answer"
      />
      <Text style={[styles.counter, { color: colors.textTertiary }]}>
        {userAnswer.length}/{MAX_TEST_ANSWER_LENGTH}
      </Text>

      {status === 'typo' ? (
        <StatusBanner
          icon="warning"
          message="Please try again — you may have misspelled your answer."
          color={colors.warning}
          bg={`${colors.warning}18`}
        />
      ) : null}
      {status === 'incorrect' ? (
        <StatusBanner
          icon="close-circle"
          message="Incorrect answer."
          color={colors.error}
          bg={`${colors.error}18`}
        />
      ) : null}
      {status === 'correct' ? (
        <StatusBanner
          icon="checkmark-circle"
          message="Correct!"
          color={colors.success}
          bg={`${colors.success}18`}
        />
      ) : null}

      <Button
        title="Submit"
        onPress={handleSubmit}
        disabled={!userAnswer.trim() || submitted}
        fullWidth
      />
    </KeyboardAvoidingView>
  );
}

function StatusBanner({
  icon,
  message,
  color,
  bg,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  message: string;
  color: string;
  bg: string;
}) {
  return (
    <View style={[styles.banner, { backgroundColor: bg, borderColor: color }]}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.bannerText, { color }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  counter: { fontSize: 12, textAlign: 'right', marginTop: -4 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    // @ts-ignore
    borderCurve: 'continuous',
  },
  bannerText: { flex: 1, fontSize: 14, fontWeight: '500' },
});
