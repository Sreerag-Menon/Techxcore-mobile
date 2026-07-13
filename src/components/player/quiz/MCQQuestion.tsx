import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { MAX_TEST_COMMENT_LENGTH, QUESTION_TYPE } from '../../../constants/questionTypes';
import type { AssessmentAnswer, AssessmentSessionQuestion } from '../../../types/assessmentSession.types';
import { useTheme } from '../../../theme';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type MCQQuestionProps = {
  question: AssessmentSessionQuestion;
  answerData: AssessmentAnswer;
  onAnswered: (selection: string[], autoAdvance?: boolean) => void;
  onAutoAdvance?: () => void;
};

function ChoiceRow({
  index,
  choice,
  isSelected,
  disabled,
  onPress,
}: {
  index: number;
  choice: { answerText: string; answerImage?: string };
  isSelected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const [imageOpen, setImageOpen] = useState(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (disabled) return;
    void Haptics.selectionAsync();
    scale.value = withSpring(0.95, { damping: 20, stiffness: 300 }, () => {
      scale.value = withSpring(1, { damping: 20, stiffness: 300 });
    });
    onPress();
  };

  return (
    <>
      <AnimatedPressable
        onPress={handlePress}
        disabled={disabled}
        style={[
          animatedStyle,
          styles.choice,
          {
            borderColor: isSelected ? colors.primary : colors.border,
            backgroundColor: isSelected ? colors.primaryLight : colors.surface,
            opacity: disabled ? 0.6 : 1,
            // @ts-ignore
            borderCurve: 'continuous',
          },
        ]}
      >
        <View
          style={[
            styles.letterBadge,
            {
              backgroundColor: isSelected ? colors.primary : `${colors.primary}22`,
            },
          ]}
        >
          <Text style={[styles.letter, { color: isSelected ? colors.onPrimary : colors.primary }]}>
            {LETTERS[index] ?? String(index + 1)}
          </Text>
        </View>
        <Text style={[styles.choiceText, { color: colors.text }]}>{choice.answerText}</Text>
        {choice.answerImage ? (
          <Pressable onPress={() => setImageOpen(true)}>
            <Image source={{ uri: choice.answerImage }} style={styles.thumb} />
          </Pressable>
        ) : null}
      </AnimatedPressable>
      <Modal visible={imageOpen} transparent animationType="fade" onRequestClose={() => setImageOpen(false)}>
        <Pressable style={styles.imageModal} onPress={() => setImageOpen(false)}>
          <Image source={{ uri: choice.answerImage }} style={styles.imageFull} resizeMode="contain" />
        </Pressable>
      </Modal>
    </>
  );
}

export function MCQQuestion({ question, answerData, onAnswered, onAutoAdvance }: MCQQuestionProps) {
  const { colors } = useTheme();
  const [selected, setSelected] = useState<number[]>([]);

  const isSurvey = question.type === QUESTION_TYPE.SURVEY_MULTIPLE_CHOICE;
  const isSingleSelect =
    question.type === QUESTION_TYPE.MULTIPLE_CHOICE_SINGLE ||
    (question.type === QUESTION_TYPE.MULTIPLE_CHOICE && question.max_selection === 1);
  const maxSelection = question.max_selection ?? 0;

  // Restore from user_selection (web stores 0-based indices as strings, e.g. ["0","1"])
  useEffect(() => {
    const restored = (question.user_selection ?? [])
      .map(Number)
      .filter((n) => !Number.isNaN(n) && n >= 0 && n < answerData.choices.length);
    setSelected(restored);
    setSubmitted(restored.length > 0);
  }, [answerData.choices.length, question.id, question.user_selection]);

  const handleChoicePress = useCallback(
    (index: number) => {
      setSelected((prev) => {
        const idx = prev.indexOf(index);
        let next: number[];

        if (idx !== -1) {
          next = prev.filter((i) => i !== index);
        } else if (isSingleSelect) {
          next = [index];
        } else if (maxSelection > 0 && prev.length >= maxSelection) {
          return prev;
        } else {
          next = [...prev, index];
        }

        // For survey, auto-advance after first selection
        if (isSurvey && next.length > 0) {
          const selection = next.map((i) => String(i));
          queueMicrotask(() => {
            emitSelection(next, true);
            setTimeout(() => onAutoAdvance?.(), 300);
          });
        } else {
          // Emit on every change — answer is saved in state, not DB
          queueMicrotask(() => emitSelection(next));
        }

        return next;
      });
    },
    [isSingleSelect, isSurvey, maxSelection, onAnswered, onAutoAdvance, submitted],
  );

  const handleSubmit = useCallback(() => {
    if (submitted || selected.length === 0) return;
    setSubmitted(true);
    const selection = selected.map((i) => String(i));
    onAnswered(selection);
  }, [onAnswered, selected, submitted]);

  const selectionHint = useMemo(() => {
    if (isSurvey || isSingleSelect) return null;
    if (maxSelection > 1) return `Select up to ${maxSelection}`;
    if (maxSelection === 0) return 'Select all that apply';
    return null;
  }, [isSingleSelect, isSurvey, maxSelection]);

  return (
    <View style={styles.container}>
      {selectionHint ? (
        <Text style={[styles.hint, { color: colors.textSecondary }]}>{selectionHint}</Text>
      ) : null}
      <View style={styles.choices}>
        {answerData.choices.map((choice, i) => (
          <ChoiceRow
            key={`${choice.answerText}-${i}`}
            index={i}
            choice={choice}
            isSelected={selected.includes(i)}
            disabled={false}
            onPress={() => handleChoicePress(i)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  hint: { fontSize: 13, fontWeight: '500' },
  choices: { gap: 10 },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    minHeight: 52,
  },
  letterBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: { fontSize: 14, fontWeight: '800' },
  choiceText: { flex: 1, fontSize: 15, lineHeight: 21 },
  thumb: { width: 48, height: 48, borderRadius: 8 },
  imageModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  imageFull: { width: '100%', height: '80%' },
});
