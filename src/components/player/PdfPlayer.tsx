import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme';
import {
  downloadUrlToCache,
  getCacheFileUri,
} from '../../utils/expoFileCache';
import { PdfWebView } from './PdfWebView';

export type PdfPlayerLayout = 'inline' | 'fullscreen';

export type PdfPlayerProps = {
  url: string;
  layout?: PdfPlayerLayout;
  onComplete?: () => void;
  onError?: (message: string) => void;
};

function safeFileName(input: string) {
  return input.replace(/[^a-z0-9_-]+/gi, '_').slice(0, 80);
}

export function PdfPlayer({ url, onComplete, onError }: PdfPlayerProps) {
  const { colors } = useTheme();
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const completedRef = useRef(false);

  const cacheFileName = useMemo(
    () => (url ? `pdf_${safeFileName(url)}.pdf` : ''),
    [url],
  );

  useEffect(() => {
    setIsLoaded(false);
    completedRef.current = false;
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

  const handleDoneReading = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete?.();
  };

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
    <View style={styles.container}>
      <PdfWebView
        uri={localUri}
        style={styles.viewer}
        onLoadEnd={() => setIsLoaded(true)}
      />
      {isLoaded ? (
        <View style={[styles.doneBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <Pressable
            onPress={handleDoneReading}
            accessibilityRole="button"
            accessibilityLabel="Mark PDF as read"
            style={[styles.doneButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.doneButtonText}>Done Reading</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  viewer: {
    flex: 1,
  },
  loading: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  doneButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  doneButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
