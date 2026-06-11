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
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { useTheme } from '../../theme';
import { formatMediaTime } from '../../utils/formatTime';
import { extractYoutubeVideoId } from '../../utils/embedVideoProgress';

export type YoutubeModulePlayerLayout = 'inline' | 'fullscreen';

export type YoutubeModulePlayerProps = {
  url: string;
  initialSeekSeconds?: number;
  initialMaxViewedSeconds?: number;
  minSeekSeconds?: number;
  layout?: YoutubeModulePlayerLayout;
  seekable?: boolean;
  /** Resume playback when the WebView becomes ready (fullscreen handoff). */
  autoResumeOnReady?: boolean;
  /** Restored session flags when remounting (e.g. fullscreen). */
  sessionHasStarted?: boolean;
  onSessionChange?: (session: YoutubePlaybackSession) => void;
  onProgress?: (seconds: number) => void;
  onEnd?: () => void;
  onFullscreenRequest?: () => void;
};

const PROGRESS_INTERVAL_MS = 1_000;
const STALL_THRESHOLD_MS = 10_000;
const APP_STATE_GUARD_MS = 1500;
const CONTROLS_HIDE_MS = 4000;
const COMMAND_LOCK_MS = 3000;

export type YoutubePlaybackSession = {
  playing: boolean;
  hasStarted: boolean;
};

function youtubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}


export function YoutubeModulePlayer({
  url,
  initialSeekSeconds = 0,
  initialMaxViewedSeconds = 0,
  minSeekSeconds = 0,
  layout = 'inline',
  seekable = true,
  autoResumeOnReady = false,
  sessionHasStarted = false,
  onSessionChange,
  onProgress,
  onEnd,
  onFullscreenRequest,
}: YoutubeModulePlayerProps) {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const inlineFallbackHeight = Math.round(Math.min(screenWidth, 600) * (9 / 16));
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  let resolvedPlayerWidth =
    containerSize.width > 0 ? containerSize.width : Math.round(Math.min(screenWidth, 600));
  let resolvedPlayerHeight: number;

  if (layout === 'fullscreen' && containerSize.width > 0 && containerSize.height > 0) {
    const heightFromWidth = Math.round(containerSize.width * (9 / 16));
    if (heightFromWidth <= containerSize.height) {
      resolvedPlayerHeight = heightFromWidth;
    } else {
      resolvedPlayerHeight = containerSize.height;
      resolvedPlayerWidth = Math.round(containerSize.height * (16 / 9));
    }
  } else {
    resolvedPlayerHeight =
      containerSize.height > 0 ? containerSize.height : inlineFallbackHeight;
  }

  const playerRef = useRef<YoutubeIframeRef>(null);
  const pendingPlayRef = useRef(autoResumeOnReady);
  const commandLockUntilRef = useRef(0);
  const lastPlayCommandRef = useRef<boolean | null>(null);
  const mountedAtRef = useRef(Date.now());
  const maxViewedSecondsRef = useRef(
    Math.max(initialSeekSeconds, initialMaxViewedSeconds, minSeekSeconds),
  );
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playFallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const videoId = useMemo(() => extractYoutubeVideoId(url), [url]);
  const thumbnailUrl = useMemo(
    () => (videoId ? youtubeThumbnailUrl(videoId) : null),
    [videoId],
  );

  const [playerMounted, setPlayerMounted] = useState(layout === 'fullscreen');
  const [playing, setPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(sessionHasStarted);
  const [isReady, setIsReady] = useState(false);
  const [embedError, setEmbedError] = useState<string | null>(null);
  const [stalled, setStalled] = useState(false);
  const [playerKey, setPlayerKey] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [currentTime, setCurrentTime] = useState(initialSeekSeconds);
  const [duration, setDuration] = useState(0);

  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const prevVideoIdRef = useRef<string | null>(null);
  if (videoId && videoId !== prevVideoIdRef.current) {
    prevVideoIdRef.current = videoId;
    if (playerMounted) setPlayerMounted(layout === 'fullscreen');
    pendingPlayRef.current = false;
    if (playing) setPlaying(false);
    if (hasStarted) setHasStarted(false);
    if (isReady) setIsReady(false);
    maxViewedSecondsRef.current = Math.max(
      initialSeekSeconds,
      initialMaxViewedSeconds,
      minSeekSeconds,
    );
    setCurrentTime(initialSeekSeconds);
    setDuration(0);
  }

  const setPlayingCommand = useCallback((next: boolean) => {
    commandLockUntilRef.current = Date.now() + COMMAND_LOCK_MS;
    lastPlayCommandRef.current = next;
    setPlaying(next);
  }, []);

  const shouldIgnoreStateEcho = useCallback((state: 'playing' | 'paused') => {
    if (Date.now() >= commandLockUntilRef.current) return false;
    if (state === 'paused' && lastPlayCommandRef.current === true) return true;
    if (state === 'playing' && lastPlayCommandRef.current === false) return true;
    return false;
  }, []);

  const maxAllowedSeek = useCallback(
    (videoDuration: number) => {
      if (seekable || videoDuration <= 0) return videoDuration;
      return Math.min(maxViewedSecondsRef.current, videoDuration);
    },
    [seekable],
  );

  const clearHideTimer = useCallback(() => {
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
      hideControlsTimer.current = null;
    }
  }, []);

  const scheduleHideControls = useCallback(() => {
    clearHideTimer();
    if (!playing) return;
    hideControlsTimer.current = setTimeout(() => {
      setControlsVisible(false);
    }, CONTROLS_HIDE_MS);
  }, [clearHideTimer, playing]);

  useEffect(() => {
    if (controlsVisible && playing && isReady) {
      scheduleHideControls();
    } else {
      clearHideTimer();
    }
    return clearHideTimer;
  }, [clearHideTimer, controlsVisible, isReady, playing, scheduleHideControls]);

  useEffect(() => {
    onSessionChange?.({ playing, hasStarted });
  }, [hasStarted, onSessionChange, playing]);

  useEffect(() => {
    const onAppStateChange = (next: AppStateStatus) => {
      if (Date.now() - mountedAtRef.current < APP_STATE_GUARD_MS) return;
      if (next !== 'active') setPlayingCommand(false);
    };
    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, [setPlayingCommand]);

  const enforceForwardCap = useCallback(
    async (seconds: number, videoDuration: number) => {
      if (seekable) return;
      const maxAllowed = maxAllowedSeek(videoDuration);
      if (seconds <= maxAllowed + 0.5) return;
      try {
        await playerRef.current?.seekTo(maxAllowed, true);
        setCurrentTime(maxAllowed);
        onProgress?.(maxAllowed);
      } catch {
        // ignore
      }
    },
    [maxAllowedSeek, onProgress, seekable],
  );

  const startProgressPolling = useCallback(() => {
    if (progressTimerRef.current !== null) return;
    progressTimerRef.current = setInterval(async () => {
      try {
        const seconds = await playerRef.current?.getCurrentTime();
        const videoDuration = await playerRef.current?.getDuration();
        if (typeof videoDuration === 'number' && Number.isFinite(videoDuration) && videoDuration > 0) {
          setDuration(videoDuration);
        }
        if (typeof seconds === 'number' && Number.isFinite(seconds)) {
          maxViewedSecondsRef.current = Math.max(maxViewedSecondsRef.current, seconds);
          const dur =
            typeof videoDuration === 'number' && videoDuration > 0 ? videoDuration : duration;
          await enforceForwardCap(seconds, dur);
          const updated = await playerRef.current?.getCurrentTime();
          const safeSeconds =
            typeof updated === 'number' && Number.isFinite(updated) ? updated : seconds;
          setCurrentTime(safeSeconds);
          onProgress?.(safeSeconds);
        }
      } catch {
        // Player not yet ready
      }
    }, PROGRESS_INTERVAL_MS);
  }, [duration, enforceForwardCap, onProgress]);

  const stopProgressPolling = useCallback(() => {
    if (progressTimerRef.current !== null) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

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

  const handleTapToPlay = useCallback(() => {
    pendingPlayRef.current = true;
    setPlayerMounted(true);
    setControlsVisible(true);

    // Fallback: if player doesn't start within 3s, force a retry
    if (playFallbackTimer.current) clearTimeout(playFallbackTimer.current);
    playFallbackTimer.current = setTimeout(() => {
      if (pendingPlayRef.current) {
        pendingPlayRef.current = false;
        setPlayingCommand(true);
        try {
          playerRef.current?.seekTo(Math.max(0, initialSeekSeconds), true);
        } catch { /* ignore */ }
      }
    }, 3000);
  }, [initialSeekSeconds, setPlayingCommand]);

  // Bottom-bar play/pause — sole authoritative playback toggle
  const togglePlayback = useCallback(() => {
    setPlaying((prev) => {
      const next = !prev;
      commandLockUntilRef.current = Date.now() + COMMAND_LOCK_MS;
      lastPlayCommandRef.current = next;
      return next;
    });
    setControlsVisible(true);
  }, []);

  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    const roundedWidth = Math.round(width);
    const roundedHeight = Math.round(height);
    if (roundedWidth > 0 && roundedHeight > 0) {
      setContainerSize({ width: roundedWidth, height: roundedHeight });
    }
  }, []);

  // Surface tap — start playback before first frame; after that toggle controls only
  const handleSurfaceTap = useCallback(() => {
    if (!hasStarted) {
      setPlayingCommand(true);
      setControlsVisible(true);
      return;
    }
    setControlsVisible((visible) => !visible);
  }, [hasStarted, setPlayingCommand]);

  const onChangeState = useCallback(
    (state: string) => {
      switch (state) {
        case 'playing':
          commandLockUntilRef.current = 0;
          // Clear any pending play fallback since we're now playing
          if (playFallbackTimer.current) {
            clearTimeout(playFallbackTimer.current);
            playFallbackTimer.current = null;
          }
          pendingPlayRef.current = false;
          if (shouldIgnoreStateEcho('playing')) break;
          setPlaying(true);
          if (!hasStarted) {
            setHasStarted(true);
            // Ensure controls show briefly on first play
            setControlsVisible(true);
          }
          clearStallTimer();
          startProgressPolling();
          break;
        case 'paused':
          if (shouldIgnoreStateEcho('paused')) break;
          setPlaying(false);
          stopProgressPolling();
          clearStallTimer();
          setControlsVisible(true);
          break;
        case 'buffering':
          if (lastPlayCommandRef.current === true) {
            commandLockUntilRef.current = Date.now() + COMMAND_LOCK_MS;
          }
          startStallTimer();
          break;
        case 'ended':
          setPlaying(false);
          stopProgressPolling();
          clearStallTimer();
          setControlsVisible(true);
          onEnd?.();
          break;
        case 'unstarted':
          clearStallTimer();
          break;
        default:
          break;
      }
    },
    [
      clearStallTimer,
      hasStarted,
      onEnd,
      shouldIgnoreStateEcho,
      startProgressPolling,
      startStallTimer,
      stopProgressPolling,
    ],
  );

  const onReady = useCallback(async () => {
    setIsReady(true);
    maxViewedSecondsRef.current = Math.max(
      maxViewedSecondsRef.current,
      initialSeekSeconds,
      initialMaxViewedSeconds,
      minSeekSeconds,
    );

    // Workaround for v2.4.1: seek to initial position to "wake up" the player
    try {
      await playerRef.current?.seekTo(Math.max(0, initialSeekSeconds), true);
    } catch { /* ignore */ }

    if (pendingPlayRef.current || autoResumeOnReady) {
      pendingPlayRef.current = false;
      setPlayingCommand(true);
    } else if (layout === 'fullscreen' && initialSeekSeconds > 0) {
      setPlayingCommand(true);
    }
    try {
      const videoDuration = await playerRef.current?.getDuration();
      if (typeof videoDuration === 'number' && Number.isFinite(videoDuration)) {
        setDuration(videoDuration);
      }
    } catch {
      // ignore
    }
  }, [
    autoResumeOnReady,
    initialMaxViewedSeconds,
    initialSeekSeconds,
    layout,
    minSeekSeconds,
    setPlayingCommand,
  ]);

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
    setHasStarted(false);
    setPlaying(false);
    pendingPlayRef.current = false;
    stopProgressPolling();
    setPlayerMounted(layout === 'fullscreen');
    setPlayerKey((k) => k + 1);
  }, [layout, stopProgressPolling]);

  useEffect(() => {
    return () => {
      stopProgressPolling();
      clearStallTimer();
      clearHideTimer();
      if (playFallbackTimer.current) {
        clearTimeout(playFallbackTimer.current);
        playFallbackTimer.current = null;
      }
    };
  }, [clearHideTimer, clearStallTimer, stopProgressPolling]);

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
  const showCustomControls = playerMounted && isReady && !stalled;
  const showFullscreenButton = layout === 'inline' && Boolean(onFullscreenRequest);
  const progressRatio = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const maxSeekRatio =
    duration > 0 && !seekable ? Math.min(1, maxAllowedSeek(duration) / duration) : 1;

  const showTapSurface = playerMounted && isReady && !stalled;
  const showCenterStartHint = showTapSurface && !hasStarted;

  return (
    <View
      onLayout={handleContainerLayout}
      style={[
        styles.container,
        layout === 'fullscreen' ? styles.containerFullscreen : styles.containerInline,
      ]}
    >
      {/* Thumbnail before player mounts */}
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

      {/* YouTube WebView — pointerEvents is "auto" until the first play gesture
          unlocks YouTube, then switches to "none" so custom controls are the
          sole touch handler (prevents double-tap race conditions). */}
      {playerMounted ? (
        <View
          pointerEvents={hasStarted ? 'none' : 'auto'}
          style={
            layout === 'fullscreen'
              ? {
                  width: resolvedPlayerWidth,
                  height: resolvedPlayerHeight,
                }
              : styles.webviewContainer
          }
        >
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
              controls: false,
              iv_load_policy: 3,
              preventFullScreen: true,
            }}
            onChangeState={onChangeState}
            onReady={onReady}
            onError={onError}
            webViewStyle={styles.webview}
            webViewProps={{
              allowsInlineMediaPlayback: true,
              mediaPlaybackRequiresUserAction: false,
              allowsFullscreenVideo: false,
              startInLoadingState: true,
            }}
          />
        </View>
      ) : null}

      {/* Loading overlay */}
      {showLoadingOverlay ? (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Loading video…</Text>
          </View>
        </View>
      ) : null}

      {/* Stalled overlay */}
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

      {/* Pre-play tap overlay */}
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

      {/* Full-surface tap layer — toggles controls visibility after playback starts */}
      {showTapSurface ? (
        <Pressable
          onPress={handleSurfaceTap}
          style={styles.tapLayer}
          accessibilityRole="button"
          accessibilityLabel={hasStarted ? 'Toggle controls' : 'Play video'}
        >
          {showCenterStartHint ? (
            <View style={styles.centerPlayBtn} pointerEvents="none">
              <View style={styles.centerPlayCircle}>
                <Ionicons name="play" size={40} color="#fff" />
              </View>
              <Text style={styles.centerPlayHintText}>Tap to play</Text>
            </View>
          ) : null}
        </Pressable>
      ) : null}

      {/* Bottom controls bar — uses box-none so only actual buttons catch taps;
          the gradient background lets taps pass through to the surface layer. */}
      {showCustomControls && controlsVisible ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={styles.controlsBarTouchable}
          pointerEvents="box-none"
        >
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.9)']}
            style={styles.controlsBar}
            pointerEvents="box-none"
          >
            <Text style={styles.timeText}>
              {formatMediaTime(currentTime)} / {formatMediaTime(duration)}
            </Text>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progressRatio * 100}%`,
                    maxWidth: `${maxSeekRatio * 100}%`,
                  },
                ]}
              />
              {!seekable ? (
                <View style={styles.seekLockBadge} pointerEvents="none">
                  <Ionicons name="lock-closed" size={10} color="rgba(255,255,255,0.8)" />
                </View>
              ) : null}
            </View>

            <View style={styles.controlsRow} pointerEvents="auto">
              <Pressable
                onPress={togglePlayback}
                accessibilityRole="button"
                accessibilityLabel={playing ? 'Pause' : 'Play'}
                hitSlop={16}
                style={styles.controlButton}
              >
                <Ionicons name={playing ? 'pause' : 'play'} size={22} color="#fff" />
              </Pressable>

              <View style={styles.controlsSpacer} />

              {!seekable ? (
                <View style={styles.lockedBadgeInline}>
                  <Ionicons name="lock-closed" size={11} color="#fff" />
                  <Text style={styles.lockedBadgeText}>Seeking disabled</Text>
                </View>
              ) : null}

              {showFullscreenButton ? (
                <Pressable
                  onPress={onFullscreenRequest}
                  accessibilityRole="button"
                  accessibilityLabel="Enter fullscreen"
                  hitSlop={16}
                  style={styles.controlButton}
                >
                  <Ionicons name="expand" size={20} color="#fff" />
                </Pressable>
              ) : null}
            </View>
          </LinearGradient>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  containerInline: {
    flex: 1,
    minHeight: 200,
  },
  containerFullscreen: {
    flex: 1,
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
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
  tapLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  centerPlayHintText: {
    marginTop: 10,
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  centerPlayBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerPlayCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
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
  controlsBarTouchable: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
  controlsBar: {
    paddingHorizontal: 12,
    paddingTop: 28,
    paddingBottom: 12,
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  progressTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginBottom: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    height: 4,
    borderRadius: 999,
    backgroundColor: '#fff',
  },
  seekLockBadge: {
    position: 'absolute',
    right: 4,
    top: -5,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  controlsSpacer: {
    flex: 1,
  },
  controlButton: {
    padding: 4,
  },
  lockedBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  lockedBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
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
