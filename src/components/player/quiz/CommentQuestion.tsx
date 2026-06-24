import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text } from 'react-native';

import Input from '../../Input';
import { MAX_TEST_COMMENT_LENGTH } from '../../../constants/questionTypes';
import type { AssessmentSessionQuestion } from '../../../types/assessmentSession.types';
import { useTheme } from '../../../theme';

export type CommentQuestionProps = {
  question: AssessmentSessionQuestion;
  onAnswered: (selection: string[]) => void;
};

export function CommentQuestion({ question, onAnswered }: CommentQuestionProps) {
  const { colors } = useTheme();
  const [comment, setComment] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore from user_selection on navigation back
  useEffect(() => {
    if (question.user_selection?.length > 0 && question.user_selection[0]) {
      setComment(question.user_selection[0]);
    } else {
      setComment('');
    }
  }, [question.id, question.user_selection]);

  // Debounce emit — answer goes to state only; DB save requires explicit Save press
  const handleChange = useCallback(
    (text: string) => {
      setComment(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const trimmed = text.trim();
        onAnswered(trimmed ? [trimmed] : []);
      }, 400);
    },
    [onAnswered],
  );

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
        label="Your response"
        value={comment}
        onChangeText={handleChange}
        multiline
        numberOfLines={6}
        maxLength={MAX_TEST_COMMENT_LENGTH}
        placeholder="Enter your response"
      />
      <Text style={[styles.counter, { color: colors.textTertiary }]}>
        {comment.length}/{MAX_TEST_COMMENT_LENGTH}
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  counter: { fontSize: 12, textAlign: 'right', marginTop: -4 },
});
