import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme';
import {
  downloadUrlToCache,
  getCacheFileUri,
} from '../../utils/expoFileCache';
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

  const cacheFileName = useMemo(
    () => (url ? `pdf_${safeFileName(url)}.pdf` : ''),
    [url],
  );

  useEffect(() => {
    let isMounted = true;

    async function resolveUri() {
      try {
        if (!url) return;

        if (!url.startsWith('http')) {
          setLocalUri(url);
          return;
        }

        if (!cacheFileName) {
          setLocalUri(url);
          return;
        }

        const cachedUri = getCacheFileUri(cacheFileName);
        if (cachedUri) {
          if (isMounted) setLocalUri(cachedUri);
          return;
        }

        setIsDownloading(true);
        const downloadedUri = await downloadUrlToCache(cacheFileName, url);
        if (isMounted) setLocalUri(downloadedUri ?? url);
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
  }, [cacheFileName, onError, url]);

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
