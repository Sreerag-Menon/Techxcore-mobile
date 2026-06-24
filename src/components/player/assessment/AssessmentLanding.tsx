import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
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

function statusColor(status: string, colors: ReturnType<typeof useTheme>['colors']) {
  if (status === 'In Progress') return colors.warning;
  if (status === 'Attended' || status === 'Completed') return colors.success;
  if (status === 'Closed' || status === 'Expired') return colors.textTertiary;
  return colors.primary;
}

function ReadinessItem({
  icon,
  label,
  value,
  index,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  index: number;
}) {
  const { colors } = useTheme();
  return (
    <Animated.View
      entering={FadeInDown.springify().damping(20).stiffness(300).delay(200 + index * 60)}
      style={[readyStyles.row, { borderColor: colors.border }]}
    >
      <View style={[readyStyles.iconWrap, { backgroundColor: colors.primaryLight }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={readyStyles.text}>
        <Text style={[readyStyles.label, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[readyStyles.value, { color: colors.text }]}>{value}</Text>
      </View>
      <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
    </Animated.View>
  );
}

const readyStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    // @ts-ignore
    borderCurve: 'continuous',
  },
  text: { flex: 1, gap: 2 },
  label: { fontSize: 12, fontWeight: '600' },
  value: { fontSize: 14, fontWeight: '700' },
});

export function AssessmentLanding({ details, loading, onStart }: AssessmentLandingProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const durationMinutes = details.duration > 0 ? Math.round(details.duration / 60000) : 0;

  const canStart =
    details.testStateName === 'Yet to Start' ||
    details.testStateName === 'In Progress' ||
    (details.multiAttempt && details.testStateName === 'Attended');

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 88 }]}>
        {/* Hero Header */}
        <Animated.View
          entering={FadeInDown.springify().damping(20)}
          style={styles.heroWrap}
        >
          <LinearGradient
            colors={[colors.primaryLight, `${colors.primary}18`, 'transparent']}
            style={styles.heroBg}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.heroContent}>
            <View style={[styles.heroIcon, { backgroundColor: `${colors.primary}22` }]}>
              <Ionicons name="clipboard" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{details.title}</Text>
            {details.description ? (
              <Text style={[styles.body, { color: colors.textSecondary }]} numberOfLines={3}>
                {details.description}
              </Text>
            ) : null}
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor(details.testStateName, colors)}18` }]}>
              <View
                style={[styles.statusDot, { backgroundColor: statusColor(details.testStateName, colors) }]}
              />
              <Text style={[styles.statusText, { color: statusColor(details.testStateName, colors) }]}>
                {details.testStateName}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Stat Chips */}
        <View style={styles.chipRow}>
          <StatChip
            icon="help-circle-outline"
            label="Questions"
            value={String(details.totQuestions)}
            index={0}
          />
          <StatChip
            icon="ribbon-outline"
            label="Total Marks"
            value={String(details.totMarks)}
            index={1}
          />
          {durationMinutes > 0 ? (
            <StatChip
              icon="timer-outline"
              label="Duration"
              value={formatDuration(durationMinutes)}
              index={2}
            />
          ) : null}
          <StatChip
            icon="refresh-outline"
            label="Attempts"
            value={String(details.attemptCount)}
            index={3}
          />
        </View>

        {/* Readiness Checklist */}
        <Animated.View
          entering={FadeInDown.springify().damping(20).delay(180)}
          style={[styles.readinessCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.readinessTitle, { color: colors.text }]}>Before you begin</Text>
          <ReadinessItem
            icon="help-circle-outline"
            label="Questions"
            value={`${details.totQuestions} questions to answer`}
            index={0}
          />
          {durationMinutes > 0 ? (
            <ReadinessItem
              icon="timer-outline"
              label="Time limit"
              value={`${formatDuration(durationMinutes)} total`}
              index={1}
            />
          ) : (
            <ReadinessItem
              icon="timer-outline"
              label="Time limit"
              value="No time limit"
              index={1}
            />
          )}
          <ReadinessItem
            icon="ribbon-outline"
            label="Marks"
            value={`${details.totMarks} marks available`}
            index={2}
          />
          {details.dateFrom ? (
            <ReadinessItem
              icon="calendar-outline"
              label="Available from"
              value={details.dateFrom}
              index={3}
            />
          ) : null}
          {details.dateTo ? (
            <ReadinessItem
              icon="calendar-outline"
              label="Available until"
              value={details.dateTo}
              index={4}
            />
          ) : null}
        </Animated.View>

        {/* Instructions */}
        {details.description ? (
          <Animated.View
            entering={FadeInDown.springify().damping(20).delay(300)}
          >
            <Pressable
              onPress={() => {
                void Haptics.selectionAsync();
                setInstructionsOpen((v) => !v);
              }}
              style={[styles.instructionsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.instructionsHeader}>
                <View style={[styles.instructionIcon, { backgroundColor: `${colors.primary}15` }]}>
                  <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                </View>
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
          </Animated.View>
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
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onStart();
          }}
          loading={loading}
          disabled={!canStart}
          fullWidth
        />
      </View>
    </View>
  );
}

// ─── Stat Chip ───
function StatChip({
  icon,
  label,
  value,
  index,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  index: number;
}) {
  const { colors } = useTheme();
  return (
    <Animated.View
      entering={FadeInDown.springify().damping(20).stiffness(300).delay(80 + index * 50)}
      style={[chipStyles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={[chipStyles.value, { color: colors.text }]}>{value}</Text>
      <Text style={[chipStyles.label, { color: colors.textSecondary }]}>{label}</Text>
    </Animated.View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    minWidth: '46%',
    flexGrow: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    // @ts-ignore
    borderCurve: 'continuous',
  },
  value: { fontSize: 20, fontWeight: '900' },
  label: { fontSize: 11, fontWeight: '600' },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { padding: 16, gap: 16 },
  heroWrap: {
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  heroBg: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6,
  },
  heroContent: {
    padding: 24,
    paddingTop: 32,
    alignItems: 'center',
    gap: 10,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    // @ts-ignore
    borderCurve: 'continuous',
  },
  title: { fontSize: 24, fontWeight: '900', lineHeight: 30, textAlign: 'center' },
  body: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 4,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '700' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  readinessCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    // @ts-ignore
    borderCurve: 'continuous',
  },
  readinessTitle: {
    fontSize: 16,
    fontWeight: '800',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 4,
  },
  instructionsCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    // @ts-ignore
    borderCurve: 'continuous',
  },
  instructionsHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  instructionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
