import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  type AppStateStatus,
  ImageBackground,
  type LayoutChangeEvent,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import YoutubePlayer, { type YoutubeIframeRef } from 'react-native-youtube-iframe';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ScreenOrientation from 'expo-screen-orientation';

import { useTheme } from '../../theme';
import { extractYoutubeVideoId } from '../../utils/embedVideoProgress';
import { logNextNavDiag } from '../../utils/progressDiagnostics';

export type YoutubeModulePlayerProps = {
  url: string;
  initialSeekSeconds?: number;
  onProgress?: (seconds: number, durationSeconds?: number) => void;
  onEnd?: () => void;
};

const PROGRESS_INTERVAL_MS = 1_000;
const STALL_THRESHOLD_MS = 10_000;
const APP_STATE_GUARD_MS = 1_500;

function youtubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

async function lockOrientationForFullscreen(isFullscreen: boolean) {
  await ScreenOrientation.lockAsync(
    isFullscreen
      ? ScreenOrientation.OrientationLock.LANDSCAPE
      : ScreenOrientation.OrientationLock.PORTRAIT_UP,
  ).catch(() => {});
}

export function YoutubeModulePlayer({
  url,
  initialSeekSeconds = 0,
  onProgress,
  onEnd,
}: YoutubeModulePlayerProps) {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const inlineFallbackHeight = Math.round(Math.min(screenWidth, 600) * (9 / 16));
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const resolvedPlayerWidth =
    containerSize.width > 0 ? containerSize.width : Math.round(Math.min(screenWidth, 600));
  const resolvedPlayerHeight =
    containerSize.height > 0 ? containerSize.height : inlineFallbackHeight;

  const playerRef = useRef<YoutubeIframeRef>(null);
  const mountedAtRef = useRef(Date.now());
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFullscreenRef = useRef(false);

  const videoId = useMemo(() => extractYoutubeVideoId(url), [url]);
  const thumbnailUrl = useMemo(
    () => (videoId ? youtubeThumbnailUrl(videoId) : null),
    [videoId],
  );

  const [playerMounted, setPlayerMounted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [embedError, setEmbedError] = useState<string | null>(null);
  const [stalled, setStalled] = useState(false);
  const [playerKey, setPlayerKey] = useState(0);

  const prevVideoIdRef = useRef<string | null>(null);
  if (videoId && videoId !== prevVideoIdRef.current) {
    prevVideoIdRef.current = videoId;
    if (playerMounted) setPlayerMounted(false);
    if (playing) setPlaying(false);
    if (isReady) setIsReady(false);
    if (embedError) setEmbedError(null);
    if (stalled) setStalled(false);
  }

  const stopProgressPolling = useCallback(() => {
    if (progressTimerRef.current !== null) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  const startProgressPolling = useCallback(() => {
    if (progressTimerRef.current !== null) return;
    progressTimerRef.current = setInterval(async () => {
      try {
        const seconds = await playerRef.current?.getCurrentTime();
        const videoDuration = await playerRef.current?.getDuration();
        const duration =
          typeof videoDuration === 'number' && Number.isFinite(videoDuration) && videoDuration > 0
            ? videoDuration
            : undefined;
        if (typeof seconds === 'number' && Number.isFinite(seconds)) {
          onProgress?.(seconds, duration);
        }
      } catch {
        // Player not yet ready
      }
    }, PROGRESS_INTERVAL_MS);
  }, [onProgress]);

  const clearStallTimer = useCallback(() => {
    if (stallTimerRef.current !== null) {
      clearTimeout(stallTimerRef.current);
      stallTimerRef.current = null;
    }
    setStalled(false);
  }, []);

  const startStallTimer = useCallback(() => {
    clearStallTimer();
    stallTimerRef.current = setTimeout(() => setStalled(true), STALL_THRESHOLD_MS);
  }, [clearStallTimer]);

  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    const roundedWidth = Math.round(width);
    const roundedHeight = Math.round(height);
    if (roundedWidth > 0 && roundedHeight > 0) {
      setContainerSize({ width: roundedWidth, height: roundedHeight });
    }
  }, []);

  const handleTapToPlay = useCallback(() => {
    setPlayerMounted(true);
  }, []);

  const onFullScreenChange = useCallback((isFullscreen: boolean) => {
    isFullscreenRef.current = isFullscreen;
    void lockOrientationForFullscreen(isFullscreen);
  }, []);

  const onChangeState = useCallback(
    (state: string) => {
      switch (state) {
        case 'playing':
          setPlaying(true);
          clearStallTimer();
          startProgressPolling();
          break;
        case 'paused':
          setPlaying(false);
          stopProgressPolling();
          clearStallTimer();
          break;
        case 'buffering':
          startStallTimer();
          break;
        case 'ended':
          setPlaying(false);
          stopProgressPolling();
          clearStallTimer();
          logNextNavDiag('youtube_ended', {
            videoId,
            note: 'Firing onEnd → PlayerContainer.handleComplete',
          });
          onEnd?.();
          break;
        case 'unstarted':
          clearStallTimer();
          break;
        default:
          break;
      }
    },
    [clearStallTimer, onEnd, startProgressPolling, startStallTimer, stopProgressPolling],
  );

  const onReady = useCallback(async () => {
    setIsReady(true);
    clearStallTimer();

    if (initialSeekSeconds > 0) {
      try {
        await playerRef.current?.seekTo(Math.max(0, initialSeekSeconds), true);
        onProgress?.(initialSeekSeconds);
      } catch {
        // ignore
      }
    }
  }, [clearStallTimer, initialSeekSeconds, onProgress]);

  const onError = useCallback((error: string) => {
    const hint =
      error === '150' || error === '101'
        ? 'This video cannot be embedded. Open it in YouTube.'
        : 'Unable to play this video.';
    setEmbedError(hint);
  }, []);

  const handleReload = useCallback(() => {
    setStalled(false);
    setIsReady(false);
    setPlaying(false);
    stopProgressPolling();
    setPlayerMounted(true);
    setPlayerKey((k) => k + 1);
  }, [stopProgressPolling]);

  useEffect(() => {
    const onAppStateChange = (next: AppStateStatus) => {
      if (Date.now() - mountedAtRef.current < APP_STATE_GUARD_MS) return;
      if (next !== 'active') setPlaying(false);
    };
    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    return () => {
      stopProgressPolling();
      clearStallTimer();
      if (isFullscreenRef.current) {
        void lockOrientationForFullscreen(false);
      }
    };
  }, [clearStallTimer, stopProgressPolling]);

  if (!videoId) {
    return (
      <View style={[styles.container, styles.fallback, { backgroundColor: colors.surface }]}>
        <Ionicons name="logo-youtube" size={36} color={colors.textTertiary} />
        <Text style={[styles.fallbackText, { color: colors.textSecondary }]}>
          Invalid or unsupported YouTube URL.
        </Text>
      </View>
    );
  }

  if (embedError) {
    return (
      <View style={[styles.container, styles.fallback, { backgroundColor: colors.surface }]}>
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={36} color="#fff" />
          <Text style={styles.errorTitle}>Playback unavailable</Text>
          <Text style={styles.errorMessage}>{embedError}</Text>
          <Pressable
            onPress={() => void Linking.openURL(url)}
            style={[styles.errorAction, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
            accessibilityLabel="Open in YouTube"
          >
            <Ionicons name="open-outline" size={18} color="#fff" />
            <Text style={styles.errorActionText}>Open in YouTube</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const initialStart = Math.max(0, Math.floor(initialSeekSeconds));
  const showPrePlay = !playerMounted;
  const showLoadingOverlay = playerMounted && !isReady && !stalled;

  return (
    <View onLayout={handleContainerLayout} style={styles.container}>
      {showPrePlay && thumbnailUrl ? (
        <ImageBackground
          source={{ uri: thumbnailUrl }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.65)']}
            style={StyleSheet.absoluteFillObject}
          />
        </ImageBackground>
      ) : null}

      {playerMounted ? (
        <View style={styles.webviewContainer}>
          <YoutubePlayer
            key={playerKey}
            ref={playerRef}
            height={resolvedPlayerHeight}
            width={resolvedPlayerWidth}
            videoId={videoId}
            play={playing}
            forceAndroidAutoplay
            viewContainerStyle={styles.viewContainer}
            initialPlayerParams={{
              start: initialStart,
              rel: false,
              controls: true,
              iv_load_policy: 3,
              preventFullScreen: false,
            }}
            onChangeState={onChangeState}
            onReady={onReady}
            onError={onError}
            onFullScreenChange={onFullScreenChange}
            webViewStyle={styles.webview}
            webViewProps={{
              allowsInlineMediaPlayback: true,
              mediaPlaybackRequiresUserAction: false,
              allowsFullscreenVideo: true,
              startInLoadingState: true,
            }}
          />
        </View>
      ) : null}

      {showLoadingOverlay ? (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Loading video…</Text>
          </View>
        </View>
      ) : null}

      {playerMounted && stalled ? (
        <View style={styles.stallOverlay}>
          <View style={styles.stallCard}>
            <Ionicons name="cloud-offline-outline" size={32} color="#fff" />
            <Text style={styles.stallTitle}>Connection stalled</Text>
            <Text style={styles.stallMessage}>
              The video is taking longer than expected. Try reloading.
            </Text>
            <Pressable
              onPress={handleReload}
              style={[styles.reloadBtn, { backgroundColor: colors.primary }]}
              accessibilityRole="button"
              accessibilityLabel="Reload video"
            >
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={styles.reloadText}>Reload video</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {showPrePlay ? (
        <Pressable
          onPress={handleTapToPlay}
          style={styles.tapToPlayOverlay}
          accessibilityRole="button"
          accessibilityLabel="Play video"
        >
          <View style={styles.tapToPlayChip}>
            <Ionicons name="play" size={28} color="#fff" />
            <Text style={styles.tapToPlayText}>Tap to play</Text>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    minHeight: 200,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  webviewContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  viewContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  tapToPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  tapToPlayChip: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  tapToPlayText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  loadingCard: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  loadingText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  stallOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: 24,
  },
  stallCard: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderRadius: 18,
    backgroundColor: 'rgba(20,20,20,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  stallTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  stallMessage: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  reloadBtn: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 22,
  },
  reloadText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 10,
    minHeight: 200,
  },
  fallbackText: {
    textAlign: 'center',
    fontSize: 14,
  },
  errorCard: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderRadius: 18,
    backgroundColor: 'rgba(20,20,20,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  errorTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  errorMessage: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  errorAction: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 22,
  },
  errorActionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
