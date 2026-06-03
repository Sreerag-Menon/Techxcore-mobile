import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';

import { Button, Card, EmptyState } from '../index';
import { useTheme } from '../../theme';
import type { CourseDetails } from '../../types/course.types';
import { DiscoursePanel } from './DiscoursePanel';
import {
  useGetModuleNotesQuery,
  useGetTrainerMessagesQuery,
  useSaveModuleNoteMutation,
  useSendTrainerMessageMutation,
} from '../../redux/api/playerApi';

type TabKey = 'details' | 'notes' | 'trainer' | 'discourse';

export type PlayerTabsProps = {
  courseDetails?: CourseDetails | null;
  memberId?: number;
  curriculumId?: number;
  coursePublishId: number;
  contentId?: number;
  topicId?: number | string;
  studentName?: string;
};

export function PlayerTabs({
  courseDetails,
  memberId,
  curriculumId,
  coursePublishId,
  contentId,
  topicId,
  studentName,
}: PlayerTabsProps) {
  const { colors } = useTheme();
  const [tab, setTab] = useState<TabKey>('details');
  const [draftNote, setDraftNote] = useState('');
  const [draftMessage, setDraftMessage] = useState('');

  const canLoadModuleData = Boolean(memberId && curriculumId && contentId);

  const notesQuery = useGetModuleNotesQuery(
    { memberId: memberId ?? 0, curriculumId: curriculumId ?? 0, contentId: contentId ?? 0 },
    { skip: !canLoadModuleData },
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

  return (
    <Card variant="elevated" padding="lg">
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {[
            { key: 'details', label: 'Details' },
            { key: 'notes', label: 'Notes' },
            { key: 'trainer', label: 'Ask Trainer' },
            { key: 'discourse', label: 'Discourse' },
          ].map((item) => {
            const isActive = tab === (item.key as TabKey);
            return (
              <Pressable
                key={item.key}
                onPress={() => setTab(item.key as TabKey)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: isActive ? colors.primary : colors.background,
                  borderWidth: 1,
                  borderColor: isActive ? colors.primary : colors.border,
                }}
              >
                <Text style={{ color: isActive ? '#fff' : colors.text, fontWeight: '700' }}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {tab === 'details' ? (
          <View style={{ gap: 10 }}>
            <Text style={{ color: colors.text, fontWeight: '800' }}>
              {courseDetails?.course_name ?? 'Course'}
            </Text>
            <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>
              {courseDetails?.course_description ?? 'No course description available.'}
            </Text>
          </View>
        ) : null}

        {tab === 'notes' ? (
          <View style={{ gap: 10 }}>
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
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  style={{
                    minHeight: 120,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: colors.border,
                    padding: 12,
                    color: colors.text,
                    backgroundColor: colors.background,
                  }}
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
          <View style={{ gap: 10 }}>
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
                  style={{ maxHeight: 240 }}
                  renderItem={({ item }) => (
                    <View
                      style={{
                        paddingVertical: 8,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                      }}
                    >
                      <Text style={{ color: colors.text, fontWeight: '700' }}>
                        {item.senderName ?? 'Trainer'}
                      </Text>
                      <Text style={{ color: colors.textSecondary }}>{item.message}</Text>
                    </View>
                  )}
                  ListEmptyComponent={
                    <Text style={{ color: colors.textSecondary }}>
                      No messages yet.
                    </Text>
                  }
                />
                <TextInput
                  value={draftMessage}
                  onChangeText={setDraftMessage}
                  placeholder="Ask a question…"
                  placeholderTextColor={colors.textSecondary}
                  style={{
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: colors.border,
                    padding: 12,
                    color: colors.text,
                    backgroundColor: colors.background,
                  }}
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
          <DiscoursePanel topicId={topicId} studentName={studentName} />
        ) : null}
      </View>
    </Card>
  );
}

