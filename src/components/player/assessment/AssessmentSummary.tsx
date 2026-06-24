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
import type {
  AssessmentAnswer,
  AssessmentSessionDetails,
  AssessmentSessionQuestion,
  QuestionSummary,
} from '../../../types/assessmentSession.types';
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

// ─── Grade Badge ───
function gradeLetter(pct: number): string {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  return 'F';
}

function gradeColor(grade: string): string {
  if (grade.startsWith('A')) return '#22c55e';
  if (grade === 'B') return '#0D9488';
  if (grade === 'C') return '#f59e0b';
  if (grade === 'D') return '#f97316';
  return '#ef4444';
}

// ─── Animated Counter Stat ───
function AnimatedStat({
  label,
  value,
  color,
  delay,
}: {
  label: string;
  value: number;
  color: string;
  delay: number;
}) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    let frame = 0;
    const duration = 800;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      setDisplayed(Math.round(progress * value));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };
    const timeout = setTimeout(() => {
      frame = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(frame);
    };
  }, [delay, value]);

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(20).stiffness(300).delay(delay)}
      style={statStyles.wrap}
    >
      <Text style={[statStyles.value, { color }]}>{displayed}</Text>
      <Text style={[statStyles.label, { color }]}>{label}</Text>
    </Animated.View>
  );
}

const statStyles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 2 },
  value: { fontSize: 22, fontWeight: '900' },
  label: { fontSize: 12, fontWeight: '600' },
});

// ─── Expandable Question Review Card ───
function QuestionReviewCard({
  item,
  index,
  testQuestions,
  testAnswers,
}: {
  item: QuestionSummary;
  index: number;
  testQuestions?: Record<string, AssessmentSessionQuestion>;
  testAnswers?: Record<string, AssessmentAnswer>;
}) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const isCorrect = item.status === '1';
  const isEvaluated = item.evaluated;
  const statusColor = isCorrect ? '#22c55e' : '#ef4444';
  const statusIcon = isCorrect ? 'checkmark-circle' : 'close-circle';
  const statusLabel = isCorrect ? 'Correct' : 'Wrong';

  // Try to find the student's answer from cached data
  const questionEntry = testQuestions
    ? Object.values(testQuestions).find(
        (q) => q.question === item.question_name || q.id === String(index),
      )
    : undefined;
  const studentAnswer = questionEntry?.user_selection?.join(', ') || '—';

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(20).stiffness(280).delay(200 + index * 50)}
    >
      <Pressable
        onPress={() => {
          void Haptics.selectionAsync();
          setExpanded((v) => !v);
        }}
        style={[
          reviewStyles.card,
          {
            backgroundColor: colors.surface,
            borderColor: isCorrect ? `${statusColor}44` : `${statusColor}44`,
            borderLeftColor: statusColor,
          },
        ]}
      >
        {/* Header */}
        <View style={reviewStyles.header}>
          <View style={[reviewStyles.statusDot, { backgroundColor: statusColor }]}>
            <Ionicons name={statusIcon} size={14} color="#fff" />
          </View>
          <View style={reviewStyles.headerText}>
            <Text style={[reviewStyles.qTitle, { color: colors.text }]} numberOfLines={expanded ? undefined : 2}>
              {item.question_name}
            </Text>
            <Text style={[reviewStyles.meta, { color: colors.textSecondary }]}>
              {item.section_name} · {item.obt_marks} marks · {statusLabel}
            </Text>
          </View>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textTertiary}
          />
        </View>

        {/* Expanded details */}
        {expanded ? (
          <View style={reviewStyles.details}>
            <View style={reviewStyles.answerRow}>
              <Text style={[reviewStyles.answerLabel, { color: colors.textSecondary }]}>
                Your answer
              </Text>
              <Text style={[reviewStyles.answerValue, { color: isCorrect ? '#22c55e' : '#ef4444' }]}>
                {studentAnswer}
              </Text>
            </View>

            {!isCorrect && item.answers && item.answers.length > 0 ? (
              <View style={reviewStyles.answerRow}>
                <Text style={[reviewStyles.answerLabel, { color: colors.textSecondary }]}>
                  Correct answer
                </Text>
                <Text style={[reviewStyles.answerValue, { color: '#22c55e' }]}>
                  {item.answers.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(', ')}
                </Text>
              </View>
            ) : null}

            {item.feedback ? (
              <View style={[reviewStyles.feedbackBox, { backgroundColor: `${colors.primary}10` }]}>
                <Ionicons name="chatbubble-outline" size={14} color={colors.primary} />
                <Text style={[reviewStyles.feedbackText, { color: colors.textSecondary }]}>
                  {item.feedback}
                </Text>
              </View>
            ) : null}

            {!isEvaluated ? (
              <Text style={[reviewStyles.pendingLabel, { color: colors.warning }]}>
                ⏳ Pending evaluation
              </Text>
            ) : null}
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const reviewStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 14,
    gap: 10,
    // @ts-ignore
    borderCurve: 'continuous',
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  statusDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  headerText: { flex: 1, gap: 3 },
  qTitle: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  meta: { fontSize: 12 },
  details: { gap: 10, paddingTop: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e2e8f022' },
  answerRow: { gap: 2 },
  answerLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  answerValue: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  feedbackBox: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    alignItems: 'flex-start',
  },
  feedbackText: { flex: 1, fontSize: 13, lineHeight: 19 },
  pendingLabel: { fontSize: 12, fontWeight: '600' },
});

// ─── Main Summary Component ───
export function AssessmentSummary({ details, summary, testQuestions, testAnswers, onDone }: AssessmentSummaryProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
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
        {/* Hero */}
        <Animated.View
          entering={FadeInDown.springify().damping(20)}
          style={styles.hero}
        >
          <ScoreRing percentage={scorePct} />
          {details ? (
            <>
              <Text style={[styles.marks, { color: colors.text }]}>
                {details.obtMarks} / {details.totMarks}
              </Text>
              <View style={styles.gradeRow}>
                <View
                  style={[
                    styles.gradeBadge,
                    { backgroundColor: `${gColor}22`, borderColor: `${gColor}44` },
                  ]}
                >
                  <Text style={[styles.gradeText, { color: gColor }]}>{grade}</Text>
                </View>
                <View
                  style={[
                    styles.passBadge,
                    { backgroundColor: passed ? `#22c55e22` : `${colors.error}22` },
                  ]}
                >
                  <Ionicons
                    name={passed ? 'checkmark-circle' : 'alert-circle'}
                    size={16}
                    color={passed ? '#22c55e' : colors.error}
                  />
                  <Text style={{ color: passed ? '#22c55e' : colors.error, fontWeight: '700', fontSize: 13 }}>
                    {passed ? 'Passed' : 'Needs improvement'}
                  </Text>
                </View>
              </View>
            </>
          ) : null}
        </Animated.View>

        {/* Stats */}
        {details ? (
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
          <View style={styles.reviewSection}>
            <Animated.Text
              entering={FadeInDown.springify().damping(20).delay(150)}
              style={[styles.reviewTitle, { color: colors.text }]}
            >
              Question Review
            </Animated.Text>
            <View style={styles.reviewList}>
              {summary.map((item, index) => (
                <QuestionReviewCard
                  key={`${item.section_order}-${item.question_name}-${index}`}
                  item={item}
                  index={index}
                  testQuestions={testQuestions}
                  testAnswers={testAnswers}
                />
              ))}
            </View>
          </View>
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
  gradeRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  gradeBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    // @ts-ignore
    borderCurve: 'continuous',
  },
  gradeText: { fontSize: 18, fontWeight: '900' },
  passBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
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
