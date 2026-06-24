import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  FadeOutDown,
  FadeOutUp,
  LinearTransition,
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import Svg, { Circle } from 'react-native-svg';

import Button from '../../Button';
import { ErrorState, LoadingScreen } from '../../index';
import { LiquidGlassView } from '../../ui/LiquidGlassView';
import { useAssessmentEngine } from '../../../hooks/useAssessmentEngine';
import { useTheme } from '../../../theme';
import { logAssessmentGate } from '../../../utils/assessmentDiagnostics';
import { AssessmentLanding } from './AssessmentLanding';
import { AssessmentSummary } from './AssessmentSummary';
import { AssessmentTimer } from './AssessmentTimer';
import {
  QuestionPaletteSheet,
  useQuestionPaletteRef,
} from './QuestionPaletteSheet';
import { QuestionRenderer } from './QuestionRenderer';

// ───────── Animated circular mini-progress ─────────
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const MINI_RING = 44;
const MINI_STROKE = 3.5;
const MINI_R = (MINI_RING - MINI_STROKE) / 2;
const MINI_C = 2 * Math.PI * MINI_R;

function MiniProgress({ current, total }: { current: number; total: number }) {
  const { colors } = useTheme();
  const pct = total > 0 ? current / total : 0;

  return (
    <View style={miniStyles.wrap}>
      <Svg width={MINI_RING} height={MINI_RING}>
        <Circle
          cx={MINI_RING / 2}
          cy={MINI_RING / 2}
          r={MINI_R}
          stroke={`${colors.border}`}
          strokeWidth={MINI_STROKE}
          fill="none"
        />
        <Circle
          cx={MINI_RING / 2}
          cy={MINI_RING / 2}
          r={MINI_R}
          stroke={colors.primary}
          strokeWidth={MINI_STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${MINI_C} ${MINI_C}`}
          strokeDashoffset={MINI_C * (1 - pct)}
          rotation="-90"
          origin={`${MINI_RING / 2}, ${MINI_RING / 2}`}
        />
      </Svg>
      <View style={miniStyles.center}>
        <Text style={[miniStyles.num, { color: colors.text }]}>{current}</Text>
        <Text style={[miniStyles.denom, { color: colors.textTertiary }]}>/{total}</Text>
      </View>
    </View>
  );
}

const miniStyles = StyleSheet.create({
  wrap: { width: MINI_RING, height: MINI_RING, alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', alignItems: 'center', flexDirection: 'row', gap: 1 },
  num: { fontSize: 12, fontWeight: '900' },
  denom: { fontSize: 10, fontWeight: '600' },
});

// ───────── Main screen ─────────
export type AssessmentPlayerScreenProps = {
  publishId: number;
  coursePublishId?: number;
  courseId?: number;
  curriculumId?: number;
  memberId?: number;
  acadYearId?: number;
  chapterId?: number;
  classId?: number;
  onComplete?: () => void;
  onAllViewed?: () => void;
};

function AssessmentPlayerContent({
  publishId,
  coursePublishId,
  courseId,
  curriculumId,
  memberId,
  acadYearId,
  chapterId,
  classId,
  onComplete,
  onAllViewed,
}: AssessmentPlayerScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const paletteRef = useQuestionPaletteRef();

  const {
    phase,
    sessionDetails,
    detailsLoading,
    detailsError,
    stubLoading,
    questionsLoading,
    studentAssessmentId,
    testAnswers,
    testQuestions,
    questionSection,
    questionIds,
    selectedItem,
    selectedQuestion,
    summary,
    stats,
    remainingMs,
    hasUnsavedChanges,
    startAssessment,
    updateElapsedTime,
    save,
    cancel,
    submit,
    exit,
    flag,
    navigate,
    navigateRelative,
    answerQuestion,
    viewSummary,
  } = useAssessmentEngine({ publishId, coursePublishId, courseId, curriculumId, memberId, acadYearId, chapterId, classId });

  const [sections, setSections] = useState(questionSection);
  const submittedHandledRef = useRef(false);
  // Track navigation direction for card slide animation
  const [navDirection, setNavDirection] = useState<'next' | 'prev'>('next');
  // Unique key to force remount for card animation
  const [cardKey, setCardKey] = useState(0);

  useEffect(() => {
    if (questionSection.length > 0) setSections(questionSection);
  }, [questionSection]);

  useEffect(() => {
    if (phase !== 'submitted') {
      submittedHandledRef.current = false;
      return;
    }
    if (sessionDetails?.summary_viewable && studentAssessmentId > 0) {
      viewSummary();
      return;
    }
    if (submittedHandledRef.current) return;
    submittedHandledRef.current = true;
    onAllViewed?.();
    onComplete?.();
  }, [
    phase,
    sessionDetails?.summary_viewable,
    studentAssessmentId,
    viewSummary,
    onAllViewed,
    onComplete,
  ]);

  // Animate card on selectedItem change
  useEffect(() => {
    setCardKey((k) => k + 1);
  }, [selectedItem]);

  const toggleSection = useCallback((sectionOrder: number) => {
    setSections((prev) =>
      prev.map((s) =>
        s.section_order === sectionOrder ? { ...s, open: !(s.open ?? true) } : s,
      ),
    );
  }, []);

  const handleSave = useCallback(async () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await save();
      Toast.show({ type: 'success', text1: 'Assessment saved' });
    } catch {
      Toast.show({ type: 'error', text1: 'Save failed' });
    }
  }, [save]);

  const handleSubmit = useCallback(async () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const parts: string[] = [];
    if (stats.unattempted > 0) parts.push(`${stats.unattempted} unattempted`);
    if (stats.flagged > 0) parts.push(`${stats.flagged} flagged`);
    const detail = parts.length > 0 ? ` You have ${parts.join(' and ')}.` : '';

    Alert.alert('Submit assessment?', `Are you sure you want to submit?${detail}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Submit',
        style: 'destructive',
        onPress: () => {
          void submit().catch(() => {
            Toast.show({ type: 'error', text1: 'Submit failed' });
          });
        },
      },
    ]);
  }, [stats.flagged, stats.unattempted, submit]);

  const handleExit = useCallback(() => {
    Alert.alert('Exit assessment?', 'Your progress will be saved. Exit now?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Exit', onPress: () => void exit() },
    ]);
  }, [exit]);

  const handleCancel = useCallback(() => {
    Alert.alert(
      'Discard unsaved answers?',
      'This will reset changes since your last Save. Your submitted answers will be kept.',
      [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            cancel();
          },
        },
      ],
    );
  }, [cancel]);

  const handleNavigate = useCallback(
    (dir: 'next' | 'prev') => {
      void Haptics.selectionAsync();
      setNavDirection(dir);
      navigateRelative(dir);
    },
    [navigateRelative],
  );

  const swipeGesture = Gesture.Pan().onEnd((e) => {
    if (Math.abs(e.translationX) < 60) return;
    if (e.translationX < 0) handleNavigate('next');
    else handleNavigate('prev');
  });

  useEffect(() => {
    if (phase !== 'loading' && !detailsLoading && !questionsLoading) return;
    logAssessmentGate(
      'screen_loader',
      true,
      {
        publishId,
        coursePublishId,
        courseId,
        curriculumId,
        phase,
        detailsLoading,
        questionsLoading,
        studentAssessmentId,
        testStateName: sessionDetails?.testStateName,
      },
      [
        phase === 'loading' && 'phase_loading',
        detailsLoading && 'details_loading',
        questionsLoading && 'questions_loading',
      ]
        .filter(Boolean)
        .join(','),
    );
  }, [
    courseId,
    coursePublishId,
    curriculumId,
    detailsLoading,
    phase,
    publishId,
    questionsLoading,
    sessionDetails?.testStateName,
    studentAssessmentId,
  ]);

  if (phase === 'loading' || detailsLoading || questionsLoading) {
    return <LoadingScreen />;
  }

  if (detailsError || !sessionDetails) {
    return <ErrorState message="Unable to load assessment details." onRetry={() => void startAssessment()} />;
  }

  if (phase === 'landing') {
    return (
      <AssessmentLanding
        details={sessionDetails}
        loading={stubLoading}
        onStart={() => void startAssessment()}
      />
    );
  }

  if (phase === 'summary') {
    return (
      <AssessmentSummary
        details={sessionDetails}
        summary={summary}
        testQuestions={testQuestions}
        testAnswers={testAnswers}
        onDone={() => onComplete?.()}
      />
    );
  }

  if (phase === 'submitted') {
    return <LoadingScreen label="Processing submission..." />;
  }

  const selected = selectedQuestion;
  const selectedIndex = selectedItem ? questionIds.indexOf(selectedItem) : -1;
  const emptyAnswer = {
    choices: [],
    answers: [],
    comments: [],
    reviewStarts: [],
    reviewEnds: [],
    questions: [],
  };
  const answerData = selectedItem ? (testAnswers[selectedItem] ?? emptyAnswer) : emptyAnswer;
  const currentSection = selected?.section_name;
  const isFlagged = selected ? Boolean(selected.flagged) : false;

  // Card animation config
  const enterAnim = navDirection === 'next'
    ? SlideInRight.springify().damping(22).stiffness(280)
    : SlideInLeft.springify().damping(22).stiffness(280);
  const exitAnim = navDirection === 'next'
    ? SlideOutLeft.duration(200)
    : SlideOutRight.duration(200);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ─── Header ─── */}
      <Animated.View
        entering={FadeInDown.springify().damping(20)}
        style={[styles.header, { paddingTop: insets.top + 4 }]}
      >
        <View style={styles.headerLeft}>
          <MiniProgress current={selectedIndex + 1} total={questionIds.length} />
          <View style={styles.headerTextCol}>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              {sessionDetails.title}
            </Text>
            {currentSection ? (
              <View style={[styles.sectionChip, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.sectionChipText, { color: colors.primary }]}>{currentSection}</Text>
              </View>
            ) : null}
          </View>
        </View>
        {sessionDetails.duration > 0 && sessionDetails.testType === 1 ? (
          <AssessmentTimer
            durationMs={remainingMs}
            variant="pill"
            onCheckpoint={() => void updateElapsedTime(30000)}
            onExpired={() => void handleSubmit()}
          />
        ) : null}
      </Animated.View>

      {/* ─── Stats strip ─── */}
      <View style={[styles.statsStrip, { borderColor: colors.border }]}>
        <StatBadge
          count={stats.attempted}
          label="Done"
          color="#22c55e"
          bgColor="#22c55e18"
        />
        <StatBadge
          count={stats.flagged}
          label="Flagged"
          color="#f59e0b"
          bgColor="#f59e0b18"
        />
        <StatBadge
          count={stats.unattempted}
          label="Remaining"
          color={colors.textTertiary}
          bgColor={`${colors.textTertiary}18`}
        />
      </View>

      {/* ─── Question Card (animated) ─── */}
      <GestureDetector gesture={swipeGesture}>
        <View style={styles.cardContainer}>
          <Animated.View
            key={`card-${cardKey}`}
            entering={enterAnim}
            exiting={exitAnim}
            style={[
              styles.questionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                // @ts-ignore
                borderCurve: 'continuous',
              },
            ]}
          >
            <Animated.ScrollView
              style={styles.cardScroll}
              contentContainerStyle={styles.cardScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {selected && selectedItem ? (
                <QuestionRenderer
                  question={selected}
                  answerData={answerData}
                  questionNumber={selectedIndex + 1}
                  onAnswer={(selection, matchSelection) =>
                    answerQuestion(selectedItem, selection, matchSelection)
                  }
                  onAutoAdvance={() => handleNavigate('next')}
                />
              ) : null}
            </Animated.ScrollView>
          </Animated.View>
        </View>
      </GestureDetector>

      {/* ─── Bottom Bar ─── */}
      <View
        style={[
          styles.bottomBar,
          {
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
            paddingBottom: insets.bottom + 8,
          },
        ]}
      >
        {/* Nav Row */}
        <View style={styles.navRow}>
          <NavPill
            icon="chevron-back"
            label="Prev"
            disabled={selectedIndex <= 0}
            onPress={() => handleNavigate('prev')}
          />
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync();
              paletteRef.current?.open();
            }}
            style={[styles.palettePill, { backgroundColor: colors.primaryLight }]}
          >
            <Ionicons name="grid" size={16} color={colors.primary} />
            <Text style={[styles.paletteLabel, { color: colors.primary }]}>
              {selectedIndex + 1} of {questionIds.length}
            </Text>
          </Pressable>
          <NavPill
            icon="chevron-forward"
            label="Next"
            disabled={selectedIndex >= questionIds.length - 1}
            onPress={() => handleNavigate('next')}
          />
        </View>

        {/* Action Row */}
        <View style={styles.actionRow}>
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync();
              selectedItem && flag(selectedItem);
            }}
            style={[
              styles.actionBtn,
              {
                backgroundColor: isFlagged ? '#f59e0b22' : colors.background,
                borderColor: isFlagged ? '#f59e0b' : colors.border,
              },
            ]}
          >
            <Ionicons
              name={isFlagged ? 'bookmark' : 'bookmark-outline'}
              size={16}
              color={isFlagged ? '#f59e0b' : colors.textSecondary}
            />
            <Text
              style={[
                styles.actionLabel,
                { color: isFlagged ? '#f59e0b' : colors.textSecondary },
              ]}
            >
              Flag
            </Text>
          </Pressable>

          <Pressable
            onPress={() => void handleSave()}
            disabled={stubLoading}
            style={[styles.actionBtn, { backgroundColor: colors.background, borderColor: hasUnsavedChanges ? '#f59e0b' : colors.border }]}
          >
            <View>
              <Ionicons name="save-outline" size={16} color={hasUnsavedChanges ? '#f59e0b' : colors.textSecondary} />
              {hasUnsavedChanges ? (
                <View style={styles.unsavedDot} />
              ) : null}
            </View>
            <Text style={[styles.actionLabel, { color: hasUnsavedChanges ? '#f59e0b' : colors.textSecondary }]}>Save</Text>
          </Pressable>

          <Pressable
            onPress={handleSubmit}
            disabled={stubLoading}
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="send" size={14} color={colors.onPrimary} />
            <Text style={[styles.submitLabel, { color: colors.onPrimary }]}>Submit</Text>
          </Pressable>

          <Pressable
            onPress={handleExit}
            style={[styles.actionBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
          >
            <Ionicons name="exit-outline" size={16} color={colors.error} />
          </Pressable>

          {hasUnsavedChanges ? (
            <Pressable
              onPress={handleCancel}
              style={[styles.actionBtn, { backgroundColor: colors.background, borderColor: '#f59e0b' }]}
            >
              <Ionicons name="close-circle-outline" size={16} color="#f59e0b" />
              <Text style={[styles.actionLabel, { color: '#f59e0b' }]}>Cancel</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <QuestionPaletteSheet
        sheetRef={paletteRef}
        sections={sections.length > 0 ? sections : questionSection}
        selectedId={selectedItem}
        stats={stats}
        onSelect={(id) => {
          const idx = questionIds.indexOf(id);
          const currentIdx = selectedItem ? questionIds.indexOf(selectedItem) : 0;
          setNavDirection(idx > currentIdx ? 'next' : 'prev');
          navigate(id);
        }}
        onToggleSection={toggleSection}
      />
    </View>
  );
}

// ───────── Sub-components ─────────
function StatBadge({
  count,
  label,
  color,
  bgColor,
}: {
  count: number;
  label: string;
  color: string;
  bgColor: string;
}) {
  return (
    <View style={[statStyles.badge, { backgroundColor: bgColor }]}>
      <Text style={[statStyles.count, { color }]}>{count}</Text>
      <Text style={[statStyles.label, { color }]}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  count: { fontSize: 13, fontWeight: '800' },
  label: { fontSize: 11, fontWeight: '600' },
});

function NavPill({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={[styles.navPill, { opacity: disabled ? 0.35 : 1, backgroundColor: colors.background, borderColor: colors.border }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={[styles.navPillLabel, { color: colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

export function AssessmentPlayerScreen(props: AssessmentPlayerScreenProps) {
  return <AssessmentPlayerContent {...props} />;
}

// ───────── Styles ─────────
const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 360 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 8,
  },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTextCol: { flex: 1, gap: 4 },
  headerTitle: { fontSize: 15, fontWeight: '800' },
  sectionChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  sectionChipText: { fontSize: 11, fontWeight: '700' },
  statsStrip: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cardContainer: { flex: 1, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4, overflow: 'hidden' },
  questionCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  cardScroll: { flex: 1 },
  cardScrollContent: { padding: 20, paddingBottom: 24 },
  bottomBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  navPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 80,
    justifyContent: 'center',
  },
  navPillLabel: { fontSize: 13, fontWeight: '700' },
  palettePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  paletteLabel: { fontSize: 13, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  actionLabel: { fontSize: 12, fontWeight: '700' },
  submitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 999,
  },
  submitLabel: { fontSize: 13, fontWeight: '800' },
  unsavedDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#f59e0b',
  },
});
