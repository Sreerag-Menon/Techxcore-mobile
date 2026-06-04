/** Dev-only helpers to trace AsyncStorage key/value issues (e.g. HTML used as key). */

export const STORAGE_DEBUG_TAG = '[StorageDebug]';

export function keyLooksLikeHtmlBody(key: string): boolean {
  const trimmed = key.trim();
  return trimmed.startsWith('<') || /<\/?[a-z][\s\S]*>/i.test(trimmed.slice(0, 200));
}

export function summarizeStorageKey(key: string): {
  length: number;
  preview: string;
  looksLikeHtml: boolean;
} {
  return {
    length: key.length,
    preview: key.length > 80 ? `${key.slice(0, 40)}…${key.slice(-20)}` : key,
    looksLikeHtml: keyLooksLikeHtmlBody(key),
  };
}

export function captureStorageCallerStack(): string | undefined {
  const stack = new Error().stack;
  if (!stack) return undefined;
  return stack
    .split('\n')
    .slice(2, 8)
    .map((line) => line.trim())
    .join('\n');
}

export function logStorageEvent(
  operation: 'getItem' | 'setItem' | 'removeItem' | 'keyRejected' | 'valueSkipped',
  details: Record<string, unknown>,
): void {
  if (!__DEV__) return;
  console.warn(STORAGE_DEBUG_TAG, operation, details);
}
