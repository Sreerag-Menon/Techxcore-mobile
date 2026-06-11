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

/**
 * Resolve HTMLEditor / inline HTML playable body from API fields.
 * Web uses `content_url` (HTML body); `browse_url` is the S3 key fallback.
 */
export function resolvePlayableHtmlBody(contentUrl: string, browseUrl: string): string | null {
  const content = contentUrl.trim();
  const browse = browseUrl.trim();

  if (content && (content.startsWith('<') || !isNavigableWebUrl(content))) {
    return content;
  }
  if (content) return content;
  if (browse && browse.startsWith('<')) return browse;

  return browse || null;
}

/** True when value is an S3 key/path, not inlined HTML or a navigable page URL. */
export function isUnresolvedHtmlEditorBody(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith('<')) return false;
  if (isNavigableWebUrl(trimmed)) return false;
  return true;
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

const INLINE_HTML_RESPONSIVE_STYLES = `
  html, body {
    width: 100% !important;
    max-width: 100% !important;
    overflow-x: auto !important;
  }
  body {
    margin: 0;
    padding: 16px;
    font-family: system-ui, -apple-system, sans-serif;
    line-height: 1.5;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  p, h1, h2, h3, h4, h5, h6, li, div {
    max-width: 100% !important;
    margin-left: 0 !important;
    padding-left: 0 !important;
    text-indent: 0 !important;
    float: none !important;
  }
  p {
    margin: 0 0 1em 0;
  }
  p:last-child {
    margin-bottom: 0;
  }
  img, video, iframe, table {
    max-width: 100% !important;
    height: auto;
  }
  table {
    display: block;
    overflow-x: auto;
  }
  * {
    box-sizing: border-box;
  }
  pre, code {
    white-space: pre-wrap;
    word-break: break-word;
  }
`;

const BLOCK_INLINE_STYLE_PROPS =
  /\b(?:width|max-width|min-width|margin-left|padding-left|text-indent|float)\s*:\s*[^;]+;?/gi;

/** Strip Jodit artifacts and normalize block layout for mobile readers. */
export function normalizeEditorHtml(body: string): string {
  let html = body.trim();
  if (!html) return html;

  html = html.replace(/<div[^>]*class="[^"]*jodit[^"]*"[^>]*>([\s\S]*)<\/div>/gi, '$1');

  const blockTags = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'span'];
  for (const tag of blockTags) {
    const re = new RegExp(`<${tag}([^>]*?)style="([^"]*)"([^>]*)>`, 'gi');
    html = html.replace(re, (_match, before: string, style: string, after: string) => {
      const cleaned = style.replace(BLOCK_INLINE_STYLE_PROPS, '').trim();
      if (!cleaned) return `<${tag}${before}${after}>`;
      return `<${tag}${before}style="${cleaned}"${after}>`;
    });
  }

  if (!/<[a-z][\s>]/i.test(html)) {
    html = html
      .split(/\n\s*\n/)
      .filter((part) => part.trim().length > 0)
      .map((part) => `<p>${part.trim()}</p>`)
      .join('');
  }

  return html;
}

const INLINE_HTML_SHELL_PREFIX = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <meta name="referrer" content="strict-origin-when-cross-origin" />
  <style>${INLINE_HTML_RESPONSIVE_STYLES}</style>
</head>
<body>`;

const INLINE_HTML_SHELL_SUFFIX = `</body>
</html>`;

function injectResponsiveStylesIntoHtmlDocument(html: string): string {
  const styleTag = `<style id="aai-mobile-inline">${INLINE_HTML_RESPONSIVE_STYLES}</style>`;
  if (/<head[\s>]/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${styleTag}`);
  }
  return html.replace(/<html([^>]*)>/i, `<html$1><head>${styleTag}</head>`);
}

/** Wrap HTML fragment for WebView inline display (matches web dangerouslySetInnerHTML). */
export function wrapInlineHtmlContent(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) {
    return `${INLINE_HTML_SHELL_PREFIX}<p></p>${INLINE_HTML_SHELL_SUFFIX}`;
  }
  if (/<html[\s>]/i.test(trimmed)) {
    return injectResponsiveStylesIntoHtmlDocument(trimmed);
  }
  return `${INLINE_HTML_SHELL_PREFIX}${trimmed}${INLINE_HTML_SHELL_SUFFIX}`;
}
