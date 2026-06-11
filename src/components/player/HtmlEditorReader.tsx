import { useEffect, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import RenderHTML, { type MixedStyleRecord } from 'react-native-render-html';

import type { CourseHtmlEditorModule } from '../../types/course.types';
import { useResponsive } from '../../hooks/useResponsive';
import { useTheme } from '../../theme';
import { spacing } from '../../theme/spacing';
import { fontSize, lineHeight } from '../../theme/typography';
import {
  isUnresolvedHtmlEditorBody,
  normalizeEditorHtml,
  resolvePlayableHtmlBody,
} from '../../utils/htmlContent';
import type { PlayerLayout } from './PlayerContainer';

const IGNORED_DOM_TAGS = ['script', 'style', 'iframe'] as const;

export type HtmlEditorReaderScrollMode = 'parent' | 'self';

export type HtmlEditorReaderProps = {
  module: CourseHtmlEditorModule;
  layout?: PlayerLayout;
  /** `parent` = course ScrollView owns scroll; `self` = internal ScrollView (fullscreen). */
  scrollMode?: HtmlEditorReaderScrollMode;
  onSectionReady?: () => void;
};

function buildTagsStyles(colors: ReturnType<typeof useTheme>['colors']): MixedStyleRecord {
  return {
    body: {
      color: colors.text,
      fontSize: fontSize.base,
      lineHeight: lineHeight.base,
    },
    p: {
      marginTop: 0,
      marginBottom: spacing.lg,
      color: colors.text,
    },
    h1: {
      fontSize: fontSize['2xl'],
      lineHeight: lineHeight['2xl'],
      marginBottom: spacing.md,
      color: colors.text,
    },
    h2: {
      fontSize: fontSize.xl,
      lineHeight: lineHeight.xl,
      marginBottom: spacing.md,
      color: colors.text,
    },
    h3: {
      fontSize: fontSize.lg,
      lineHeight: lineHeight.lg,
      marginBottom: spacing.sm,
      color: colors.text,
    },
    h4: {
      fontSize: fontSize.base,
      lineHeight: lineHeight.base,
      marginBottom: spacing.sm,
      color: colors.text,
    },
    ul: {
      marginBottom: spacing.lg,
      paddingLeft: spacing.xl,
    },
    ol: {
      marginBottom: spacing.lg,
      paddingLeft: spacing.xl,
    },
    li: {
      marginBottom: spacing.xs,
      color: colors.text,
    },
    a: {
      color: colors.primary,
      textDecorationLine: 'underline',
    },
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: colors.border,
      paddingLeft: spacing.md,
      marginBottom: spacing.lg,
      color: colors.textSecondary,
    },
    table: {
      marginBottom: spacing.lg,
    },
    strong: {
      fontWeight: '700',
      color: colors.text,
    },
    em: {
      fontStyle: 'italic',
      color: colors.text,
    },
  };
}

export function HtmlEditorReader({
  module,
  layout = 'inline',
  scrollMode = layout === 'fullscreen' ? 'self' : 'parent',
  onSectionReady,
}: HtmlEditorReaderProps) {
  const { colors, fontFamily } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const { horizontalPadding } = useResponsive();
  const sectionReadyFiredRef = useRef(false);

  const rawBody = useMemo(
    () => resolvePlayableHtmlBody(module.url ?? '', module.browseUrl ?? '') ?? '',
    [module.browseUrl, module.url],
  );

  const html = useMemo(() => normalizeEditorHtml(rawBody), [rawBody]);
  const unresolved = isUnresolvedHtmlEditorBody(module.url ?? '');

  const articleHorizontalPadding = spacing.lg * 2;
  const contentWidth = Math.max(
    200,
    windowWidth - horizontalPadding * 2 - articleHorizontalPadding,
  );

  const tagsStyles = useMemo(() => buildTagsStyles(colors), [colors]);

  const baseStyle = useMemo(
    () => ({
      color: colors.text,
      fontSize: fontSize.base,
      lineHeight: lineHeight.base,
      fontFamily: fontFamily.regular,
    }),
    [colors.text, fontFamily.regular],
  );

  useEffect(() => {
    sectionReadyFiredRef.current = false;
  }, [module.contentId]);

  useEffect(() => {
    if (unresolved || !html.trim()) return;
    if (sectionReadyFiredRef.current) return;
    sectionReadyFiredRef.current = true;
    onSectionReady?.();
  }, [html, module.contentId, onSectionReady, unresolved]);

  if (unresolved || !html.trim()) {
    return (
      <View style={styles.messagePad}>
        <Text
          style={[
            styles.errorText,
            { color: colors.textSecondary, fontFamily: fontFamily.medium },
          ]}
        >
          Content could not be loaded
        </Text>
      </View>
    );
  }

  const reader = (
    <RenderHTML
      contentWidth={contentWidth}
      source={{ html }}
      baseStyle={baseStyle}
      tagsStyles={tagsStyles}
      ignoredDomTags={[...IGNORED_DOM_TAGS]}
      enableExperimentalMarginCollapsing
      defaultTextProps={{ selectable: true }}
      renderersProps={{
        img: {
          enableExperimentalPercentWidth: true,
        },
      }}
    />
  );

  if (scrollMode === 'self') {
    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
      >
        {reader}
      </ScrollView>
    );
  }

  return <View style={styles.flow}>{reader}</View>;
}

const styles = StyleSheet.create({
  flow: {
    width: '100%',
  },
  scroll: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    paddingBottom: spacing['2xl'],
  },
  messagePad: {
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    textAlign: 'center',
  },
});
