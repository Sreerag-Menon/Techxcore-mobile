import { useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager, Pressable, StyleSheet, Text, View } from 'react-native';
import { VideoView, useVideoPlayer, type VideoSource } from 'expo-video';
import * as ScreenOrientation from 'expo-screen-orientation';

import { useTheme } from '../../theme';

export type VideoPlayerProps = {
  url: string;
  onProgress?: (seconds: number) => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
};

export function VideoPlayer({ url, onProgress, onEnd, onError }: VideoPlayerProps) {
  const { colors } = useTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lastProgressAt = useRef<number>(0);

  const source: VideoSource = useMemo(() => ({ uri: url }), [url]);
  const player = useVideoPlayer(source, (p) => {
    p.timeUpdateEventInterval = 1;
    p.keepScreenOnWhilePlaying = true;
  });

  useEffect(() => {
    const subStatus = player.addListener('statusChange', (payload) => {
      if (payload.error) {
        onError?.(payload.error.message ?? 'Video playback error');
      }
    });
    const subPlaying = player.addListener('playingChange', (payload) => {
      setIsPlaying(payload.isPlaying);
    });
    const subTime = player.addListener('timeUpdate', (payload) => {
      if (!onProgress) return;
      const now = Date.now();
      // prevent calling too often when native emits bursts
      if (now - lastProgressAt.current < 900) return;
      lastProgressAt.current = now;
      onProgress(payload.currentTime);
    });
    const subEnd = player.addListener('playToEnd', () => {
      onEnd?.();
    });

    return () => {
      subStatus.remove();
      subPlaying.remove();
      subTime.remove();
      subEnd.remove();
    };
  }, [onEnd, onError, onProgress, player]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <VideoView
        player={player}
        style={styles.video}
        allowsFullscreen
        allowsPictureInPicture
        nativeControls={false}
        contentFit="contain"
      />
      <Pressable
        onPress={() => {
          if (player.playing) player.pause();
          else player.play();
        }}
        style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.25)' }]}
      >
        <View style={{ alignItems: 'center', gap: 10 }}>
          <View style={[styles.playButton, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>
              {isPlaying ? 'PAUSE' : 'PLAY'}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              const next = !isFullscreen;
              setIsFullscreen(next);
              InteractionManager.runAfterInteractions(() => {
                if (next) {
                  void ScreenOrientation.lockAsync(
                    ScreenOrientation.OrientationLock.LANDSCAPE,
                  ).catch(() => {});
                } else {
                  void ScreenOrientation.unlockAsync().catch(() => {});
                }
              });
            }}
            style={[styles.fullscreenButton, { backgroundColor: 'rgba(0,0,0,0.55)' }]}
          >
            <Text style={{ color: '#fff', fontWeight: '800' }}>
              {isFullscreen ? 'EXIT FULLSCREEN' : 'FULLSCREEN'}
            </Text>
          </Pressable>
        </View>
      </Pressable>
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
  video: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  fullscreenButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
});

