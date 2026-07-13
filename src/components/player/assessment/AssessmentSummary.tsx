import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '../../Button';
import { QUESTION_TYPE } from '../../../constants/questionTypes';
import type { AssessmentSessionDetails, QuestionSummary } from '../../../types/assessmentSession.types';
import { useTheme } from '../../../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const RING_SIZE = 160;
const STROKE = 12;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export type AssessmentSummaryProps = {
  details?: AssessmentSessionDetails;
  summary: QuestionSummary[];
  testQuestions?: Record<string, AssessmentSessionQuestion>;
  testAnswers?: Record<string, AssessmentAnswer>;
  onDone: () => void;
};

// ─── Score Ring ───
function ScoreRing({ percentage }: { percentage: number }) {
  const { colors } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(percentage / 100, { duration: 1200 });
  }, [percentage, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  const ringColor =
    percentage >= 80
      ? '#22c55e'
      : percentage >= 50
        ? colors.primary
        : percentage >= 30
          ? '#f59e0b'
          : colors.error;

  return (
    <View style={styles.ringWrap}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          stroke={`${colors.border}`}
          strokeWidth={STROKE}
          fill="none"
        />
        <AnimatedCircle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          stroke={ringColor}
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          animatedProps={animatedProps}
          rotation="-90"
          origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
        />
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={[styles.ringScore, { color: colors.text }]}>{percentage}%</Text>
      </View>
    </View>
  );
}

function isSubjectiveQuestionType(questionType: number): boolean {
  return questionType === QUESTION_TYPE.COMMENT || questionType === QUESTION_TYPE.ASSIGNMENT;
}

function hasPendingEvaluation(summary: QuestionSummary[]): boolean {
  return summary.some(
    (item) => isSubjectiveQuestionType(item.question_type) && !item.evaluated,
  );
}

function questionStatusLabel(item: QuestionSummary): string {
  if (!item.evaluated && isSubjectiveQuestionType(item.question_type)) {
    return 'Pending evaluation';
  }
  if (item.question_type === QUESTION_TYPE.ASSIGNMENT && item.status === '1') {
    return 'Attempted';
  }
  return item.status === '1' ? 'Correct' : 'Wrong';
}

export function AssessmentSummary({ details, summary, onDone }: AssessmentSummaryProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const pending = hasPendingEvaluation(summary);
  const scorePct =
    details && details.totMarks > 0
      ? Math.round((details.obtMarks / details.totMarks) * 100)
      : 0;
  const passed = scorePct >= 50;
  const grade = gradeLetter(scorePct);
  const gColor = gradeColor(grade);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 88 }]}>
        <View style={styles.hero}>
          {pending ? (
            <View
              style={[
                styles.pendingBanner,
                { backgroundColor: `${colors.warning}22`, borderColor: colors.warning },
              ]}
            >
              <Text style={[styles.pendingTitle, { color: colors.warning }]}>
                Evaluation pending
              </Text>
              <Text style={[styles.pendingBody, { color: colors.textSecondary }]}>
                Summary cannot be displayed as evaluation is pending. Your teacher will review
                subjective answers before final results are available.
              </Text>
            </View>
          ) : (
            <>
              <ScoreRing percentage={scorePct} />
              {details ? (
                <>
                  <Text style={[styles.marks, { color: colors.text }]}>
                    {details.obtMarks} / {details.totMarks}
                  </Text>
                  <View
                    style={[
                      styles.passBadge,
                      { backgroundColor: passed ? `${colors.success}22` : `${colors.error}22` },
                    ]}
                  >
                    <Text style={{ color: passed ? colors.success : colors.error, fontWeight: '800' }}>
                      {passed ? 'Passed' : 'Needs improvement'}
                    </Text>
                  </View>
                </>
              ) : null}
            </>
          )}
        </View>

        {details && !pending ? (
          <View style={[styles.statsRow, { borderColor: colors.border }]}>
            <AnimatedStat label="Correct" value={details.correct} color="#22c55e" delay={100} />
            <AnimatedStat label="Wrong" value={details.incorrect} color={colors.error} delay={200} />
            <AnimatedStat label="Skipped" value={details.unattempted} color={colors.textSecondary} delay={300} />
          </View>
        ) : null}

        {/* Feedback */}
        {details?.feedback ? (
          <Animated.View
            entering={FadeInDown.springify().damping(20).delay(350)}
            style={[styles.feedbackCard, { backgroundColor: `${colors.primary}08`, borderColor: `${colors.primary}22` }]}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
            <Text style={[styles.feedback, { color: colors.text }]}>{details.feedback}</Text>
          </Animated.View>
        ) : null}

        {/* Question Review List */}
        {summary.length > 0 ? (
          <FlatList
            data={summary}
            keyExtractor={(item, index) => `${item.section_order}-${item.question_name}-${index}`}
            scrollEnabled={false}
            contentContainerStyle={{ gap: 10 }}
            renderItem={({ item }) => (
              <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.qTitle, { color: colors.text }]} numberOfLines={2}>
                  {item.question_name}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                  {item.section_name} · {questionStatusLabel(item)}
                  {!pending || item.evaluated ? ` · ${item.obt_marks} marks` : ''}
                </Text>
              </View>
            )}
          />
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.ctaWrap,
          {
            paddingBottom: insets.bottom + 12,
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}
      >
        <Button title="Done" onPress={onDone} fullWidth />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { padding: 16, gap: 20 },
  hero: { alignItems: 'center', gap: 10, paddingVertical: 16 },
  ringWrap: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  ringScore: { fontSize: 32, fontWeight: '900' },
  marks: { fontSize: 16, fontWeight: '600' },
  passBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  pendingBanner: {
    width: '100%',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    // @ts-ignore
    borderCurve: 'continuous',
  },
  pendingTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  pendingBody: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  feedbackCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'flex-start',
    // @ts-ignore
    borderCurve: 'continuous',
  },
  feedback: { flex: 1, fontSize: 14, lineHeight: 21 },
  reviewSection: { gap: 12 },
  reviewTitle: { fontSize: 18, fontWeight: '800' },
  reviewList: { gap: 10 },
  ctaWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
