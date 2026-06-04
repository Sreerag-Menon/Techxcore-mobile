import type { HtmlContentRenderMode } from '../types/course.types';
import { HTML_EDITOR_FORMAT } from '../types/course.types';

export type HtmlContentFormatFlags = {
  format: string;
  isHtmlOnly?: boolean;
  isUrlOnly?: boolean;
  isEmbedOnly?: boolean;
};

/** True when value is suitable for WebView `source.uri` (external page). */
export function isNavigableWebUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('<')) return false;
  return /^https?:\/\//i.test(trimmed);
}

/** True when API sent an HTML fragment/blob rather than a remote page URL. */
export function isInlineHtmlBody(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('<')) return true;
  return !isNavigableWebUrl(trimmed);
}

export function resolveHtmlContentRenderMode(
  flags: HtmlContentFormatFlags,
  url: string,
): HtmlContentRenderMode {
  const format = flags.format.trim().toLowerCase();

  if (format === HTML_EDITOR_FORMAT || flags.isHtmlOnly) return 'inline';
  if (format === 'embedded' || (flags.isUrlOnly && flags.isEmbedOnly)) return 'inline';

  if (!isNavigableWebUrl(url) || isInlineHtmlBody(url)) return 'inline';

  if (format === 'html' || (flags.isUrlOnly && !flags.isEmbedOnly)) return 'uri';
  if (format === 'ppt' || format === 'ppteditor') return 'uri';

  return 'uri';
}

/** Stable dependency key for large inline HTML without storing the full body in React deps. */
export function inlineHtmlContentFingerprint(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return '0';
  const tail = trimmed.length > 64 ? trimmed.slice(-64) : trimmed;
  return `${trimmed.length}:${tail}`;
}

const INLINE_HTML_SHELL_PREFIX = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="referrer" content="strict-origin-when-cross-origin" />
  <style>body{margin:0;padding:16px;font-family:system-ui,-apple-system,sans-serif;line-height:1.5;}</style>
</head>
<body>`;

const INLINE_HTML_SHELL_SUFFIX = `</body>
</html>`;

/** Wrap HTML fragment for WebView inline display (matches web dangerouslySetInnerHTML). */
export function wrapInlineHtmlContent(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) {
    return `${INLINE_HTML_SHELL_PREFIX}<p></p>${INLINE_HTML_SHELL_SUFFIX}`;
  }
  if (/<html[\s>]/i.test(trimmed)) {
    return trimmed;
  }
  return `${INLINE_HTML_SHELL_PREFIX}${trimmed}${INLINE_HTML_SHELL_SUFFIX}`;
}
