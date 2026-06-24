import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

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
  questionNumber?: number;
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
  questionNumber,
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
      {/* Question number badge */}
      {questionNumber ? (
        <Animated.View
          entering={FadeInDown.springify().damping(22).stiffness(300).delay(40)}
          style={[styles.qBadge, { backgroundColor: colors.primaryLight }]}
        >
          <Text style={[styles.qBadgeText, { color: colors.primary }]}>
            Q{questionNumber}
            {question.section_name ? ` · ${question.section_name}` : ''}
          </Text>
        </Animated.View>
      ) : null}

      {/* Media */}
      {mediaContent ? (
        <Animated.View entering={FadeInDown.springify().damping(20).delay(80)}>
          <QuestionMedia content={mediaContent} format={mediaFormat} />
        </Animated.View>
      ) : null}

      {/* Question text */}
      <Animated.Text
        entering={FadeInDown.springify().damping(20).delay(120)}
        style={[styles.questionText, { color: colors.text }]}
      >
        {question.question}
      </Animated.Text>

      {/* Answer body */}
      <Animated.View entering={FadeInDown.springify().damping(20).delay(180)}>
        {renderBody()}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16, paddingBottom: 8 },
  qBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  qBadgeText: { fontSize: 12, fontWeight: '800' },
  questionText: { fontSize: 18, fontWeight: '700', lineHeight: 26 },
});
