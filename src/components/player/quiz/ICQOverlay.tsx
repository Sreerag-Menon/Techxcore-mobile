import { useCallback } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

import { QUESTION_TYPE } from '../../../constants/questionTypes';
import type { AssessmentAnswer, AssessmentSessionQuestion } from '../../../types/assessmentSession.types';
import type { ICQAnswerData, ICQAnswerResponse, InCourseQuestion } from '../../../types/course.types';
import { useTheme } from '../../../theme';
import { CommentQuestion } from './CommentQuestion';
import { FillBlankQuestion } from './FillBlankQuestion';
import { MCQQuestion } from './MCQQuestion';

export type ICQOverlayProps = {
  visible: boolean;
  question: InCourseQuestion;
  answerData: ICQAnswerData;
  onAnswered: (response: ICQAnswerResponse, continueToNext?: boolean) => void;
  onContinue: () => void;
  sectionDone: boolean;
};

function toSessionQuestion(question: InCourseQuestion): AssessmentSessionQuestion {
  return {
    id: question.id,
    question: question.question,
    type: question.type,
    section_order: 0,
    section_name: '',
    sequence: question.pos,
    image: question.image,
    points: question.points,
    flagged: 0,
    attempted: 0,
    user_selection: [],
  };
}

function toAssessmentAnswer(answerData: ICQAnswerData): AssessmentAnswer {
  return {
    choices: answerData.choices,
    answers: answerData.answers,
    comments: answerData.comments ?? [],
    reviewStarts: answerData.reviewStarts ?? [],
    reviewEnds: answerData.reviewEnds ?? [],
    questions: [],
  };
}

export function ICQOverlay({
  visible,
  question,
  answerData,
  onAnswered,
  onContinue,
  sectionDone,
}: ICQOverlayProps) {
  const { colors } = useTheme();
  const sessionQuestion = toSessionQuestion(question);
  const assessmentAnswer = toAssessmentAnswer(answerData);

  const handleMcqAnswered = useCallback(
    (selection: string[], autoAdvance?: boolean) => {
      const response: ICQAnswerResponse = { correct: selection, incorrect: [], missed: [] };
      onAnswered(response, autoAdvance);
    },
    [onAnswered],
  );

  const handleFitbAnswered = useCallback(
    (selection: string[]) => {
      onAnswered({ correct: selection, incorrect: [], missed: [] });
    },
    [onAnswered],
  );

  const renderQuestion = () => {
    if (
      question.type === QUESTION_TYPE.MULTIPLE_CHOICE ||
      question.type === QUESTION_TYPE.SURVEY_MULTIPLE_CHOICE
    ) {
      return (
        <MCQQuestion
          question={sessionQuestion}
          answerData={assessmentAnswer}
          onAnswered={handleMcqAnswered}
        />
      );
    }
    if (question.type === QUESTION_TYPE.FILL_IN_THE_BLANK) {
      return (
        <FillBlankQuestion
          question={sessionQuestion}
          onAnswered={handleFitbAnswered}
        />
      );
    }
    if (question.type === QUESTION_TYPE.COMMENT) {
      return (
        <CommentQuestion question={sessionQuestion} onAnswered={handleFitbAnswered} />
      );
    }
    return (
      <Text style={{ color: colors.textSecondary }}>
        Unsupported question type ({question.type})
      </Text>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <Animated.View entering={FadeIn} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} />
        <Animated.View
          entering={SlideInDown.springify().damping(18)}
          style={[styles.sheet, { backgroundColor: colors.background }]}
        >
          <View style={styles.handle} />
          <Text style={[styles.label, { color: colors.textSecondary }]}>In-course question</Text>
          {question.image ? (
            <Image source={{ uri: question.image }} style={styles.image} resizeMode="contain" />
          ) : null}
          {renderQuestion()}
          {sectionDone ? (
            <Pressable
              onPress={onContinue}
              style={[styles.continueBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.continueText}>Continue</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 16,
    maxHeight: '85%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.4)',
    marginBottom: 4,
  },
  label: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  image: { width: '100%', height: 160, borderRadius: 12 },
  continueBtn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
