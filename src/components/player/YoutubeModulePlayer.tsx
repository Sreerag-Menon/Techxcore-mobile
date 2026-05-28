import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

export type YoutubeModulePlayerProps = {
  url: string;
};

function toYoutubeEmbedUrl(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes('youtube.com/embed/')) return url;

  // youtu.be/<id>
  const youtuBeMatch = url.match(/youtu\.be\/([^?&#/]+)/i);
  if (youtuBeMatch?.[1]) {
    return `https://www.youtube.com/embed/${youtuBeMatch[1]}?playsinline=1`;
  }

  // youtube.com/watch?v=<id>
  const watchMatch = url.match(/[?&]v=([^?&#/]+)/i);
  if (watchMatch?.[1]) {
    return `https://www.youtube.com/embed/${watchMatch[1]}?playsinline=1`;
  }

  return url;
}

export function YoutubeModulePlayer({ url }: YoutubeModulePlayerProps) {
  const embedUrl = useMemo(() => toYoutubeEmbedUrl(url), [url]);

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: embedUrl }}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        style={styles.webview}
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

