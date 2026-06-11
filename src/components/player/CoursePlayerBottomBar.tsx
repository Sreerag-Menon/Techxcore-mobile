import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LiquidGlassView } from '../ui/LiquidGlassView';
import { useTheme } from '../../theme';
import { spacing } from '../../theme/spacing';
import { fontSize, lineHeight } from '../../theme/typography';

export type CoursePlayerBottomBarProps = {
  activeIndex: number;
  totalModules: number;
  completedModules: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onOpenContents: () => void;
  onOpenStudyBuddy: () => void;
  onOpenRate?: () => void;
  onOpenCertificate?: () => void;
  showRate?: boolean;
  showCertificate?: boolean;
};

export function CoursePlayerBottomBar({
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onOpenContents,
  onOpenStudyBuddy,
  onOpenRate,
  onOpenCertificate,
  showRate = false,
  showCertificate = false,
}: CoursePlayerBottomBarProps) {
  const { colors, fontFamily } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <LiquidGlassView
      variant="sheet"
      borderRadius={0}
      style={[
        styles.glassShell,
        { paddingBottom: Math.max(insets.bottom, spacing.md) },
      ]}
    >
      <View style={styles.row}>
        <Pressable
          onPress={onPrev}
          disabled={!hasPrev}
          accessibilityRole="button"
          accessibilityLabel="Previous module"
          style={[
            styles.navPill,
            styles.navPillGhost,
            {
              borderColor: colors.border,
              opacity: hasPrev ? 1 : 0.35,
            },
          ]}
        >
          <Ionicons name="chevron-back" size={16} color={colors.text} />
          <Text
            style={[
              styles.navPillText,
              { color: colors.text, fontFamily: fontFamily.medium },
            ]}
          >
            Prev
          </Text>
        </Pressable>

        <View style={styles.centerActions}>
          <Pressable
            onPress={onOpenContents}
            accessibilityRole="button"
            accessibilityLabel="Open course contents"
            style={styles.iconAction}
            hitSlop={6}
          >
            <Ionicons name="list" size={22} color={colors.primary} />
          </Pressable>

          <Pressable
            onPress={onOpenStudyBuddy}
            accessibilityRole="button"
            accessibilityLabel="Open study buddy"
            style={styles.iconAction}
            hitSlop={6}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.primary} />
          </Pressable>

          {showCertificate && onOpenCertificate ? (
            <Pressable
              onPress={onOpenCertificate}
              accessibilityRole="button"
              accessibilityLabel="View certificate"
              style={styles.iconAction}
              hitSlop={6}
            >
              <Ionicons name="ribbon-outline" size={22} color={colors.success} />
            </Pressable>
          ) : null}

          {showRate && onOpenRate ? (
            <Pressable
              onPress={onOpenRate}
              accessibilityRole="button"
              accessibilityLabel="Rate course"
              style={styles.iconAction}
              hitSlop={6}
            >
              <Ionicons name="star-outline" size={22} color={colors.warning} />
            </Pressable>
          ) : null}
        </View>

        <Pressable
          onPress={onNext}
          disabled={!hasNext}
          accessibilityRole="button"
          accessibilityLabel="Next module"
          style={[
            styles.navPill,
            {
              backgroundColor: hasNext ? colors.primary : colors.border,
              opacity: hasNext ? 1 : 0.45,
            },
          ]}
        >
          <Text
            style={[
              styles.navPillText,
              {
                color: hasNext ? colors.onPrimary : colors.textSecondary,
                fontFamily: fontFamily.bold,
              },
            ]}
          >
            Next
          </Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={hasNext ? colors.onPrimary : colors.textSecondary}
          />
        </Pressable>
      </View>
    </LiquidGlassView>
  );
}

const styles = StyleSheet.create({
  glassShell: {
    flex: undefined,
    height: 'auto',
    width: '100%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  navPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    minWidth: 76,
    justifyContent: 'center',
  },
  navPillGhost: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  navPillText: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
  },
  centerActions: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  iconAction: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
