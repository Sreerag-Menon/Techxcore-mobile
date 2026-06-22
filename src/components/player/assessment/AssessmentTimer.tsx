import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../../../theme';
import { formatSeconds } from '../../../utils';

export type AssessmentTimerProps = {
  durationMs: number;
  onCheckpoint: () => void;
  onExpired: () => void;
  variant?: 'default' | 'pill';
};

export function AssessmentTimer({
  durationMs,
  onCheckpoint,
  onExpired,
  variant = 'default',
}: AssessmentTimerProps) {
  const { colors } = useTheme();
  const [remainingSec, setRemainingSec] = useState(Math.max(0, Math.floor(durationMs / 1000)));
  const expiredRef = useRef(false);
  const checkpointRef = useRef(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    setRemainingSec(Math.max(0, Math.floor(durationMs / 1000)));
    expiredRef.current = false;
    checkpointRef.current = 0;
  }, [durationMs]);

  useEffect(() => {
    if (durationMs <= 0) return;

    const tick = setInterval(() => {
      setRemainingSec((prev) => {
        const next = Math.max(0, prev - 1);
        if (next > 0 && next % 30 === 0 && checkpointRef.current !== next) {
          checkpointRef.current = next;
          onCheckpoint();
        }
        if (next === 0 && !expiredRef.current) {
          expiredRef.current = true;
          onExpired();
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(tick);
  }, [durationMs, onCheckpoint, onExpired]);

  const urgency =
    remainingSec <= 30
      ? 'critical'
      : remainingSec <= 60
        ? 'danger'
        : remainingSec <= 120
          ? 'warning'
          : 'normal';

  useEffect(() => {
    if (urgency === 'critical') {
      pulse.value = withRepeat(
        withSequence(withTiming(0.6, { duration: 500 }), withTiming(1, { duration: 500 })),
        -1,
        true,
      );
    } else {
      pulse.value = withTiming(1, { duration: 200 });
    }
  }, [pulse, urgency]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  const accentColor =
    urgency === 'critical' || urgency === 'danger'
      ? colors.error
      : urgency === 'warning'
        ? colors.warning
        : colors.primary;

  const content = (
    <Animated.View style={pulseStyle}>
      {variant === 'pill' ? (
        <Text style={[styles.pillTime, { color: accentColor }]}>{formatSeconds(remainingSec)}</Text>
      ) : (
        <>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Time left</Text>
          <Text style={[styles.time, { color: accentColor }]}>{formatSeconds(remainingSec)}</Text>
        </>
      )}
    </Animated.View>
  );

  if (variant === 'pill') {
    return (
      <View style={[styles.pill, { borderColor: accentColor, backgroundColor: `${accentColor}14` }]}>
        {content}
      </View>
    );
  }

  return <View style={[styles.wrap, { borderColor: accentColor }]}>{content}</View>;
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 72,
    alignItems: 'center',
  },
  label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  time: { fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  pillTime: { fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
