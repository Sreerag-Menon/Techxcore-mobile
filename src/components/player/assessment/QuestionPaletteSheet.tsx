import { useCallback, useMemo, useRef, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

import type { AssessmentSection } from '../../../types/assessmentSession.types';
import { useTheme } from '../../../theme';
import { GlassBottomSheetModal, type GlassBottomSheetModalHandle } from '../../ui/GlassBottomSheetModal';
import { QuestionNavigator } from './QuestionNavigator';

export type QuestionPaletteSheetProps = {
  sections: AssessmentSection[];
  selectedId: string | null;
  stats?: { attempted: number; flagged: number; unattempted: number };
  onSelect: (questionId: string) => void;
  onToggleSection?: (sectionOrder: number) => void;
  sheetRef: React.RefObject<GlassBottomSheetModalHandle | null>;
};

export function QuestionPaletteSheet({
  sections,
  selectedId,
  stats,
  onSelect,
  onToggleSection,
  sheetRef,
}: QuestionPaletteSheetProps) {
  const { colors } = useTheme();
  const snapPoints = useMemo(() => ['50%', '85%'], []);

  const handleSelect = useCallback(
    (questionId: string) => {
      onSelect(questionId);
      sheetRef.current?.close();
    },
    [onSelect, sheetRef],
  );

  return (
    <GlassBottomSheetModal ref={sheetRef} snapPoints={snapPoints}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Question Navigator</Text>

        {/* Stats row */}
        {stats ? (
          <View style={styles.statsRow}>
            <LegendDot color="#22c55e" label={`${stats.attempted} Done`} />
            <LegendDot color="#f59e0b" label={`${stats.flagged} Flagged`} />
            <LegendDot color={colors.textTertiary} label={`${stats.unattempted} Remaining`} />
          </View>
        ) : (
          <Text style={[styles.legend, { color: colors.textSecondary }]}>
            Teal = current · Green = done · Amber = flagged
          </Text>
        )}

        <QuestionNavigator
          sections={sections}
          selectedId={selectedId}
          onSelect={handleSelect}
          onToggleSection={onToggleSection}
          expanded
        />
      </View>
    </GlassBottomSheetModal>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={legendStyles.row}>
      <View style={[legendStyles.dot, { backgroundColor: color }]} />
      <Text style={[legendStyles.text, { color }]}>{label}</Text>
    </View>
  );
}

const legendStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { fontSize: 12, fontWeight: '600' },
});

export function QuestionPaletteProvider({ children }: { children: ReactNode }) {
  return <BottomSheetModalProvider>{children}</BottomSheetModalProvider>;
}

export function useQuestionPaletteRef() {
  return useRef<GlassBottomSheetModalHandle>(null);
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  title: { fontSize: 18, fontWeight: '800' },
  legend: { fontSize: 12, marginBottom: 4 },
  statsRow: { flexDirection: 'row', gap: 16, paddingVertical: 4 },
});
