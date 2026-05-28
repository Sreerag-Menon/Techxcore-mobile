import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

export type VimeoModulePlayerProps = {
  url: string;
};

function toVimeoEmbedUrl(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes('player.vimeo.com/video/')) return url;

  const idMatch = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/i);
  if (idMatch?.[1]) {
    return `https://player.vimeo.com/video/${idMatch[1]}?playsinline=1`;
  }
  return url;
}

export function VimeoModulePlayer({ url }: VimeoModulePlayerProps) {
  const embedUrl = useMemo(() => toVimeoEmbedUrl(url), [url]);

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

