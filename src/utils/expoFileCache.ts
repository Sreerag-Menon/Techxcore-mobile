import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

/** URI safe for WebView on Android (content://) vs iOS (file://). */
export function webViewUriForCachedFile(file: File): string {
  if (Platform.OS === 'android') {
    const contentUri = file.contentUri?.trim();
    if (contentUri) return contentUri;
  }
  return file.uri;
}

/** Write UTF-8 text under Paths.cache; returns WebView-safe URI or null on failure. */
export function writeTextToCache(fileName: string, content: string): string | null {
  try {
    const file = new File(Paths.cache, fileName);
    if (!file.exists) {
      file.create();
    }
    file.write(content);
    return file.exists ? webViewUriForCachedFile(file) : null;
  } catch {
    return null;
  }
}

/** Download http(s) URL to a named cache file; returns URI or null. */
export async function downloadUrlToCache(
  fileName: string,
  url: string,
): Promise<string | null> {
  if (!url.startsWith('http')) return null;
  try {
    const file = new File(Paths.cache, fileName);
    const result = await File.downloadFileAsync(url, file, { idempotent: true });
    if (!result.exists) return null;
    const cached = cacheFile(fileName);
    return webViewUriForCachedFile(cached);
  } catch {
    return null;
  }
}

export function cacheFile(fileName: string): File {
  return new File(Paths.cache, fileName);
}

export function cacheFileExists(fileName: string): boolean {
  return new File(Paths.cache, fileName).exists;
}

export function getCacheFileUri(fileName: string): string | null {
  const file = cacheFile(fileName);
  return file.exists ? webViewUriForCachedFile(file) : null;
}
