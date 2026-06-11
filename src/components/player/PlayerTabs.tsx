import { useMemo, useState } from 'react';
import {
  FlatList,
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Button, Card, EmptyState } from '../index';
import { useTheme } from '../../theme';
import { spacing } from '../../theme/spacing';
import { fontSize, lineHeight } from '../../theme/typography';
import type { CourseDetails, CourseModule } from '../../types/course.types';
import { DiscoursePanel } from './DiscoursePanel';
import {
  useGetModuleNotesQuery,
  useGetTrainerMessagesQuery,
  useSaveModuleNoteMutation,
  useSendTrainerMessageMutation,
} from '../../redux/api/playerApi';

type TabKey = 'details' | 'notes' | 'trainer' | 'discourse';

const TAB_ITEMS: Array<{ key: TabKey; label: string }> = [
  { key: 'details', label: 'Overview' },
  { key: 'notes', label: 'Notes' },
  { key: 'trainer', label: 'Ask Trainer' },
  { key: 'discourse', label: 'Discourse' },
];

export type PlayerTabsProps = {
  courseDetails?: CourseDetails | null;
  module?: CourseModule | null;
  memberId?: number;
  curriculumId?: number;
  coursePublishId: number;
  contentId?: number;
  topicId?: number | string;
  studentName?: string;
  /** When true, renders without outer Card wrapper (for bottom sheets). */
  embedded?: boolean;
  /** Tab selector visual style. */
  variant?: 'pill' | 'underline';
  /** `screen` = tab bar fixed, content scrolls independently. `flow` = no inner scroll (parent ScrollView). */
  layout?: 'card' | 'screen' | 'flow' | 'embedded';
};

function UnderlineTabBar({
  tab,
  onTabChange,
}: {
  tab: TabKey;
  onTabChange: (key: TabKey) => void;
}) {
  const { colors, fontFamily } = useTheme();
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const tabLayouts = useMemo(() => new Map<TabKey, { x: number; width: number }>(), []);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorWidth.value,
  }));

  const updateIndicator = (key: TabKey) => {
    const layout = tabLayouts.get(key);
    if (!layout) return;
    indicatorX.value = withSpring(layout.x, { damping: 20, stiffness: 300 });
    indicatorWidth.value = withSpring(layout.width, { damping: 20, stiffness: 300 });
  };

  const handleTabLayout = (key: TabKey) => (event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    tabLayouts.set(key, { x, width });
    if (key === tab) {
      indicatorX.value = x;
      indicatorWidth.value = width;
    }
  };

  return (
    <View style={[styles.underlineBar, { borderBottomColor: colors.border }]}>
      {TAB_ITEMS.map((item) => {
        const isActive = tab === item.key;
        return (
          <Pressable
            key={item.key}
            onLayout={handleTabLayout(item.key)}
            onPress={() => {
              onTabChange(item.key);
              updateIndicator(item.key);
            }}
            style={styles.underlineTab}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text
              style={[
                styles.underlineTabLabel,
                {
                  color: isActive ? colors.primary : colors.textSecondary,
                  fontFamily: isActive ? fontFamily.bold : fontFamily.medium,
                },
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
      <Animated.View
        style={[
          styles.underlineIndicator,
          { backgroundColor: colors.primary },
          indicatorStyle,
        ]}
      />
    </View>
  );
}

function PillTabBar({
  tab,
  onTabChange,
}: {
  tab: TabKey;
  onTabChange: (key: TabKey) => void;
}) {
  const { colors, fontFamily } = useTheme();

  return (
    <View style={styles.pillRow}>
      {TAB_ITEMS.map((item) => {
        const isActive = tab === item.key;
        return (
          <Pressable
            key={item.key}
            onPress={() => onTabChange(item.key)}
            style={[
              styles.pillTab,
              {
                backgroundColor: isActive ? colors.primary : colors.background,
                borderColor: isActive ? colors.primary : colors.border,
              },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text
              style={[
                styles.pillTabLabel,
                {
                  color: isActive ? colors.onPrimary : colors.text,
                  fontFamily: fontFamily.bold,
                },
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function PlayerTabs({
  courseDetails,
  module,
  memberId,
  curriculumId,
  coursePublishId,
  contentId,
  topicId,
  studentName,
  embedded = false,
  variant = 'underline',
  layout,
}: PlayerTabsProps) {
  const { colors, fontFamily } = useTheme();
  const [tab, setTab] = useState<TabKey>('details');
  const [draftNote, setDraftNote] = useState('');
  const [draftMessage, setDraftMessage] = useState('');

  const resolvedLayout = layout ?? (embedded ? 'embedded' : 'card');

  const canLoadModuleData = Boolean(memberId && curriculumId && contentId);

  const notesQuery = useGetModuleNotesQuery(
    { memberId: memberId ?? 0, curriculumId: curriculumId ?? 0, contentId: contentId ?? 0 },
    { skip: true }, // get_module_notes SP deprecated — endpoint not available on mobile
  );
  const messagesQuery = useGetTrainerMessagesQuery(
    {
      memberId: memberId ?? 0,
      curriculumId: curriculumId ?? 0,
      contentId: contentId ?? 0,
      coursePublishId,
    },
    { skip: !canLoadModuleData },
  );

  const [saveNote, saveNoteState] = useSaveModuleNoteMutation();
  const [sendMessage, sendMessageState] = useSendTrainerMessageMutation();

  const messages = useMemo(() => messagesQuery.data ?? [], [messagesQuery.data]);

  const tabBar =
    variant === 'underline' ? (
      <UnderlineTabBar tab={tab} onTabChange={setTab} />
    ) : (
      <PillTabBar tab={tab} onTabChange={setTab} />
    );

  const tabBody = (
    <>
      {tab === 'details' ? (
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.text, fontFamily: fontFamily.bold },
            ]}
          >
            {courseDetails?.course_name ?? 'Course'}
          </Text>
          <Text
            style={[
              styles.sectionBody,
              { color: colors.textSecondary, fontFamily: fontFamily.regular },
            ]}
          >
            {courseDetails?.course_description ?? 'No course description available.'}
          </Text>
        </View>
      ) : null}

      {tab === 'notes' ? (
        <View style={styles.section}>
          {!canLoadModuleData ? (
            <EmptyState
              title="Notes unavailable"
              message="Member/course context is missing. This will be enabled once curriculumId is wired."
            />
          ) : (
            <>
              <TextInput
                value={draftNote || notesQuery.data?.notes || ''}
                onChangeText={(v) => setDraftNote(v)}
                placeholder="Write your note…"
                placeholderTextColor={colors.textTertiary}
                multiline
                style={[
                  styles.noteInput,
                  {
                    borderColor: colors.border,
                    color: colors.text,
                    backgroundColor: colors.inputBackground,
                    fontFamily: fontFamily.regular,
                  },
                ]}
              />
              <Button
                title="Save note"
                loading={saveNoteState.isLoading}
                onPress={() => {
                  if (!memberId || !curriculumId || !contentId) return;
                  void saveNote({
                    memberId,
                    curriculumId,
                    contentId,
                    notes: draftNote,
                  });
                }}
              />
            </>
          )}
        </View>
      ) : null}

      {tab === 'trainer' ? (
        <View style={styles.section}>
          {!canLoadModuleData ? (
            <EmptyState
              title="Chat unavailable"
              message="Member/course context is missing. This will be enabled once curriculumId is wired."
            />
          ) : (
            <>
              <FlatList
                data={messages}
                keyExtractor={(item) => String(item.id)}
                style={styles.messageList}
                scrollEnabled={resolvedLayout === 'screen'}
                renderItem={({ item }) => (
                  <View style={[styles.messageRow, { borderBottomColor: colors.border }]}>
                    <Text
                      style={[
                        styles.messageSender,
                        { color: colors.text, fontFamily: fontFamily.bold },
                      ]}
                    >
                      {item.senderName ?? 'Trainer'}
                    </Text>
                    <Text
                      style={[
                        styles.messageBody,
                        { color: colors.textSecondary, fontFamily: fontFamily.regular },
                      ]}
                    >
                      {item.message}
                    </Text>
                  </View>
                )}
                ListEmptyComponent={
                  <Text
                    style={[
                      styles.emptyMessage,
                      { color: colors.textSecondary, fontFamily: fontFamily.regular },
                    ]}
                  >
                    No messages yet.
                  </Text>
                }
              />
              <TextInput
                value={draftMessage}
                onChangeText={setDraftMessage}
                placeholder="Ask a question…"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.messageInput,
                  {
                    borderColor: colors.border,
                    color: colors.text,
                    backgroundColor: colors.inputBackground,
                    fontFamily: fontFamily.regular,
                  },
                ]}
              />
              <Button
                title="Send"
                loading={sendMessageState.isLoading}
                onPress={() => {
                  if (!memberId || !curriculumId || !contentId) return;
                  const message = draftMessage.trim();
                  if (!message) return;
                  setDraftMessage('');
                  void sendMessage({ memberId, curriculumId, contentId, message });
                }}
              />
            </>
          )}
        </View>
      ) : null}

      {tab === 'discourse' ? (
        <View style={styles.section}>
          <DiscoursePanel topicId={topicId} studentName={studentName} />
        </View>
      ) : null}
    </>
  );

  if (resolvedLayout === 'screen') {
    return (
      <View style={styles.screenLayout}>
        {tabBar}
        <ScrollView
          style={styles.screenScroll}
          contentContainerStyle={styles.screenScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {tabBody}
        </ScrollView>
      </View>
    );
  }

  if (resolvedLayout === 'flow') {
    return (
      <View style={styles.flowLayout}>
        {tabBar}
        <View style={styles.flowBody}>{tabBody}</View>
      </View>
    );
  }

  const inner = (
    <View style={styles.inner}>
      {module && resolvedLayout !== 'embedded' ? (
        <Text
          style={[
            styles.moduleHint,
            { color: colors.textSecondary, fontFamily: fontFamily.medium },
          ]}
          numberOfLines={1}
        >
          {module.title}
        </Text>
      ) : null}
      {tabBar}
      {tabBody}
    </View>
  );

  if (embedded || resolvedLayout === 'embedded') {
    return inner;
  }

  return (
    <Card variant="elevated" padding="lg">
      {inner}
    </Card>
  );
}

const styles = StyleSheet.create({
  flowLayout: {
    width: '100%',
    gap: spacing.sm,
  },
  flowBody: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  screenLayout: {
    flex: 1,
    minHeight: 0,
  },
  screenScroll: {
    flex: 1,
  },
  screenScrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing['2xl'],
    gap: spacing.md,
  },
  inner: {
    gap: spacing.md,
  },
  moduleHint: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
  },
  underlineBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    position: 'relative',
  },
  underlineTab: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginRight: spacing.sm,
  },
  underlineTabLabel: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
  },
  underlineIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    borderRadius: 1,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pillTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillTabLabel: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
  },
  sectionBody: {
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
  },
  noteInput: {
    minHeight: 120,
    borderRadius: 14,
    borderWidth: 1,
    padding: spacing.md,
    textAlignVertical: 'top',
    borderCurve: 'continuous',
  },
  messageList: {
    maxHeight: 240,
  },
  messageRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  messageSender: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
  },
  messageBody: {
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
    marginTop: 2,
  },
  emptyMessage: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
  },
  messageInput: {
    borderRadius: 14,
    borderWidth: 1,
    padding: spacing.md,
    borderCurve: 'continuous',
  },
});
