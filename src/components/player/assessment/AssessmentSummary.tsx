import { useEffect } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '../../Button';
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
  onDone: () => void;
};

function ScoreRing({ percentage }: { percentage: number }) {
  const { colors } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(percentage / 100, { duration: 1200 });
  }, [percentage, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

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
          stroke={colors.primary}
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

export function AssessmentSummary({ details, summary, onDone }: AssessmentSummaryProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const scorePct =
    details && details.totMarks > 0
      ? Math.round((details.obtMarks / details.totMarks) * 100)
      : 0;
  const passed = scorePct >= 50;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 88 }]}>
        <View style={styles.hero}>
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
        </View>

        {details ? (
          <View style={[styles.statsRow, { borderColor: colors.border }]}>
            <Stat label="Correct" value={String(details.correct)} color={colors.success} />
            <Stat label="Wrong" value={String(details.incorrect)} color={colors.error} />
            <Stat label="Skipped" value={String(details.unattempted)} color={colors.textSecondary} />
          </View>
        ) : null}

        {details?.feedback ? (
          <Text style={[styles.feedback, { color: colors.text }]}>{details.feedback}</Text>
        ) : null}

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
                  {item.section_name} · {item.status === '1' ? 'Correct' : 'Wrong'} · {item.obt_marks}{' '}
                  marks
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

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { padding: 16, gap: 16 },
  hero: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  ringWrap: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  ringScore: { fontSize: 32, fontWeight: '900' },
  marks: { fontSize: 16, fontWeight: '600' },
  passBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stat: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 12, fontWeight: '600' },
  feedback: { fontSize: 15, lineHeight: 22 },
  summaryCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    // @ts-ignore
    borderCurve: 'continuous',
  },
  qTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
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
