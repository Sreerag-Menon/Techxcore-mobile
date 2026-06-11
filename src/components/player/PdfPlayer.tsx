import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  type DimensionValue,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { LiquidGlassView } from '../ui/LiquidGlassView';
import { useTheme } from '../../theme';
import { spacing } from '../../theme/spacing';
import { fontSize, lineHeight } from '../../theme/typography';
import {
  downloadUrlToCache,
  getCacheFileUri,
} from '../../utils/expoFileCache';
import { PdfWebView } from './PdfWebView';

export type PdfPlayerLayout = 'inline' | 'fullscreen';

export type PdfPlayerProps = {
  url: string;
  layout?: PdfPlayerLayout;
  /** When true, hides the Mark as Read flow (module already completed). */
  isCompleted?: boolean;
  onComplete?: () => void;
  onError?: (message: string) => void;
};

const READING_DURATION_MS = 30_000;
const PROGRESS_TICK_MS = 250;

function safeFileName(input: string) {
  return input.replace(/[^a-z0-9_-]+/gi, '_').slice(0, 80);
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function MarkAsReadButton({
  enabled,
  onPress,
}: {
  enabled: boolean;
  onPress: () => void;
}) {
  const { colors, fontFamily } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: enabled ? 1 : 0.45,
  }));

  const handlePressIn = () => {
    if (!enabled) return;
    scale.value = withSpring(0.97, { damping: 20, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 20, stiffness: 300 });
  };

  const handlePress = () => {
    if (!enabled) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityLabel="Mark PDF as read"
      accessibilityState={{ disabled: !enabled }}
      style={[
        animatedStyle,
        styles.markReadButton,
        { backgroundColor: colors.primary },
      ]}
    >
      <Text
        style={[
          styles.markReadButtonText,
          { color: colors.onPrimary, fontFamily: fontFamily.bold },
        ]}
      >
        Mark as Read
      </Text>
    </AnimatedPressable>
  );
}

export function PdfPlayer({ url, isCompleted = false, onComplete, onError }: PdfPlayerProps) {
  const { colors, fontFamily } = useTheme();
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const completedRef = useRef(false);
  const readingStartRef = useRef<number | null>(null);

  const cacheFileName = useMemo(
    () => (url ? `pdf_${safeFileName(url)}.pdf` : ''),
    [url],
  );

  const readingComplete = readingProgress >= 1;

  useEffect(() => {
    setIsLoaded(false);
    setReadingProgress(0);
    readingStartRef.current = null;
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

  useEffect(() => {
    if (!isLoaded || isCompleted) return;

    readingStartRef.current = Date.now();
    const interval = setInterval(() => {
      const start = readingStartRef.current;
      if (start == null) return;
      const elapsed = Date.now() - start;
      setReadingProgress(Math.min(1, elapsed / READING_DURATION_MS));
    }, PROGRESS_TICK_MS);

    return () => clearInterval(interval);
  }, [isCompleted, isLoaded, url]);

  const handleDoneReading = () => {
    if (completedRef.current || !readingComplete) return;
    completedRef.current = true;
    onComplete?.();
  };

  const progressWidth = `${Math.round(readingProgress * 100)}%` as DimensionValue;

  if (!localUri) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.surface }]}>
        <ActivityIndicator color={colors.primary} />
        <Text
          style={[
            styles.loadingText,
            { color: colors.textSecondary, fontFamily: fontFamily.medium },
          ]}
        >
          {isDownloading ? 'Downloading PDF…' : 'Loading PDF…'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isLoaded && !isCompleted ? (
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              { width: progressWidth, backgroundColor: colors.primary },
            ]}
          />
        </View>
      ) : null}

      <PdfWebView
        uri={localUri}
        style={styles.viewer}
        onLoadEnd={() => setIsLoaded(true)}
      />

      {isLoaded && !isCompleted ? (
        <View style={styles.completionOverlay} pointerEvents="box-none">
          <LiquidGlassView
            variant="sheet"
            borderRadius={0}
            style={styles.completionBar}
          >
            <View style={styles.completionInner}>
              {!readingComplete ? (
                <Text
                  style={[
                    styles.hintText,
                    { color: colors.textSecondary, fontFamily: fontFamily.medium },
                  ]}
                >
                  Keep reading to unlock completion
                </Text>
              ) : null}
              <MarkAsReadButton enabled={readingComplete} onPress={handleDoneReading} />
            </View>
          </LiquidGlassView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    alignSelf: 'stretch',
    position: 'relative',
  },
  progressTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    zIndex: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  viewer: {
    flex: 1,
  },
  loading: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
  },
  completionOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3,
  },
  completionBar: {
    flex: undefined,
    height: 'auto',
    width: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  completionInner: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  hintText: {
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
    textAlign: 'center',
  },
  markReadButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 999,
    minWidth: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markReadButtonText: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
  },
});
