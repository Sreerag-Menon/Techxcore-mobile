import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

import {
  WEBVIEW_EMBED_BASE_URL,
  buildVimeoProgressHtml,
  extractVimeoVideoId,
  parseEmbedProgressMessage,
  parseEmbedWebViewMessage,
} from '../../utils/embedVideoProgress';

export type VimeoModulePlayerLayout = 'inline' | 'fullscreen';

export type VimeoModulePlayerProps = {
  url: string;
  initialSeekSeconds?: number;
  initialMaxViewedSeconds?: number;
  minSeekSeconds?: number;
  layout?: VimeoModulePlayerLayout;
  seekable?: boolean;
  onProgress?: (seconds: number) => void;
  onEnd?: () => void;
  onFullscreenRequest?: () => void;
};

export function VimeoModulePlayer({
  url,
  initialSeekSeconds = 0,
  initialMaxViewedSeconds = 0,
  minSeekSeconds = 0,
  layout = 'inline',
  seekable = true,
  onProgress,
  onEnd,
  onFullscreenRequest,
}: VimeoModulePlayerProps) {
  const videoId = useMemo(() => extractVimeoVideoId(url), [url]);
  const html = useMemo(
    () =>
      videoId
        ? buildVimeoProgressHtml(videoId, {
            seekable,
            maxSeekSeconds: Math.max(initialSeekSeconds, initialMaxViewedSeconds, minSeekSeconds),
            minSeekSeconds,
          })
        : null,
    [initialMaxViewedSeconds, initialSeekSeconds, minSeekSeconds, seekable, videoId],
  );

  if (!html) {
    return null;
  }

  const showFullscreenButton = layout === 'inline' && Boolean(onFullscreenRequest);

  return (
    <View style={[styles.container, layout === 'fullscreen' && styles.containerFullscreen]}>
      <WebView
        source={{ html, baseUrl: WEBVIEW_EMBED_BASE_URL }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo={false}
        style={styles.webview}
        injectedJavaScript={
          initialSeekSeconds > 0
            ? `setTimeout(function(){ try { if (typeof player !== 'undefined') player.setCurrentTime(${initialSeekSeconds}); } catch(e) {} }, 1500); true;`
            : undefined
        }
        onMessage={(event) => {
          const message = parseEmbedWebViewMessage(event.nativeEvent.data);
          if (message?.type === 'progress') {
            onProgress?.(message.seconds);
            return;
          }
          if (message?.type === 'ended') {
            onEnd?.();
            return;
          }
          const seconds = parseEmbedProgressMessage(event.nativeEvent.data);
          if (seconds != null) onProgress?.(seconds);
        }}
      />

      {!seekable ? (
        <View style={styles.lockedBadge} pointerEvents="none">
          <Ionicons name="lock-closed" size={11} color="#fff" />
        </View>
      ) : null}

      {showFullscreenButton ? (
        <Pressable
          onPress={onFullscreenRequest}
          accessibilityRole="button"
          accessibilityLabel="Enter fullscreen"
          style={styles.fullscreenButton}
          hitSlop={8}
        >
          <Ionicons name="expand" size={18} color="#fff" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#000',
  },
  containerFullscreen: {
    minHeight: 200,
  },
  webview: { flex: 1 },
  lockedBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
