import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import Button from '../../Button';
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

  useEffect(() => {
    setComment('');
  }, [question.id]);

  const handleSubmit = useCallback(() => {
    const trimmed = comment.trim();
    if (!trimmed) return;
    onAnswered([trimmed]);
  }, [comment, onAnswered]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <Input
        label="Your response"
        value={comment}
        onChangeText={setComment}
        multiline
        numberOfLines={6}
        maxLength={MAX_TEST_COMMENT_LENGTH}
        placeholder="Enter your response"
      />
      <Text style={[styles.counter, { color: colors.textTertiary }]}>
        {comment.length}/{MAX_TEST_COMMENT_LENGTH}
      </Text>
      <Button title="Submit" onPress={handleSubmit} disabled={!comment.trim()} fullWidth />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  counter: { fontSize: 12, textAlign: 'right', marginTop: -4 },
});
