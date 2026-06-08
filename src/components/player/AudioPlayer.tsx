import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../../theme';
import { formatMediaTime } from '../../utils/formatTime';

export type AudioPlayerLayout = 'inline' | 'fullscreen';

export type AudioPlayerProps = {
  url: string;
  initialSeekSeconds?: number;
  layout?: AudioPlayerLayout;
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
    player.seekTo(0);
    onComplete?.();
  }, [onComplete, player, status.didJustFinish]);

  const progressRatio =
    status.duration > 0 ? Math.min(1, status.currentTime / status.duration) : 0;

  return (
    <LinearGradient
      colors={[colors.primary, `${colors.primary}CC`, '#0a0a0a']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.artwork}>
        <Ionicons name="musical-notes" size={48} color="rgba(255,255,255,0.9)" />
      </View>

      <View style={styles.controls}>
        <Text style={styles.label}>Audio lesson</Text>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressRatio * 100}%` }]} />
        </View>

        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatMediaTime(status.currentTime)}</Text>
          <Text style={styles.timeText}>{formatMediaTime(status.duration)}</Text>
        </View>

        <Pressable
          onPress={() => {
            if (status.playing) player.pause();
            else player.play();
          }}
          style={styles.playButton}
          accessibilityRole="button"
          accessibilityLabel={status.playing ? 'Pause audio' : 'Play audio'}
        >
          <Ionicons name={status.playing ? 'pause' : 'play'} size={28} color={colors.primary} />
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  artwork: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: {
    width: '100%',
    maxWidth: 320,
    gap: 10,
    alignItems: 'center',
  },
  label: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  progressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 999,
    backgroundColor: '#fff',
  },
  timeRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
});
