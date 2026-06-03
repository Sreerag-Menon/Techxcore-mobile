import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import {
  buildYoutubeProgressHtml,
  extractYoutubeVideoId,
  parseEmbedProgressMessage,
} from '../../utils/embedVideoProgress';

export type YoutubeModulePlayerProps = {
  url: string;
  initialSeekSeconds?: number;
  onProgress?: (seconds: number) => void;
};

export function YoutubeModulePlayer({
  url,
  initialSeekSeconds = 0,
  onProgress,
}: YoutubeModulePlayerProps) {
  const videoId = useMemo(() => extractYoutubeVideoId(url), [url]);
  const html = useMemo(
    () => (videoId ? buildYoutubeProgressHtml(videoId) : null),
    [videoId],
  );

  if (!html) {
    return null;
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ html }}
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
          const seconds = parseEmbedProgressMessage(event.nativeEvent.data);
          if (seconds != null) onProgress?.(seconds);
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
});
