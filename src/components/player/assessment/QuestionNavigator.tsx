import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { AssessmentSection } from '../../../types/assessmentSession.types';
import { useTheme } from '../../../theme';

export type QuestionNavigatorProps = {
  sections: AssessmentSection[];
  selectedId: string | null;
  onSelect: (questionId: string) => void;
  onToggleSection?: (sectionOrder: number) => void;
  expanded?: boolean;
};

export function QuestionNavigator({
  sections,
  selectedId,
  onSelect,
  onToggleSection,
  expanded = false,
}: QuestionNavigatorProps) {
  const { colors } = useTheme();

  return (
    <ScrollView
      style={expanded ? styles.containerExpanded : styles.container}
      contentContainerStyle={styles.content}
    >
      {sections.map((section) => (
        <View key={section.section_order} style={styles.section}>
          <Pressable
            onPress={() => onToggleSection?.(section.section_order)}
            style={styles.sectionHeader}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {section.section_name}
            </Text>
            {section.max_questions ? (
              <Text style={[styles.sectionMeta, { color: colors.textSecondary }]}>
                {section.questions_attempted ?? 0}/{section.max_questions}
              </Text>
            ) : null}
          </Pressable>
          {(section.open ?? true) ? (
            <View style={styles.grid}>
              {section.questions.map((q, index) => {
                const isCurrent = q.id === selectedId;
                const isAttempted = Boolean(q.attempted) || (q.user_selection?.length ?? 0) > 0;
                const isFlagged = Boolean(q.flagged);
                const bubbleColor = isCurrent
                  ? colors.primary
                  : isFlagged
                    ? '#f59e0b'
                    : isAttempted
                      ? '#22c55e'
                      : colors.border;

                return (
                  <Pressable
                    key={q.id}
                    onPress={() => onSelect(q.id)}
                    style={[
                      styles.bubble,
                      {
                        backgroundColor: isCurrent ? bubbleColor : `${bubbleColor}22`,
                        borderColor: bubbleColor,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: isCurrent ? '#fff' : colors.text,
                        fontWeight: '700',
                        fontSize: 13,
                      }}
                    >
                      {index + 1}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { maxHeight: 220 },
  containerExpanded: { flex: 1 },
  content: { padding: 12, gap: 12 },
  section: { gap: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
  sectionMeta: { fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
