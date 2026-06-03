/**
 * Glass backdrop + background for @gorhom/bottom-sheet modals.
 *
 * Backdrop blurs the screen behind the sheet (where BlurView can reach it).
 * Sheet background uses LiquidGlassView `sheet` variant for a visible frosted panel.
 */
import { BlurView } from 'expo-blur';
import {
  BottomSheetBackdrop,
  type BottomSheetBackgroundProps,
} from '@gorhom/bottom-sheet';
import type { ComponentProps } from 'react';
import { Platform, StyleSheet } from 'react-native';

import { LiquidGlassView } from './LiquidGlassView';
import { useTheme } from '@/theme';

export type BottomSheetGlassBackdropProps = ComponentProps<
  typeof BottomSheetBackdrop
> & {
  /** Backdrop blur intensity. Default 50 */
  blurIntensity?: number;
  /** Dim overlay on top of blur. Default 0.28 */
  dimOpacity?: number;
};

/** Blurred dimmed backdrop — use as `backdropComponent` on BottomSheetModal */
export function BottomSheetGlassBackdrop({
  blurIntensity = 50,
  dimOpacity = 0.28,
  opacity = dimOpacity,
  appearsOnIndex = 0,
  disappearsOnIndex = -1,
  ...props
}: BottomSheetGlassBackdropProps) {
  const { isDark } = useTheme();
  const blurTint = isDark ? 'dark' : 'light';

  return (
    <BottomSheetBackdrop
      {...props}
      opacity={opacity}
      appearsOnIndex={appearsOnIndex}
      disappearsOnIndex={disappearsOnIndex}
      pressBehavior="close"
    >
      <BlurView
        intensity={blurIntensity}
        tint={blurTint}
        experimentalBlurMethod={
          Platform.OS === 'android' ? 'dimezisBlurView' : undefined
        }
        style={StyleSheet.absoluteFill}
      />
    </BottomSheetBackdrop>
  );
}

/** Frosted sheet panel — use as `backgroundComponent` on BottomSheetModal */
export function BottomSheetGlassBackground({
  style,
}: BottomSheetBackgroundProps) {
  return (
    <LiquidGlassView style={style} borderRadius={24} variant="sheet" />
  );
}
