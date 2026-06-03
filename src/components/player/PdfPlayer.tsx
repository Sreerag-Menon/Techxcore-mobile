import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import * as FileSystem from 'expo-file-system';

import { useTheme } from '../../theme';
import { PdfWebView } from './PdfWebView';

export type PdfPlayerProps = {
  url: string;
  onComplete?: () => void;
  onError?: (message: string) => void;
};

function safeFileName(input: string) {
  return input.replace(/[^a-z0-9_-]+/gi, '_').slice(0, 80);
}

export function PdfPlayer({ url, onError }: PdfPlayerProps) {
  const { colors } = useTheme();
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const cachePath = useMemo(() => {
    const base =
      // expo-file-system SDK54 exposes Paths.cache/document; `uri` is present at runtime.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((FileSystem.Paths.cache as any).uri as string | undefined) ??
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((FileSystem.Paths.document as any).uri as string | undefined) ??
      '';
    if (!base) return '';
    return `${base}pdf_${safeFileName(url)}.pdf`;
  }, [url]);

  useEffect(() => {
    let isMounted = true;

    async function resolveUri() {
      try {
        if (!url) return;

        if (!url.startsWith('http')) {
          setLocalUri(url);
          return;
        }

        if (!cachePath) {
          setLocalUri(url);
          return;
        }

        setIsDownloading(true);
        const info = await FileSystem.getInfoAsync(cachePath);
        if (info.exists && info.uri) {
          if (isMounted) setLocalUri(info.uri);
          return;
        }

        const result = await FileSystem.downloadAsync(url, cachePath);
        if (isMounted) setLocalUri(result.uri);
      } catch (e) {
        onError?.(e instanceof Error ? e.message : 'Failed to load PDF');
        setLocalUri(url);
      } finally {
        if (isMounted) setIsDownloading(false);
      }
    }

    void resolveUri();
    return () => {
      isMounted = false;
    };
  }, [cachePath, onError, url]);

  if (!localUri) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.surface }]}>
        <ActivityIndicator />
        <Text style={{ color: colors.textSecondary, marginTop: 8 }}>
          {isDownloading ? 'Downloading PDF…' : 'Loading PDF…'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PdfWebView uri={localUri} style={styles.viewer} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 420,
    borderRadius: 16,
    overflow: 'hidden',
  },
  viewer: {
    flex: 1,
  },
  loading: {
    width: '100%',
    height: 420,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
