import { useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { VideoView, useVideoPlayer, type VideoSource } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../../theme';
import { formatMediaTime } from '../../utils/formatTime';

export type VideoPlayerLayout = 'inline' | 'fullscreen';

export type VideoPlayerProps = {
  url: string;
  initialSeekSeconds?: number;
  layout?: VideoPlayerLayout;
  /** When false, seek bar is display-only (course publish setting). */
  seekable?: boolean;
  onProgress?: (seconds: number) => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
  onFullscreenRequest?: () => void;
};

const CONTROLS_HIDE_MS = 3000;

export function VideoPlayer({
  url,
  initialSeekSeconds = 0,
  layout = 'inline',
  seekable = true,
  onProgress,
  onEnd,
  onError,
  onFullscreenRequest,
}: VideoPlayerProps) {
  const { colors } = useTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProgressAt = useRef<number>(0);
  const initialSeekSecondsRef = useRef(initialSeekSeconds);
  const hasAppliedInitialSeekRef = useRef(false);
  const onProgressRef = useRef(onProgress);
  const onEndRef = useRef(onEnd);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onProgressRef.current = onProgress;
    onEndRef.current = onEnd;
    onErrorRef.current = onError;
  }, [onEnd, onError, onProgress]);

  const source: VideoSource = useMemo(() => ({ uri: url }), [url]);
  const player = useVideoPlayer(source, (p) => {
    p.timeUpdateEventInterval = 0.5;
    p.keepScreenOnWhilePlaying = true;
  });

  useEffect(() => {
    hasAppliedInitialSeekRef.current = false;
  }, [url]);

  const clearHideTimer = () => {
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
      hideControlsTimer.current = null;
    }
  };

  const scheduleHideControls = () => {
    clearHideTimer();
    if (!isPlaying) return;
    hideControlsTimer.current = setTimeout(() => {
      setControlsVisible(false);
    }, CONTROLS_HIDE_MS);
  };

  useEffect(() => {
    if (controlsVisible && isPlaying) {
      scheduleHideControls();
    } else {
      clearHideTimer();
    }
    return clearHideTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- timer tied to visibility + playback
  }, [controlsVisible, isPlaying]);

  useEffect(() => {
    initialSeekSecondsRef.current = initialSeekSeconds;
  }, [initialSeekSeconds]);

  useEffect(() => {
    const applyInitialSeek = () => {
      if (hasAppliedInitialSeekRef.current) return;
      if (initialSeekSecondsRef.current <= 0) {
        hasAppliedInitialSeekRef.current = true;
        return;
      }
      // Never seek mid-playback — only on cold load near t=0
      if (player.currentTime > 1) {
        hasAppliedInitialSeekRef.current = true;
        return;
      }
      player.currentTime = initialSeekSecondsRef.current;
      hasAppliedInitialSeekRef.current = true;
    };

    const seekSub = player.addListener('statusChange', (payload) => {
      if (payload.status === 'readyToPlay') {
        applyInitialSeek();
      }
    });
    if (player.status === 'readyToPlay') {
      applyInitialSeek();
    }
    return () => seekSub.remove();
    // initialSeekSeconds intentionally omitted — seek only on new video load, not mid-playback cache updates
  }, [player, url]);

  useEffect(() => {
    const subStatus = player.addListener('statusChange', (payload) => {
      if (payload.error) {
        onErrorRef.current?.(payload.error.message ?? 'Video playback error');
      }
      if (payload.status === 'readyToPlay' && Number.isFinite(player.duration)) {
        setDuration(player.duration);
      }
    });
    const subPlaying = player.addListener('playingChange', (payload) => {
      setIsPlaying(payload.isPlaying);
      if (payload.isPlaying) {
        setControlsVisible(true);
      }
    });
    const subTime = player.addListener('timeUpdate', (payload) => {
      setCurrentTime(payload.currentTime);
      if (Number.isFinite(player.duration) && player.duration > 0) {
        setDuration(player.duration);
      }
      const onProgressCb = onProgressRef.current;
      if (!onProgressCb) return;
      const now = Date.now();
      if (now - lastProgressAt.current < 900) return;
      lastProgressAt.current = now;
      onProgressCb(payload.currentTime);
    });
    const subEnd = player.addListener('playToEnd', () => {
      onEndRef.current?.();
    });

    return () => {
      subStatus.remove();
      subPlaying.remove();
      subTime.remove();
      subEnd.remove();
    };
  }, [player]);

  const progressRatio = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  const handleTogglePlay = () => {
    if (player.playing) {
      player.pause();
      setControlsVisible(true);
      clearHideTimer();
    } else {
      player.play();
      setControlsVisible(true);
    }
  };

  const handleSeek = (locationX: number) => {
    if (!seekable || trackWidth <= 0 || duration <= 0) return;
    const ratio = Math.min(1, Math.max(0, locationX / trackWidth));
    const nextTime = ratio * duration;
    player.currentTime = nextTime;
    setCurrentTime(nextTime);
    onProgress?.(nextTime);
    setControlsVisible(true);
    scheduleHideControls();
  };

  const handleTrackLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  const showFullscreenButton = layout === 'inline' && Boolean(onFullscreenRequest);

  return (
    <View style={styles.root}>
      <VideoView
        player={player}
        style={styles.video}
        allowsPictureInPicture
        nativeControls={false}
        contentFit="contain"
        fullscreenOptions={{ enable: false, orientation: 'default' }}
      />

      <Pressable
        style={styles.tapLayer}
        onPress={() => {
          setControlsVisible((prev) => !prev);
        }}
      />

      {controlsVisible ? (
        <>
          <View style={styles.centerPlay} pointerEvents="box-none">
            <Pressable
              onPress={handleTogglePlay}
              style={styles.centerPlayButton}
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
            >
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={28} color="#fff" />
            </Pressable>
          </View>

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.85)']}
            style={styles.controlsBar}
            pointerEvents="box-none"
          >
            <View style={styles.controlsRow}>
              <Pressable
                onPress={handleTogglePlay}
                accessibilityRole="button"
                accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
                hitSlop={8}
              >
                <Ionicons name={isPlaying ? 'pause' : 'play'} size={22} color="#fff" />
              </Pressable>

              <Text style={styles.timeText}>{formatMediaTime(currentTime)}</Text>

              <View style={styles.progressTrackWrap}>
                <Pressable
                  onLayout={handleTrackLayout}
                  onPress={seekable ? (event) => handleSeek(event.nativeEvent.locationX) : undefined}
                  style={[styles.progressTrack, !seekable && styles.progressTrackLocked]}
                  accessibilityRole={seekable ? 'adjustable' : 'progressbar'}
                  accessibilityLabel={seekable ? 'Seek' : 'Playback progress (seeking disabled)'}
                >
                  <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
                </Pressable>
                {!seekable ? (
                  <View style={styles.seekLockOverlay} pointerEvents="none">
                    <Ionicons name="lock-closed" size={10} color="rgba(255,255,255,0.7)" />
                  </View>
                ) : null}
              </View>

              <Text style={styles.timeText}>{formatMediaTime(duration)}</Text>

              {showFullscreenButton ? (
                <Pressable
                  onPress={onFullscreenRequest}
                  accessibilityRole="button"
                  accessibilityLabel="Enter fullscreen"
                  hitSlop={8}
                >
                  <Ionicons name="expand" size={20} color="#fff" />
                </Pressable>
              ) : (
                <View style={styles.fullscreenSpacer} />
              )}
            </View>
          </LinearGradient>
        </>
      ) : null}

      {!controlsVisible && isPlaying ? (
        <View style={styles.playingIndicator} pointerEvents="none">
          <View style={[styles.playingDot, { backgroundColor: colors.primary }]} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  tapLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  centerPlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerPlayButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlsBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingTop: 28,
    paddingBottom: 12,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    minWidth: 36,
    textAlign: 'center',
  },
  progressTrackWrap: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  progressTrackLocked: {
    opacity: 0.85,
  },
  seekLockOverlay: {
    position: 'absolute',
    right: 0,
    top: -6,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressFill: {
    height: 4,
    borderRadius: 999,
    backgroundColor: '#fff',
  },
  fullscreenSpacer: {
    width: 20,
  },
  playingIndicator: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  playingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
