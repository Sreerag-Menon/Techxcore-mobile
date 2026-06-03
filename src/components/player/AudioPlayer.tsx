import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

import { useTheme } from '../../theme';

export type AudioPlayerProps = {
  url: string;
  initialSeekSeconds?: number;
  onProgress?: (seconds: number) => void;
  onComplete?: () => void;
};

export function AudioPlayer({
  url,
  initialSeekSeconds = 0,
  onProgress,
  onComplete,
}: AudioPlayerProps) {
  const { colors } = useTheme();
  const player = useAudioPlayer(url, { updateInterval: 500, downloadFirst: true });
  const status = useAudioPlayerStatus(player);
  const lastReportedSecondsRef = useRef<number>(-1);

  useEffect(() => {
    if (initialSeekSeconds <= 0) return;
    player.seekTo(initialSeekSeconds);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seek once per module
  }, [url, initialSeekSeconds]);

  useEffect(() => {
    if (!onProgress) return;
    if (!Number.isFinite(status.currentTime)) return;

    const rounded = Math.floor(status.currentTime);
    if (rounded === lastReportedSecondsRef.current) return;
    lastReportedSecondsRef.current = rounded;
    onProgress(status.currentTime);
  }, [onProgress, status.currentTime]);

  useEffect(() => {
    if (!status.didJustFinish) return;
    // expo-audio does not reset position automatically when finished.
    player.seekTo(0);
    onComplete?.();
  }, [onComplete, player, status.didJustFinish]);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={{ flex: 1, gap: 8 }}>
        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>
          Audio
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
          {Math.floor(status.currentTime)}s / {Math.floor(status.duration)}s
        </Text>
      </View>

      <Pressable
        onPress={() => {
          if (status.playing) player.pause();
          else player.play();
        }}
        style={[styles.button, { backgroundColor: colors.primary }]}
      >
        <Text style={{ color: '#fff', fontWeight: '800' }}>
          {status.playing ? 'Pause' : 'Play'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 84,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
});

