import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import Button from '../../Button';
import { ErrorState, LoadingScreen } from '../../index';
import { useAssessmentEngine } from '../../../hooks/useAssessmentEngine';
import { useTheme } from '../../../theme';
import { AssessmentLanding } from './AssessmentLanding';
import { AssessmentSummary } from './AssessmentSummary';
import { AssessmentTimer } from './AssessmentTimer';
import {
  QuestionPaletteSheet,
  useQuestionPaletteRef,
} from './QuestionPaletteSheet';
import { QuestionRenderer } from './QuestionRenderer';

export type AssessmentPlayerScreenProps = {
  publishId: number;
  coursePublishId?: number;
  courseId?: number;
  curriculumId?: number;
  onComplete?: () => void;
  onAllViewed?: () => void;
};

function AssessmentPlayerContent({
  publishId,
  coursePublishId,
  courseId,
  onComplete,
  onAllViewed,
}: AssessmentPlayerScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
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
    questionSection,
    questionIds,
    selectedItem,
    selectedQuestion,
    summary,
    stats,
    remainingMs,
    startAssessment,
    updateElapsedTime,
    save,
    submit,
    exit,
    flag,
    navigate,
    navigateRelative,
    answerQuestion,
    viewSummary,
  } = useAssessmentEngine({ publishId, coursePublishId, courseId });

  const [sections, setSections] = useState(questionSection);
  const submittedHandledRef = useRef(false);

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

  const toggleSection = useCallback((sectionOrder: number) => {
    setSections((prev) =>
      prev.map((s) =>
        s.section_order === sectionOrder ? { ...s, open: !(s.open ?? true) } : s,
      ),
    );
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await save();
      Toast.show({ type: 'success', text1: 'Assessment saved' });
    } catch {
      Toast.show({ type: 'error', text1: 'Save failed' });
    }
  }, [save]);

  const handleSubmit = useCallback(async () => {
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

  const swipeGesture = Gesture.Pan().onEnd((e) => {
    if (Math.abs(e.translationX) < 60) return;
    if (e.translationX < 0) navigateRelative('next');
    else navigateRelative('prev');
  });

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
      <AssessmentSummary details={sessionDetails} summary={summary} onDone={() => onComplete?.()} />
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
  const progress = questionIds.length > 0 ? (selectedIndex + 1) / questionIds.length : 0;
  const currentSection = selected?.section_name;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {sessionDetails.title}
        </Text>
        {sessionDetails.duration > 0 && sessionDetails.testType === 1 ? (
          <AssessmentTimer
            durationMs={remainingMs}
            variant="pill"
            onCheckpoint={() => void updateElapsedTime(30000)}
            onExpired={() => void handleSubmit()}
          />
        ) : null}
      </View>

      <View style={styles.progressRow}>
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <View
            style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: colors.primary }]}
          />
        </View>
        <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
          {selectedIndex + 1} / {questionIds.length}
        </Text>
      </View>

      {currentSection ? (
        <View style={[styles.sectionChip, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.sectionChipText, { color: colors.primary }]}>{currentSection}</Text>
        </View>
      ) : null}

      <GestureDetector gesture={swipeGesture}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {selected && selectedItem ? (
            <QuestionRenderer
              question={selected}
              answerData={answerData}
              onAnswer={(selection, matchSelection) =>
                answerQuestion(selectedItem, selection, matchSelection)
              }
              onAutoAdvance={() => navigateRelative('next')}
            />
          ) : null}
        </ScrollView>
      </GestureDetector>

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
        <View style={styles.navRow}>
          <NavButton
            label="Prev"
            icon="chevron-back"
            disabled={selectedIndex <= 0}
            onPress={() => navigateRelative('prev')}
          />
          <NavButton
            label="Questions"
            icon="menu"
            onPress={() => paletteRef.current?.open()}
          />
          <NavButton
            label="Next"
            icon="chevron-forward"
            disabled={selectedIndex >= questionIds.length - 1}
            onPress={() => navigateRelative('next')}
          />
        </View>

        <View style={styles.actionRow}>
          <Button title="Save" variant="outline" size="sm" onPress={() => void handleSave()} loading={stubLoading} />
          <Button
            title="Flag"
            variant="ghost"
            size="sm"
            onPress={() => selectedItem && flag(selectedItem)}
          />
          <Button title="Submit" size="sm" onPress={handleSubmit} loading={stubLoading} />
          <Button title="Exit" variant="ghost" size="sm" onPress={handleExit} />
        </View>
      </View>

      <QuestionPaletteSheet
        sheetRef={paletteRef}
        sections={sections.length > 0 ? sections : questionSection}
        selectedId={selectedItem}
        onSelect={navigate}
        onToggleSection={toggleSection}
      />
    </View>
  );
}

function NavButton({
  label,
  icon,
  onPress,
  disabled,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={[styles.navBtn, { opacity: disabled ? 0.4 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={[styles.navBtnText, { color: colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

export function AssessmentPlayerScreen(props: AssessmentPlayerScreenProps) {
  return <AssessmentPlayerContent {...props} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 360 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 8,
  },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700' },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  progressTrack: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  progressLabel: { fontSize: 12, fontWeight: '700', minWidth: 48, textAlign: 'right' },
  sectionChip: {
    alignSelf: 'flex-start',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  sectionChipText: { fontSize: 12, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 16 },
  bottomBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  navRow: { flexDirection: 'row', justifyContent: 'space-between' },
  navBtn: {
    minHeight: 44,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  navBtnText: { fontSize: 11, fontWeight: '700' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
});
