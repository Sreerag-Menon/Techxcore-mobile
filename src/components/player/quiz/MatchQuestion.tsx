import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Button from '../../Button';
import type {
  AssessmentAnswer,
  AssessmentSessionQuestion,
  MatchAnswerItem,
  MatchSelectionItem,
} from '../../../types/assessmentSession.types';
import { useTheme } from '../../../theme';

export type MatchQuestionProps = {
  question: AssessmentSessionQuestion;
  answerData: AssessmentAnswer;
  onAnswered: (selection: string[], matchSelection: MatchSelectionItem[]) => void;
};

type PairMap = Record<string, MatchAnswerItem | undefined>;

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

export function MatchQuestion({ question, answerData, onAnswered }: MatchQuestionProps) {
  const { colors } = useTheme();
  const leftItems = answerData.questions;
  const rightItems = useMemo(
    () =>
      shuffle(
        answerData.answers.filter((a): a is MatchAnswerItem => typeof a === 'object' && 'answerCode' in a),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shuffle once per question
    [question.id],
  );

  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [pairs, setPairs] = useState<PairMap>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setSelectedLeft(null);
    setPairs({});
    setSubmitted(false);

    if (question.match_selection?.length) {
      const restored: PairMap = {};
      question.match_selection.forEach((item, index) => {
        const left = leftItems[index];
        if (left) restored[left.questionCode] = item;
      });
      setPairs(restored);
    }
  }, [leftItems, question.id, question.match_selection]);

  const pairedRightCodes = useMemo(
    () => new Set(Object.values(pairs).filter(Boolean).map((p) => p!.answerCode)),
    [pairs],
  );

  const handleLeftPress = useCallback(
    (questionCode: string) => {
      if (submitted) return;
      void Haptics.selectionAsync();
      if (pairs[questionCode]) {
        setPairs((prev) => {
          const next = { ...prev };
          delete next[questionCode];
          return next;
        });
        return;
      }
      setSelectedLeft((prev) => (prev === questionCode ? null : questionCode));
    },
    [pairs, submitted],
  );

  const handleRightPress = useCallback(
    (item: MatchAnswerItem) => {
      if (submitted || !selectedLeft) return;
      void Haptics.selectionAsync();

      const existingLeft = Object.entries(pairs).find(([, v]) => v?.answerCode === item.answerCode)?.[0];
      setPairs((prev) => {
        const next = { ...prev };
        if (existingLeft) delete next[existingLeft];
        next[selectedLeft] = item;
        return next;
      });
      setSelectedLeft(null);
    },
    [pairs, selectedLeft, submitted],
  );

  const handleSubmit = useCallback(() => {
    if (submitted) return;
    const matchSelection: MatchSelectionItem[] = leftItems.map(
      (left) => pairs[left.questionCode] ?? { answerCode: '', answer: '' },
    );
    const selection = matchSelection.map((p) => p.answer).filter(Boolean);
    setSubmitted(true);
    onAnswered(selection, matchSelection);
  }, [leftItems, onAnswered, pairs, submitted]);

  const allPaired = leftItems.length > 0 && leftItems.every((l) => Boolean(pairs[l.questionCode]?.answer));

  return (
    <View style={styles.container}>
      <View style={styles.columns}>
        <View style={styles.column}>
          <Text style={[styles.colLabel, { color: colors.textSecondary }]}>Questions</Text>
          {leftItems.map((left, index) => {
            const paired = pairs[left.questionCode];
            const isSelected = selectedLeft === left.questionCode;
            return (
              <Pressable
                key={left.questionCode}
                onPress={() => handleLeftPress(left.questionCode)}
                style={[
                  styles.item,
                  {
                    borderColor: isSelected || paired ? colors.primary : colors.border,
                    backgroundColor: isSelected ? colors.primaryLight : colors.surface,
                  },
                ]}
              >
                <Text style={[styles.badge, { color: colors.primary }]}>
                  {String.fromCharCode(65 + index)}
                </Text>
                <Text style={[styles.itemText, { color: colors.text }]}>{left.question}</Text>
                {paired ? (
                  <Ionicons name="link" size={16} color={colors.primary} />
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.column}>
          <Text style={[styles.colLabel, { color: colors.textSecondary }]}>Answers</Text>
          {rightItems.map((right, index) => {
            const isPaired = pairedRightCodes.has(right.answerCode);
            return (
              <Pressable
                key={right.answerCode}
                onPress={() => handleRightPress(right)}
                disabled={!selectedLeft || submitted}
                style={[
                  styles.item,
                  {
                    borderColor: isPaired ? colors.success : colors.border,
                    backgroundColor: isPaired ? `${colors.success}18` : colors.surface,
                    opacity: !selectedLeft && !isPaired ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={[styles.badge, { color: colors.primary }]}>{index + 1}</Text>
                <Text style={[styles.itemText, { color: colors.text }]}>{right.answer}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
        Tap a question, then tap an answer to pair. Tap a paired item to unpair.
      </Text>

      <Button title="Submit" onPress={handleSubmit} disabled={!allPaired || submitted} fullWidth />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  columns: { flexDirection: 'row', gap: 10 },
  column: { flex: 1, gap: 8 },
  colLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    minHeight: 44,
    // @ts-ignore
    borderCurve: 'continuous',
  },
  badge: { fontSize: 13, fontWeight: '800', width: 18 },
  itemText: { flex: 1, fontSize: 13, lineHeight: 18 },
});
