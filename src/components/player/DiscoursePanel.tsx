import { useMemo, useState } from 'react';
import { FlatList, Text, TextInput, View } from 'react-native';

import { Button, EmptyState } from '../index';
import { useTheme } from '../../theme';
import {
  useGetDiscourseCommentsQuery,
  usePostDiscourseCommentMutation,
} from '../../redux/api/playerApi';

export type DiscoursePanelProps = {
  topicId?: number | string;
  studentName?: string;
};

export function DiscoursePanel({ topicId, studentName }: DiscoursePanelProps) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState('');

  const canLoad = topicId != null && String(topicId).trim() !== '';

  const { data, isFetching, refetch } = useGetDiscourseCommentsQuery(
    { topicId: topicId! },
    { skip: !canLoad },
  );
  const [postComment, postState] = usePostDiscourseCommentMutation();

  const comments = useMemo(() => data ?? [], [data]);

  if (!canLoad) {
    return (
      <EmptyState
        title="Discussions unavailable"
        message="This course does not have a discussion topic configured."
      />
    );
  }

  return (
    <View style={{ gap: 10 }}>
      <FlatList
        data={comments}
        keyExtractor={(item, index) => String(item.id ?? index)}
        style={{ maxHeight: 280 }}
        refreshing={isFetching}
        onRefresh={() => {
          void refetch();
        }}
        renderItem={({ item }) => (
          <View
            style={{
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              gap: 4,
            }}
          >
            <Text style={{ color: colors.text, fontWeight: '700' }}>
              {item.author ?? 'Student'}
            </Text>
            <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>{item.message}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ color: colors.textSecondary }}>
            {isFetching ? 'Loading comments…' : 'No comments yet. Start the discussion.'}
          </Text>
        }
      />
      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder="Write a comment…"
        placeholderTextColor={colors.textSecondary}
        multiline
        style={{
          minHeight: 80,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 12,
          color: colors.text,
          backgroundColor: colors.background,
        }}
      />
      <Button
        title="Post comment"
        loading={postState.isLoading}
        onPress={() => {
          const message = draft.trim();
          if (!message || !canLoad) return;
          setDraft('');
          void postComment({
            topicId: topicId!,
            message,
            studentName: studentName ?? 'Student',
          }).then(() => refetch());
        }}
      />
    </View>
  );
}
