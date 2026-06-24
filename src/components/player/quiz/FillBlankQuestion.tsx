import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text } from 'react-native';

import Input from '../../Input';
import { MAX_TEST_ANSWER_LENGTH } from '../../../constants/questionTypes';
import type { AssessmentSessionQuestion } from '../../../types/assessmentSession.types';
import { useTheme } from '../../../theme';

export type FillBlankQuestionProps = {
  question: AssessmentSessionQuestion;
  answerData?: { answers?: string[] };
  onAnswered: (selection: string[]) => void;
};

export function FillBlankQuestion({ question, onAnswered }: FillBlankQuestionProps) {
  const { colors } = useTheme();
  const [userAnswer, setUserAnswer] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore answer from question.user_selection when navigating back
  useEffect(() => {
    if (question.user_selection?.length > 0 && question.user_selection[0]) {
      setUserAnswer(question.user_selection[0]);
    } else {
      setUserAnswer('');
    }
  }, [question.id, question.user_selection]);

  // Debounce emit to state — 400ms after the user stops typing
  const handleChange = useCallback(
    (text: string) => {
      setUserAnswer(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onAnswered(text.trim() ? [text] : []);
      }, 400);
    },
    [onAnswered],
  );

  // Flush on unmount (navigation away)
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <Input
        label="Your answer"
        value={userAnswer}
        onChangeText={handleChange}
        multiline
        maxLength={MAX_TEST_ANSWER_LENGTH}
        placeholder="Type your answer"
      />
      <Text style={[styles.counter, { color: colors.textTertiary }]}>
        {userAnswer.length}/{MAX_TEST_ANSWER_LENGTH}
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  counter: { fontSize: 12, textAlign: 'right', marginTop: -4 },
});
