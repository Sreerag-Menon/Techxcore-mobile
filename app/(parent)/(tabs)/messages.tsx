import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
} from '../../../src/components';
import { ScreenLayout, TabLayout } from '../../../src/layouts';
import { useAppDispatch, useAppSelector } from '../../../src/redux';
import { fetchChildren } from '../../../src/redux/slices/parentSlice';
import {
  fetchParentMessages,
  sendParentMessage,
  type ParentMessage,
} from '../../../src/services';
import { useTheme } from '../../../src/theme';
import { formatDate, timeAgo } from '../../../src/utils';

export default function ParentMessagesScreen() {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const { children, selectedChild } = useAppSelector((state) => state.parent);
  const [messages, setMessages] = useState<ParentMessage[]>([]);
  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);

  const loadMessages = useCallback(async () => {
    setIsLoading(true);
    setScreenError(null);

    try {
      if (!children.length) {
        await dispatch(fetchChildren()).unwrap();
      }

      const data = await fetchParentMessages();
      setMessages(data);
    } catch (error) {
      setScreenError(
        error instanceof Error
          ? error.message
          : 'Unable to load messages right now.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [children.length, dispatch]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  const handleSend = async () => {
    if (!subject.trim() || !messageBody.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Missing details',
        text2: 'Please enter both a subject and message.',
      });
      return;
    }

    try {
      setIsLoading(true);
      const responseMessage = await sendParentMessage({
        subject: subject.trim(),
        message: messageBody.trim(),
        child_member_id: selectedChild?.member_id ?? null,
      });

      setSubject('');
      setMessageBody('');
      Toast.show({
        type: 'success',
        text1: 'Message sent',
        text2: responseMessage,
      });

      const refreshedMessages = await fetchParentMessages();
      setMessages(refreshedMessages);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Send failed',
        text2:
          error instanceof Error
            ? error.message
            : 'Unable to send your message right now.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenLayout>
      <TabLayout
        title="Messages"
        subtitle="Reach trainers and review recent message threads for the selected learner."
      >
        <Card variant="elevated" padding="lg">
          <View style={{ gap: 14 }}>
            <Text
              style={{
                color: colors.text,
                fontSize: 18,
                fontWeight: '700',
              }}
            >
              New message
            </Text>
            <Input
              label="Subject"
              placeholder="Message subject"
              value={subject}
              onChangeText={setSubject}
            />
            <Input
              label="Message"
              placeholder="Write your message to the trainer"
              value={messageBody}
              onChangeText={setMessageBody}
              multiline
              numberOfLines={5}
            />
            <Button
              title={
                selectedChild
                  ? `Send for ${selectedChild.first_name}`
                  : 'Send Message'
              }
              onPress={handleSend}
              loading={isLoading}
              fullWidth
            />
          </View>
        </Card>

        {screenError && !messages.length ? (
          <ErrorState
            title="Messages unavailable"
            message={screenError}
            onRetry={() => {
              void loadMessages();
            }}
          />
        ) : messages.length === 0 ? (
          <EmptyState
            title="No messages yet"
            message="Messages exchanged with trainers will appear here."
          />
        ) : (
          messages.map((message) => (
            <Card key={message.ask_doctor_id} variant="elevated" padding="lg">
              <View style={{ gap: 10 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 16,
                        fontWeight: '700',
                      }}
                    >
                      {message.subject}
                    </Text>
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: 13,
                        lineHeight: 20,
                      }}
                    >
                      {message.message}
                    </Text>
                  </View>
                  {message.status ? (
                    <Text style={{ color: colors.primary, fontSize: 12 }}>
                      {message.status}
                    </Text>
                  ) : null}
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
                    {message.sender_name || 'Trainer'}
                  </Text>
                  <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
                    {timeAgo(message.created_at)} · {formatDate(message.created_at)}
                  </Text>
                </View>
              </View>
            </Card>
          ))
        )}
      </TabLayout>
    </ScreenLayout>
  );
}
