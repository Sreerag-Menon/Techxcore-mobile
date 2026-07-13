import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  FadeInLeft,
  FadeOutRight,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LiquidGlassView } from '../ui/LiquidGlassView';
import type { ModuleLockReason } from '../../utils/moduleAccess';
import { useTheme } from '../../theme';
import { spacing } from '../../theme/spacing';
import { fontSize, lineHeight } from '../../theme/typography';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Horizontal margin mirroring FloatingTabBar (24px each side). */
const BAR_MARGIN_H = 20;
/** Distance from safe-area bottom edge. */
const BAR_BOTTOM_GAP = 12;
/** Fixed height of the action row. */
const BAR_HEIGHT = 64;
/** Uniform size for every icon slot (icon + label container). */
const SLOT_SIZE = 52;

// ─── Types ────────────────────────────────────────────────────────────────────

export type CoursePlayerBottomBarProps = {
  activeIndex: number;
  totalModules: number;
  completedModules: number;
  hasPrev: boolean;
  hasNext: boolean;
  nextLockedReason?: ModuleLockReason;
  onPrev: () => void;
  onNext: () => void;
  onOpenContents: () => void;
  onOpenStudyBuddy: () => void;
  onOpenRate?: () => void;
  onOpenCertificate?: () => void;
  showRate?: boolean;
  showCertificate?: boolean;
  /** When true the Next pill transforms into a "Mark as complete" CTA. */
  showMarkComplete?: boolean;
  onMarkComplete?: () => void;
};

type IconName = keyof typeof Ionicons.glyphMap;

// ─── Spring preset ────────────────────────────────────────────────────────────

const SPRING = { damping: 20, stiffness: 300, mass: 1 } as const;

// ─── Icon slot (uniform size, label below) ────────────────────────────────────

function IconSlot({
  icon,
  label,
  color,
  onPress,
  isFAB = false,
}: {
  icon: IconName;
  label: string;
  color: string;
  onPress: () => void;
  /** Study Buddy gets a filled circle background. */
  isFAB?: boolean;
}) {
  const { colors, fontFamily, isDark } = useTheme();
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(isFAB ? 0.88 : 0.90, SPRING);
  }, [scale, isFAB]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1.0, SPRING);
    if (isFAB) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      void Haptics.selectionAsync();
    }
  }, [scale, isFAB]);

  const glowColor = isDark ? 'rgba(45,212,191,0.28)' : 'rgba(13,148,136,0.30)';

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
    >
      <Animated.View
        style={[styles.slot, reducedMotion ? undefined : animStyle]}
      >
        {isFAB ? (
          <View
            style={[
              styles.fabCircle,
              { backgroundColor: colors.primary },
              { boxShadow: `0 0 12px ${glowColor}` } as object,
            ]}
          >
            <Ionicons name={icon} size={20} color={colors.onPrimary} />
          </View>
        ) : (
          <View style={styles.iconWell}>
            <Ionicons name={icon} size={22} color={color} />
          </View>
        )}
        <Text
          style={[
            styles.slotLabel,
            {
              color: isFAB ? colors.primary : color,
              fontFamily: fontFamily.medium,
            },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// ─── Nav pill (Prev / Next / Mark done / Locked) ──────────────────────────────

function NavPill({
  label,
  icon,
  iconSide = 'right',
  disabled,
  filled,
  tint,
  textColor,
  borderColor,
  onPress,
  accessibilityLabel: a11y,
}: {
  label: string;
  icon: IconName;
  iconSide?: 'left' | 'right';
  disabled?: boolean;
  /** True = solid background, false = ghost border */
  filled?: boolean;
  tint: string;
  textColor: string;
  borderColor?: string;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const { fontFamily } = useTheme();
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (disabled) return;
    scale.value = withSpring(0.94, SPRING);
  }, [scale, disabled]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1.0, SPRING);
    if (!disabled) void Haptics.selectionAsync();
  }, [scale, disabled]);

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled: !!disabled }}
    >
      <Animated.View
        style={[
          styles.pill,
          filled
            ? { backgroundColor: tint }
            : {
                backgroundColor: 'transparent',
                borderWidth: 1,
                borderColor: borderColor ?? tint,
              },
          { opacity: disabled && !borderColor ? 0.38 : 1 },
          reducedMotion ? undefined : animStyle,
        ]}
      >
        {iconSide === 'left' && (
          <Ionicons name={icon} size={14} color={textColor} />
        )}
        <Text
          style={[
            styles.pillText,
            { color: textColor, fontFamily: fontFamily.bold },
          ]}
        >
          {label}
        </Text>
        {iconSide === 'right' && (
          <Ionicons name={icon} size={14} color={textColor} />
        )}
      </Animated.View>
    </Pressable>
  );
}


// ─── Next pill config ─────────────────────────────────────────────────────────

function resolveNextConfig(
  hasNext: boolean,
  reason: ModuleLockReason | undefined,
  colors: ReturnType<typeof useTheme>['colors'],
) {
  if (hasNext) {
    return {
      icon: 'chevron-forward' as IconName,
      filled: true,
      tint: colors.primary,
      textColor: colors.onPrimary,
      label: 'Next',
      disabled: false,
      a11y: 'Next lesson',
    };
  }
  if (reason === 'sequential') {
    return {
      icon: 'lock-closed' as IconName,
      filled: false,
      tint: 'transparent',
      textColor: colors.warning,
      borderColor: colors.warning,
      label: 'Locked',
      disabled: true,
      a11y: 'Next lesson locked: complete current lesson first',
    };
  }
  if (reason === 'drip') {
    return {
      icon: 'time-outline' as IconName,
      filled: false,
      tint: 'transparent',
      textColor: colors.textTertiary,
      borderColor: colors.border,
      label: 'Soon',
      disabled: true,
      a11y: 'Next lesson not yet available',
    };
  }
  return {
    icon: 'chevron-forward' as IconName,
    filled: false,
    tint: 'transparent',
    textColor: colors.textSecondary,
    borderColor: colors.border,
    label: 'Next',
    disabled: true,
    a11y: 'No next lesson',
  };
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CoursePlayerBottomBar({
  activeIndex,
  totalModules,
  hasPrev,
  hasNext,
  nextLockedReason,
  onPrev,
  onNext,
  onOpenContents,
  onOpenStudyBuddy,
  onOpenRate,
  onOpenCertificate,
  showRate = false,
  showCertificate = false,
  showMarkComplete = false,
  onMarkComplete,
}: CoursePlayerBottomBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const nextCfg = resolveNextConfig(hasNext, nextLockedReason, colors);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        { bottom: insets.bottom + BAR_BOTTOM_GAP },
      ]}
    >
      {/* Floating elevated bar */}
      <Animated.View
        entering={
          reducedMotion
            ? undefined
            : FadeInDown.springify().damping(22).stiffness(280)
        }
      >
        <LiquidGlassView
          borderRadius={28}
          intensity={70}
          tintColor={
            isDark ? 'rgba(22, 27, 34, 0.85)' : 'rgba(255, 255, 255, 0.85)'
          }
          style={[
            styles.bar,
            {
              borderCurve: 'continuous',
              boxShadow: isDark
                ? '0 4px 24px rgba(0, 0, 0, 0.45)'
                : `0 4px 24px rgba(13, 17, 23, 0.12)`,
            } as object,
          ]}
        >
          {/* Inner border layer matching FloatingTabBar */}
          <View
            style={[
              styles.barInner,
              {
                backgroundColor: isDark
                  ? 'rgba(22, 27, 34, 0.55)'
                  : 'rgba(255, 255, 255, 0.65)',
                borderColor: isDark
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(0, 0, 0, 0.05)',
              },
            ]}
          >
            {/* ── Prev ── */}
            <NavPill
              label="Prev"
              icon="chevron-back"
              iconSide="left"
              disabled={!hasPrev}
              filled={false}
              tint={colors.border}
              textColor={hasPrev ? colors.text : colors.textTertiary}
              borderColor={hasPrev ? colors.border : colors.divider}
              onPress={onPrev}
              accessibilityLabel="Previous lesson"
            />

            {/* ── Center icon cluster — horizontally scrollable ── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.centerScroll}
              contentContainerStyle={styles.centerCluster}
            >
              <IconSlot
                icon="list"
                label="Contents"
                color={colors.primary}
                onPress={onOpenContents}
              />

              {showCertificate && onOpenCertificate ? (
                <IconSlot
                  icon="ribbon-outline"
                  label="Certificate"
                  color={colors.success}
                  onPress={onOpenCertificate}
                />
              ) : null}

              {showRate && onOpenRate ? (
                <IconSlot
                  icon="star-outline"
                  label="Rate"
                  color={colors.warning}
                  onPress={onOpenRate}
                />
              ) : null}

              <IconSlot
                icon="sparkles"
                label="Study Buddy"
                color={colors.primary}
                onPress={onOpenStudyBuddy}
                isFAB
              />
            </ScrollView>

            {/* ── Next / Mark done ── */}
            {showMarkComplete && onMarkComplete ? (
              <Animated.View
                key="mark-complete"
                entering={
                  reducedMotion
                    ? undefined
                    : FadeInLeft.duration(220).springify().damping(20)
                }
                exiting={
                  reducedMotion ? undefined : FadeOutRight.duration(180)
                }
              >
                <NavPill
                  label="Mark done"
                  icon="checkmark"
                  iconSide="left"
                  filled
                  tint={colors.primary}
                  textColor={colors.onPrimary}
                  onPress={onMarkComplete}
                  accessibilityLabel="Mark lesson as complete"
                />
              </Animated.View>
            ) : (
              <Animated.View
                key="next"
                entering={
                  reducedMotion
                    ? undefined
                    : FadeInLeft.duration(220).springify().damping(20)
                }
                exiting={
                  reducedMotion ? undefined : FadeOutRight.duration(180)
                }
              >
                <NavPill
                  label={nextCfg.label}
                  icon={nextCfg.icon}
                  iconSide="right"
                  filled={nextCfg.filled}
                  disabled={nextCfg.disabled}
                  tint={nextCfg.tint}
                  textColor={nextCfg.textColor}
                  borderColor={'borderColor' in nextCfg ? nextCfg.borderColor : undefined}
                  onPress={onNext}
                  accessibilityLabel={nextCfg.a11y}
                />
              </Animated.View>
            )}
          </View>
        </LiquidGlassView>
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Wrapper sits outside normal flow, anchored to bottom
  wrapper: {
    position: 'absolute',
    left: BAR_MARGIN_H,
    right: BAR_MARGIN_H,
    gap: 8,
  },

  // Floating bar shell
  bar: {
    height: BAR_HEIGHT,
    overflow: 'hidden',
    borderRadius: 28,
  },
  barInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderRadius: 28,
    gap: spacing.xs,
  },

  // Center cluster — scrollable strip
  centerScroll: {
    flexShrink: 1,
    flexGrow: 1,
  },
  centerCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
  },

  // Icon slot — uniform SLOT_SIZE container
  slot: {
    width: SLOT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minHeight: 44,
  },
  iconWell: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotLabel: {
    fontSize: 9,
    lineHeight: 12,
    textAlign: 'center',
  },

  // Study Buddy FAB circle
  fabCircle: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Nav pills
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: 999,
    minWidth: 72,
    justifyContent: 'center',
    borderCurve: 'continuous',
  },
  pillText: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
  },
});
