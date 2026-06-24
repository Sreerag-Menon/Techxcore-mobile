import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';

import type { AssessmentSection } from '../../../types/assessmentSession.types';
import { useTheme } from '../../../theme';

export type QuestionNavigatorProps = {
  sections: AssessmentSection[];
  selectedId: string | null;
  onSelect: (questionId: string) => void;
  onToggleSection?: (sectionOrder: number) => void;
  expanded?: boolean;
};

function QuestionBubble({
  index,
  isCurrent,
  isAttempted,
  isFlagged,
  onPress,
  delay,
}: {
  index: number;
  isCurrent: boolean;
  isAttempted: boolean;
  isFlagged: boolean;
  onPress: () => void;
  delay: number;
}) {
  const { colors } = useTheme();
  const pulse = useSharedValue(1);

  // Gentle pulse on current question
  useEffect(() => {
    if (isCurrent) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(0.92, { duration: 800 }),
          withTiming(1, { duration: 800 }),
        ),
        -1,
        true,
      );
    } else {
      pulse.value = withTiming(1, { duration: 200 });
    }
  }, [isCurrent, pulse]);

  const animatedScale = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const bubbleColor = isCurrent
    ? colors.primary
    : isFlagged
      ? '#f59e0b'
      : isAttempted
        ? '#22c55e'
        : colors.border;

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(20).stiffness(300).delay(delay)}
      style={animatedScale}
    >
      <Pressable
        onPress={() => {
          void Haptics.selectionAsync();
          onPress();
        }}
        style={[
          styles.bubble,
          {
            backgroundColor: isCurrent ? bubbleColor : `${bubbleColor}18`,
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
    </Animated.View>
  );
}

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
      {sections.map((section) => {
        const isOpen = section.open ?? true;
        return (
          <View key={section.section_order} style={styles.section}>
            <Pressable
              onPress={() => {
                void Haptics.selectionAsync();
                onToggleSection?.(section.section_order);
              }}
              style={styles.sectionHeader}
            >
              <View style={styles.sectionTitleRow}>
                <Ionicons
                  name={isOpen ? 'chevron-down' : 'chevron-forward'}
                  size={14}
                  color={colors.textSecondary}
                />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {section.section_name}
                </Text>
              </View>
              {section.max_questions ? (
                <Text style={[styles.sectionMeta, { color: colors.textSecondary }]}>
                  {section.questions_attempted ?? 0}/{section.max_questions}
                </Text>
              ) : null}
            </Pressable>
            {isOpen ? (
              <View style={styles.grid}>
                {section.questions.map((q, index) => {
                  const isCurrent = q.id === selectedId;
                  const isAttempted = Boolean(q.attempted) || (q.user_selection?.length ?? 0) > 0;
                  const isFlagged = Boolean(q.flagged);

                  return (
                    <QuestionBubble
                      key={q.id}
                      index={index}
                      isCurrent={isCurrent}
                      isAttempted={isAttempted}
                      isFlagged={isFlagged}
                      onPress={() => onSelect(q.id)}
                      delay={index * 20}
                    />
                  );
                })}
              </View>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { maxHeight: 220 },
  containerExpanded: { flex: 1 },
  content: { padding: 12, gap: 14 },
  section: { gap: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
  sectionMeta: { fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bubble: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    // @ts-ignore
    borderCurve: 'continuous',
  },
});
