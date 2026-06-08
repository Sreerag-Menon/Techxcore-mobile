import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View, type ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';

export type PdfWebViewProps = {
  uri: string;
  style?: ViewStyle;
  onLoadEnd?: () => void;
};

/** Expo Go–compatible PDF display via WebView (local file:// or remote https://). */
export function PdfWebView({ uri, style, onLoadEnd }: PdfWebViewProps) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <View style={[styles.container, style]}>
      {isLoading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator />
        </View>
      ) : null}
      <WebView
        source={{ uri }}
        style={styles.webview}
        originWhitelist={['*']}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => {
          setIsLoading(false);
          onLoadEnd?.();
        }}
        onError={() => setIsLoading(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
});
