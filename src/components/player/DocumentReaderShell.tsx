import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HTML_EDITOR_MODULE_TYPE, type CourseModule } from '../../types/course.types';
import { useTheme } from '../../theme';
import { spacing } from '../../theme/spacing';
import { fontSize, lineHeight } from '../../theme/typography';

export type DocumentReaderMode = 'inline' | 'fullscreen';

export type DocumentReaderShellProps = {
  module: CourseModule;
  children: ReactNode;
  readerMode?: DocumentReaderMode;
  /** When true the reader fills its parent (fullscreen modal). */
  fillParent?: boolean;
  onFullscreen?: () => void;
  showFullscreenButton?: boolean;
};

function moduleTypeLabel(type: CourseModule['type']): string {
  if (type === HTML_EDITOR_MODULE_TYPE) return 'HTML';
  return type.toUpperCase();
}

function statusLabel(status?: CourseModule['status']): string {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'in_progress':
      return 'In progress';
    default:
      return 'Not started';
  }
}

function statusColor(
  status: CourseModule['status'] | undefined,
  colors: ReturnType<typeof useTheme>['colors'],
): string {
  switch (status) {
    case 'completed':
      return colors.success;
    case 'in_progress':
      return colors.primary;
    default:
      return colors.textSecondary;
  }
}

export function DocumentReaderShell({
  module,
  children,
  readerMode = 'inline',
  fillParent = false,
  onFullscreen,
  showFullscreenButton = false,
}: DocumentReaderShellProps) {
  const { colors, fontFamily } = useTheme();
  const insets = useSafeAreaInsets();
  const statusTint = statusColor(module.status, colors);
  const isFullscreen = readerMode === 'fullscreen' || fillParent;
  const contentTopInset = isFullscreen ? insets.top + 48 : 0;

  return (
    <View style={[styles.wrapper, fillParent && styles.wrapperFill]}>
      {!isFullscreen ? (
        <Animated.View
          key={module.contentId}
          entering={FadeInDown.springify().damping(20).stiffness(300)}
          style={styles.metaBlock}
        >
          <Text
            style={[
              styles.moduleTitle,
              {
                color: colors.text,
                fontFamily: fontFamily.bold,
              },
            ]}
            numberOfLines={2}
          >
            {module.title}
          </Text>

          <View style={styles.metaRow}>
            <View
              style={[
                styles.typeBadge,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Ionicons name="document-text" size={14} color={colors.primary} />
              <Text
                style={[
                  styles.typeBadgeText,
                  { color: colors.textSecondary, fontFamily: fontFamily.medium },
                ]}
              >
                {moduleTypeLabel(module.type)}
              </Text>
            </View>

            <View style={styles.statusChip}>
              <View style={[styles.statusDot, { backgroundColor: statusTint }]} />
              <Text
                style={[
                  styles.statusChipText,
                  { color: statusTint, fontFamily: fontFamily.medium },
                ]}
              >
                {statusLabel(module.status)}
              </Text>
            </View>
          </View>
        </Animated.View>
      ) : null}

      <View
        style={[
          styles.article,
          fillParent && styles.articleFill,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            paddingTop: spacing.lg + contentTopInset,
          },
        ]}
      >
        <View style={[styles.contentSlot, fillParent && styles.contentSlotFill]}>{children}</View>

        {showFullscreenButton && onFullscreen && !isFullscreen ? (
          <Pressable
            onPress={onFullscreen}
            accessibilityRole="button"
            accessibilityLabel="Enter fullscreen"
            style={styles.fullscreenButton}
            hitSlop={8}
          >
            <Ionicons name="expand" size={18} color="#fff" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    gap: spacing.sm,
  },
  wrapperFill: {
    flex: 1,
    height: '100%',
    gap: 0,
  },
  metaBlock: {
    gap: spacing.sm,
  },
  moduleTitle: {
    fontSize: fontSize.xl,
    lineHeight: lineHeight.xl,
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: fontSize.xs,
    letterSpacing: 0.3,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusChipText: {
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
  },
  article: {
    width: '100%',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    position: 'relative',
    borderCurve: 'continuous',
  },
  articleFill: {
    flex: 1,
    borderRadius: 0,
    borderWidth: 0,
    minHeight: 0,
  },
  contentSlot: {
    width: '100%',
  },
  contentSlotFill: {
    flex: 1,
    minHeight: 0,
  },
  fullscreenButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
