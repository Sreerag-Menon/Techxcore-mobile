import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../theme';

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
  activeIndex,
  totalModules,
  completedModules,
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
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 10),
        },
      ]}
    >
      <View style={styles.navRow}>
        <Pressable
          onPress={onPrev}
          disabled={!hasPrev}
          accessibilityRole="button"
          accessibilityLabel="Previous module"
          style={[styles.navButton, { opacity: hasPrev ? 1 : 0.35 }]}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
          <Text style={[styles.navButtonText, { color: colors.text }]}>Prev</Text>
        </Pressable>

        <View style={[styles.counterPill, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.counterText, { color: colors.textSecondary }]}>
            {activeIndex >= 0 && totalModules > 0
              ? `${activeIndex + 1} of ${totalModules} · ${Math.round((completedModules / totalModules) * 100)}%`
              : '—'}
          </Text>
        </View>

        <Pressable
          onPress={onNext}
          disabled={!hasNext}
          accessibilityRole="button"
          accessibilityLabel="Next module"
          style={[styles.navButton, { opacity: hasNext ? 1 : 0.35 }]}
        >
          <Text style={[styles.navButtonText, { color: colors.text }]}>Next</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          onPress={onOpenContents}
          accessibilityRole="button"
          accessibilityLabel="Open course contents"
          style={[styles.actionButton, { backgroundColor: colors.background, borderColor: colors.border }]}
        >
          <Ionicons name="list" size={18} color={colors.primary} />
        </Pressable>

        <Pressable
          onPress={onOpenStudyBuddy}
          accessibilityRole="button"
          accessibilityLabel="Open study buddy"
          style={[styles.actionButton, { backgroundColor: colors.background, borderColor: colors.border }]}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
        </Pressable>

        {showCertificate && onOpenCertificate ? (
          <Pressable
            onPress={onOpenCertificate}
            accessibilityRole="button"
            accessibilityLabel="View certificate"
            style={[styles.actionButton, { backgroundColor: colors.background, borderColor: colors.border }]}
          >
            <Ionicons name="ribbon-outline" size={18} color={colors.success} />
          </Pressable>
        ) : null}

        {showRate && onOpenRate ? (
          <Pressable
            onPress={onOpenRate}
            accessibilityRole="button"
            accessibilityLabel="Rate course"
            style={[styles.actionButton, { backgroundColor: colors.background, borderColor: colors.border }]}
          >
            <Ionicons name="star-outline" size={18} color={colors.warning} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    paddingHorizontal: 16,
    gap: 10,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 72,
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  counterPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  counterText: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
