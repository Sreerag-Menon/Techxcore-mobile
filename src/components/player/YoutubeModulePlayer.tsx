import { useMemo, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { useTheme } from '../../theme';
import {
  WEBVIEW_EMBED_BASE_URL,
  buildYoutubeProgressHtml,
  extractYoutubeVideoId,
  parseEmbedWebViewMessage,
} from '../../utils/embedVideoProgress';

export type YoutubeModulePlayerProps = {
  url: string;
  initialSeekSeconds?: number;
  onProgress?: (seconds: number) => void;
  onEnd?: () => void;
};

export function YoutubeModulePlayer({
  url,
  initialSeekSeconds = 0,
  onProgress,
  onEnd,
}: YoutubeModulePlayerProps) {
  const { colors } = useTheme();
  const [embedError, setEmbedError] = useState<string | null>(null);
  const videoId = useMemo(() => extractYoutubeVideoId(url), [url]);
  const html = useMemo(
    () => (videoId ? buildYoutubeProgressHtml(videoId) : null),
    [videoId],
  );

  if (!videoId || !html) {
    return (
      <View style={[styles.container, styles.fallback, { backgroundColor: colors.surface }]}>
        <Text style={[styles.fallbackText, { color: colors.textSecondary }]}>
          Invalid or unsupported YouTube URL.
        </Text>
      </View>
    );
  }

  if (embedError) {
    return (
      <View style={[styles.container, styles.fallback, { backgroundColor: colors.surface }]}>
        <Text style={[styles.fallbackText, { color: colors.textSecondary }]}>{embedError}</Text>
        <Text
          style={[styles.fallbackLink, { color: colors.primary }]}
          onPress={() => {
            void Linking.openURL(url);
          }}
        >
          Open in YouTube
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ html, baseUrl: WEBVIEW_EMBED_BASE_URL }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        style={styles.webview}
        injectedJavaScript={
          initialSeekSeconds > 0
            ? `setTimeout(function(){ try { if (typeof player !== 'undefined' && player.seekTo) player.seekTo(${initialSeekSeconds}, true); } catch(e) {} }, 1500); true;`
            : undefined
        }
        onMessage={(event) => {
          const message = parseEmbedWebViewMessage(event.nativeEvent.data);
          if (!message) return;
          if (message.type === 'progress') {
            onProgress?.(message.seconds);
            return;
          }
          if (message.type === 'ended') {
            onEnd?.();
            return;
          }
          if (message.type === 'error') {
            const hint =
              message.code === 153
                ? 'This video cannot play in the app (configuration error).'
                : 'Unable to play this video in the app.';
            setEmbedError(hint);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
    overflow: 'hidden',
  },
  webview: { flex: 1 },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  fallbackText: {
    textAlign: 'center',
    fontSize: 14,
  },
  fallbackLink: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
});
