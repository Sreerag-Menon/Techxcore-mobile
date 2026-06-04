import { Platform } from 'react-native';

import { WEBVIEW_EMBED_BASE_URL } from './embedVideoProgress';
import { writeTextToCache } from './expoFileCache';
import { wrapInlineHtmlContent } from './htmlContent';

/** iOS: prefer file URI when body exceeds this (0 = always try file). */
export const INLINE_HTML_FILE_THRESHOLD_BYTES = 0;

/** Android: use source.html below this size; file cache + contentUri at or above. */
export const ANDROID_INLINE_HTML_FILE_THRESHOLD_BYTES = 256 * 1024;

export type InlineHtmlWebViewSource = {
  html?: string;
  uri?: string;
  baseUrl?: string;
};

function inlineHtmlCacheFileName(contentId: number): string {
  return `html_${contentId}.html`;
}

function shouldUseFileCache(wrappedByteLength: number): boolean {
  if (Platform.OS === 'android') {
    return wrappedByteLength >= ANDROID_INLINE_HTML_FILE_THRESHOLD_BYTES;
  }
  return wrappedByteLength > INLINE_HTML_FILE_THRESHOLD_BYTES;
}

export async function resolveInlineHtmlWebViewSource(
  contentId: number,
  body: string,
): Promise<InlineHtmlWebViewSource> {
  const wrapped = wrapInlineHtmlContent(body);
  const htmlSource: InlineHtmlWebViewSource = {
    html: wrapped,
    baseUrl: WEBVIEW_EMBED_BASE_URL,
  };

  if (!shouldUseFileCache(wrapped.length)) {
    return htmlSource;
  }

  const fileUri = writeTextToCache(inlineHtmlCacheFileName(contentId), wrapped);
  if (fileUri) {
    return { uri: fileUri, ...htmlSource };
  }

  return htmlSource;
}
