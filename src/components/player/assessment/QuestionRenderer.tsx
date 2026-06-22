import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { QUESTION_TYPE } from '../../../constants/questionTypes';
import type { AssessmentAnswer, AssessmentSessionQuestion } from '../../../types/assessmentSession.types';
import { useTheme } from '../../../theme';
import { QuestionMedia } from './QuestionMedia';
import { AssignmentQuestion } from '../quiz/AssignmentQuestion';
import { CommentQuestion } from '../quiz/CommentQuestion';
import { FillBlankQuestion } from '../quiz/FillBlankQuestion';
import { MatchQuestion } from '../quiz/MatchQuestion';
import { MCQQuestion } from '../quiz/MCQQuestion';

export type QuestionRendererProps = {
  question: AssessmentSessionQuestion;
  answerData: AssessmentAnswer;
  onAnswer: (selection: string[], matchSelection?: AssessmentSessionQuestion['match_selection']) => void;
  onAutoAdvance?: () => void;
};

function UnsupportedQuestion({ type }: { type: number }) {
  const { colors } = useTheme();
  return (
    <Text style={{ color: colors.textSecondary }}>
      Question type {type} is not supported on mobile yet.
    </Text>
  );
}

export function QuestionRenderer({
  question,
  answerData,
  onAnswer,
  onAutoAdvance,
}: QuestionRendererProps) {
  const { colors } = useTheme();
  const mediaContent = question.content ?? question.media_link;
  const mediaFormat = question.content_format ?? (question.media_link ? 3 : undefined);

  const handleMcqAnswered = useCallback(
    (selection: string[], autoAdvance?: boolean) => {
      onAnswer(selection);
      if (autoAdvance) onAutoAdvance?.();
    },
    [onAnswer, onAutoAdvance],
  );

  const renderBody = () => {
    switch (question.type) {
      case QUESTION_TYPE.MULTIPLE_CHOICE:
      case QUESTION_TYPE.SURVEY_MULTIPLE_CHOICE:
      case QUESTION_TYPE.MULTIPLE_CHOICE_SINGLE:
        return (
          <MCQQuestion
            question={question}
            answerData={answerData}
            onAnswered={handleMcqAnswered}
            onAutoAdvance={onAutoAdvance}
          />
        );
      case QUESTION_TYPE.FILL_IN_THE_BLANK:
        return (
          <FillBlankQuestion
            question={question}
            answerData={answerData}
            onAnswered={(selection) => onAnswer(selection)}
          />
        );
      case QUESTION_TYPE.COMMENT:
        return (
          <CommentQuestion
            question={question}
            onAnswered={(selection) => onAnswer(selection)}
          />
        );
      case QUESTION_TYPE.ASSIGNMENT:
        return (
          <AssignmentQuestion
            question={question}
            onAnswered={(selection) => onAnswer(selection)}
          />
        );
      case QUESTION_TYPE.MATCH_THE_FOLLOWING:
        return (
          <MatchQuestion
            question={question}
            answerData={answerData}
            onAnswered={(selection, matchSelection) => onAnswer(selection, matchSelection)}
          />
        );
      default:
        return <UnsupportedQuestion type={question.type} />;
    }
  };

  return (
    <View style={styles.container}>
      {mediaContent ? (
        <QuestionMedia content={mediaContent} format={mediaFormat} />
      ) : null}
      <Text style={[styles.questionText, { color: colors.text }]}>{question.question}</Text>
      {renderBody()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16, paddingBottom: 8 },
  questionText: { fontSize: 18, fontWeight: '700', lineHeight: 26 },
});
