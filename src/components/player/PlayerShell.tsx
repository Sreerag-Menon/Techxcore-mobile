import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { HTML_EDITOR_MODULE_TYPE, type CourseModule, type CourseModuleType } from '../../types/course.types';
import { useTheme } from '../../theme';

export const PLAYER_ASPECT_RATIO = 16 / 9;

type ModuleIconName = keyof typeof Ionicons.glyphMap;

function moduleTypeIcon(type: CourseModuleType): ModuleIconName {
  switch (type) {
    case 'video':
      return 'play-circle';
    case 'pdf':
      return 'document-text';
    case 'audio':
      return 'musical-notes';
    case 'html':
    case HTML_EDITOR_MODULE_TYPE:
    case 'embedded':
    case 'ppt':
      return 'globe';
    case 'scorm':
      return 'cube';
    case 'test':
    case 'survey':
      return 'clipboard';
    default:
      return 'layers';
  }
}

function moduleTypeLabel(type: CourseModuleType): string {
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

export type PlayerShellProps = {
  module: CourseModule;
  children: ReactNode;
  /** When true the frame fills its parent (fullscreen modal). */
  fillParent?: boolean;
  onFullscreen?: () => void;
  showFullscreenButton?: boolean;
};

export function PlayerShell({
  module,
  children,
  fillParent = false,
  onFullscreen,
  showFullscreenButton = false,
}: PlayerShellProps) {
  const { colors } = useTheme();
  const iconName = moduleTypeIcon(module.type);

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.frame,
          fillParent ? styles.frameFill : styles.frameAspect,
          { backgroundColor: '#0a0a0a' },
        ]}
      >
        {children}

        {showFullscreenButton && onFullscreen ? (
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

      {!fillParent ? (
        <View style={styles.metaRow}>
          <View style={[styles.typeBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name={iconName} size={14} color={colors.primary} />
            <Text style={[styles.typeBadgeText, { color: colors.textSecondary }]}>
              {moduleTypeLabel(module.type)}
            </Text>
          </View>

          <Text style={[styles.moduleTitle, { color: colors.text }]} numberOfLines={2}>
            {module.title}
          </Text>

          <View
            style={[
              styles.statusChip,
              {
                backgroundColor: `${statusColor(module.status, colors)}18`,
                borderColor: statusColor(module.status, colors),
              },
            ]}
          >
            <Text style={[styles.statusChipText, { color: statusColor(module.status, colors) }]}>
              {statusLabel(module.status)}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    gap: 10,
  },
  frame: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  frameAspect: {
    aspectRatio: PLAYER_ASPECT_RATIO,
  },
  frameFill: {
    flex: 1,
    borderRadius: 0,
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  moduleTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
