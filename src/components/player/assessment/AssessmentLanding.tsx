import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '../../Button';
import type { AssessmentSessionDetails } from '../../../types/assessmentSession.types';
import { useTheme } from '../../../theme';
import { formatDuration } from '../../../utils';

export type AssessmentLandingProps = {
  details: AssessmentSessionDetails;
  loading?: boolean;
  onStart: () => void;
};

function StatChip({
  label,
  value,
  index,
}: {
  label: string;
  value: string;
  index: number;
}) {
  const { colors } = useTheme();
  return (
    <Animated.View
      entering={FadeInDown.springify().damping(20).stiffness(300).delay(index * 40)}
      style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <Text style={[styles.chipValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.chipLabel, { color: colors.textSecondary }]}>{label}</Text>
    </Animated.View>
  );
}

function statusColor(status: string, colors: ReturnType<typeof useTheme>['colors']) {
  if (status === 'In Progress') return colors.warning;
  if (status === 'Attended' || status === 'Completed') return colors.success;
  if (status === 'Closed' || status === 'Expired') return colors.textTertiary;
  return colors.primary;
}

export function AssessmentLanding({ details, loading, onStart }: AssessmentLandingProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const durationMinutes = details.duration > 0 ? Math.round(details.duration / 60000) : 0;

  const chips = [
    { label: 'Questions', value: String(details.totQuestions) },
    { label: 'Marks', value: String(details.totMarks) },
    ...(durationMinutes > 0 ? [{ label: 'Duration', value: formatDuration(durationMinutes) }] : []),
    { label: 'Attempts', value: String(details.attemptCount) },
  ];

  const canStart =
    details.testStateName === 'Yet to Start' ||
    details.testStateName === 'In Progress' ||
    (details.multiAttempt && details.testStateName === 'Attended');

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 88 }]}>
        <Animated.View entering={FadeInDown.springify().damping(20)}>
          <View style={styles.categoryRow}>
            <Ionicons name="clipboard-outline" size={18} color={colors.primary} />
            <Text style={[styles.category, { color: colors.primary }]}>Assessment</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{details.title}</Text>
          {details.description ? (
            <Text style={[styles.body, { color: colors.textSecondary }]}>{details.description}</Text>
          ) : null}
        </Animated.View>

        <View style={styles.chipRow}>
          {chips.map((chip, index) => (
            <StatChip key={chip.label} {...chip} index={index} />
          ))}
        </View>

        <Animated.View
          entering={FadeInDown.springify().damping(20).delay(160)}
          style={[styles.metaCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          {details.dateFrom ? (
            <MetaRow label="Available from" value={details.dateFrom} />
          ) : null}
          {details.dateTo ? <MetaRow label="Available until" value={details.dateTo} /> : null}
          <View style={styles.statusRow}>
            <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor(details.testStateName, colors)}22` }]}>
              <View
                style={[styles.statusDot, { backgroundColor: statusColor(details.testStateName, colors) }]}
              />
              <Text style={[styles.statusText, { color: statusColor(details.testStateName, colors) }]}>
                {details.testStateName}
              </Text>
            </View>
          </View>
        </Animated.View>

        {details.description ? (
          <Pressable
            onPress={() => setInstructionsOpen((v) => !v)}
            style={[styles.instructionsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.instructionsHeader}>
              <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
              <Text style={[styles.instructionsTitle, { color: colors.text }]}>Instructions</Text>
              <Ionicons
                name={instructionsOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textSecondary}
              />
            </View>
            {instructionsOpen ? (
              <Text style={[styles.instructionsBody, { color: colors.textSecondary }]}>
                {details.description}
              </Text>
            ) : null}
          </Pressable>
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
        <Button
          title={details.testStateName === 'In Progress' ? 'Continue assessment' : 'Start assessment'}
          onPress={onStart}
          loading={loading}
          disabled={!canStart}
          fullWidth
        />
      </View>
    </View>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.metaRow}>
      <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.metaValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { padding: 16, gap: 16 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  category: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  title: { fontSize: 28, fontWeight: '900', lineHeight: 34, marginBottom: 8 },
  body: { fontSize: 15, lineHeight: 22 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    minWidth: '30%',
    flexGrow: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    // @ts-ignore
    borderCurve: 'continuous',
  },
  chipValue: { fontSize: 18, fontWeight: '800' },
  chipLabel: { fontSize: 12, marginTop: 2 },
  metaCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    // @ts-ignore
    borderCurve: 'continuous',
  },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  metaLabel: { fontSize: 14 },
  metaValue: { fontSize: 14, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '700' },
  instructionsCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    // @ts-ignore
    borderCurve: 'continuous',
  },
  instructionsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  instructionsTitle: { flex: 1, fontSize: 15, fontWeight: '700' },
  instructionsBody: { fontSize: 14, lineHeight: 21 },
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
