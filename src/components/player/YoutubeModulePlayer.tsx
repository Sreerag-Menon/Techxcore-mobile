import { useMemo, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../theme';
import {
  WEBVIEW_EMBED_BASE_URL,
  buildYoutubeProgressHtml,
  extractYoutubeVideoId,
  parseEmbedWebViewMessage,
} from '../../utils/embedVideoProgress';

export type YoutubeModulePlayerLayout = 'inline' | 'fullscreen';

export type YoutubeModulePlayerProps = {
  url: string;
  initialSeekSeconds?: number;
  layout?: YoutubeModulePlayerLayout;
  seekable?: boolean;
  onProgress?: (seconds: number) => void;
  onEnd?: () => void;
};

export function YoutubeModulePlayer({
  url,
  initialSeekSeconds = 0,
  seekable = true,
  onProgress,
  onEnd,
}: YoutubeModulePlayerProps) {
  const { colors } = useTheme();
  const webRef = useRef<WebView>(null);
  const [embedError, setEmbedError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [prevVideoId, setPrevVideoId] = useState<string | null>(null);

  const videoId = useMemo(() => extractYoutubeVideoId(url), [url]);

  if (videoId && prevVideoId !== videoId) {
    setPrevVideoId(videoId);
    setIsPlaying(false);
    setHasStarted(false);
  }
  const html = useMemo(
    () =>
      videoId
        ? buildYoutubeProgressHtml(videoId, { seekable, initialSeekSeconds })
        : null,
    [initialSeekSeconds, seekable, videoId],
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
        ref={webRef}
        source={{ html, baseUrl: WEBVIEW_EMBED_BASE_URL }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        style={styles.webview}
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
          if (message.type === 'stateChange') {
            setIsPlaying(message.isPlaying);
            if (message.isPlaying) {
              setHasStarted(true);
            }
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

      {!seekable ? (
        <Pressable
          onPress={() => {
            webRef.current?.injectJavaScript('window.toggleYoutubePlayback(); true;');
          }}
          style={styles.tapLayer}
          accessibilityRole="button"
          accessibilityLabel="Toggle playback"
        >
          {hasStarted && !isPlaying ? (
            <View style={styles.playPauseHint} pointerEvents="none">
              <Ionicons name="play" size={28} color="rgba(255,255,255,0.85)" />
            </View>
          ) : null}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  webview: { flex: 1 },
  tapLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPauseHint: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
