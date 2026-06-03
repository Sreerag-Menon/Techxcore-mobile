import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { BottomSheetBackdrop, BottomSheetModal } from '@gorhom/bottom-sheet';
import { fetch as expoFetch } from 'expo/fetch';

import { useTheme } from '../../theme';
import { asyncStorage } from '../../utils/storage';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

export type StudyBuddyChatbotProps = {
  storageKey: string;
  endpointUrl?: string;
  context?: Record<string, unknown>;
};

export function StudyBuddyChatbot({ storageKey, endpointUrl, context }: StudyBuddyChatbotProps) {
  const { colors } = useTheme();
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['40%', '80%'], []);
  const abortRef = useRef<AbortController | null>(null);

  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      const stored = await asyncStorage.getItem<ChatMessage[]>(storageKey);
      if (mounted && stored?.length) {
        setMessages(stored);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [storageKey]);

  const persist = (next: ChatMessage[]) => {
    setMessages(next);
    void asyncStorage.setItem(storageKey, next);
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || isStreaming) return;

    setDraft('');
    const userMsg: ChatMessage = { id: `${Date.now()}_u`, role: 'user', text };
    const assistantMsg: ChatMessage = { id: `${Date.now()}_a`, role: 'assistant', text: '' };
    const next = [...messages, userMsg, assistantMsg];
    persist(next);

    if (!endpointUrl) {
      const echoed = next.map((m) =>
        m.id === assistantMsg.id ? { ...m, text: `I heard: ${text}` } : m,
      );
      persist(echoed);
      return;
    }

    setIsStreaming(true);
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await expoFetch(endpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context: context ?? {},
        }),
        signal: abort.signal,
      });

      if (!res.body) throw new Error('No response stream');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let acc = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        persist(next.map((m) => (m.id === assistantMsg.id ? { ...m, text: acc } : m)));
      }
    } catch (e) {
      persist(
        next.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, text: e instanceof Error ? e.message : 'Stream failed' }
            : m,
        ),
      );
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <>
      <Pressable
        onPress={() => sheetRef.current?.present()}
        style={{
          position: 'absolute',
          left: 18,
          bottom: 18,
          backgroundColor: colors.text,
          borderRadius: 999,
          paddingHorizontal: 16,
          paddingVertical: 12,
          shadowColor: '#000',
          shadowOpacity: 0.22,
          shadowRadius: 12,
          elevation: 5,
        }}
      >
        <Text style={{ color: colors.background, fontWeight: '800' }}>Study Buddy</Text>
      </Pressable>

      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        onDismiss={() => {
          abortRef.current?.abort();
          abortRef.current = null;
          setIsStreaming(false);
        }}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
        )}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
      >
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 12, flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '900', fontSize: 16 }}>
            Study Buddy
          </Text>

          <View style={{ gap: 10, flex: 1 }}>
            {messages.length === 0 ? (
              <Text style={{ color: colors.textSecondary }}>
                Ask a question about this module.
              </Text>
            ) : null}
            {messages.slice(-12).map((m) => (
              <View
                key={m.id}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '92%',
                  borderRadius: 14,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  backgroundColor:
                    m.role === 'user' ? colors.primary : colors.background,
                }}
              >
                <Text style={{ color: m.role === 'user' ? '#fff' : colors.text }}>
                  {m.text}
                </Text>
              </View>
            ))}
          </View>

          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message…"
            placeholderTextColor={colors.textSecondary}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 14,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: colors.text,
              backgroundColor: colors.background,
            }}
          />

          <Pressable
            onPress={() => {
              void send();
            }}
            style={{
              backgroundColor: colors.primary,
              borderRadius: 14,
              paddingVertical: 12,
              alignItems: 'center',
              opacity: isStreaming ? 0.7 : 1,
            }}
            disabled={isStreaming}
          >
            <Text style={{ color: '#fff', fontWeight: '900' }}>
              {isStreaming ? 'Streaming…' : 'Send'}
            </Text>
          </Pressable>
        </View>
      </BottomSheetModal>
    </>
  );
}
