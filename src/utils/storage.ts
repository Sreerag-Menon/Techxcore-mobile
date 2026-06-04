/**

 * Storage utilities.

 *

 * secureStorage – wraps expo-secure-store for sensitive data (tokens, credentials).

 * asyncStorage  – wraps AsyncStorage for non-sensitive persisted data (preferences, cache).

 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import * as SecureStore from 'expo-secure-store';



import {

  captureStorageCallerStack,

  logStorageEvent,

  summarizeStorageKey,

} from './storageDebug';



/** AsyncStorage key length limit (iOS / Android). */

const MAX_ASYNC_STORAGE_KEY_LENGTH = 255;



/** Skip persisting values larger than this (bytes, UTF-16 approx). */

const MAX_ASYNC_STORAGE_VALUE_BYTES = 1_900_000;



function shouldVerboseLogKey(key: string, valueBytes = 0): boolean {

  const summary = summarizeStorageKey(key);

  return summary.looksLikeHtml || summary.length > 200 || valueBytes > 50_000;

}



export function assertStorageKeyLength(key: string, operation = 'storage'): void {

  const summary = summarizeStorageKey(key);

  if (summary.length <= MAX_ASYNC_STORAGE_KEY_LENGTH && !summary.looksLikeHtml) {

    return;

  }



  logStorageEvent('keyRejected', {

    operation,

    ...summary,

    maxAllowed: MAX_ASYNC_STORAGE_KEY_LENGTH,

    callerStack: captureStorageCallerStack(),

    hint: summary.looksLikeHtml

      ? 'Key looks like HTML — pass contentId-based keys only, never module.url/browse_url.'

      : 'Key exceeds AsyncStorage limit.',

  });

  throw new Error('keyTooLongError');

}



/** Build a bounded-length storage key from short segments (never pass HTML bodies). */

export function buildStorageKey(...segments: Array<string | number>): string {

  const key = segments.map((s) => String(s)).join(':');

  assertStorageKeyLength(key, 'buildStorageKey');

  return key;

}



function serializeValue<T>(value: T): string {

  return JSON.stringify(value);

}



function assertValueSize(key: string, serialized: string, operation: string): boolean {

  if (serialized.length <= MAX_ASYNC_STORAGE_VALUE_BYTES) return true;



  logStorageEvent('valueSkipped', {

    operation,

    ...summarizeStorageKey(key),

    valueBytes: serialized.length,

    maxAllowed: MAX_ASYNC_STORAGE_VALUE_BYTES,

    callerStack: captureStorageCallerStack(),

    hint: 'Value too large for AsyncStorage — use file cache (inline HTML) instead.',

  });

  return false;

}



export const secureStorage = {

  async getItem(key: string): Promise<string | null> {

    try {

      return await SecureStore.getItemAsync(key);

    } catch (error) {

      if (__DEV__) console.warn(`[SecureStore] getItem failed for "${key}":`, error);

      return null;

    }

  },



  async setItem(key: string, value: string): Promise<void> {

    try {

      await SecureStore.setItemAsync(key, value);

    } catch (error) {

      if (__DEV__) console.warn(`[SecureStore] setItem failed for "${key}":`, error);

    }

  },



  async removeItem(key: string): Promise<void> {

    try {

      await SecureStore.deleteItemAsync(key);

    } catch (error) {

      if (__DEV__) console.warn(`[SecureStore] removeItem failed for "${key}":`, error);

    }

  },

};



export const asyncStorage = {

  async getItem<T>(key: string): Promise<T | null> {

    try {

      assertStorageKeyLength(key, 'getItem');

      if (__DEV__ && shouldVerboseLogKey(key)) {

        logStorageEvent('getItem', {

          ...summarizeStorageKey(key),

          callerStack: captureStorageCallerStack(),

        });

      }

      const raw = await AsyncStorage.getItem(key);

      return raw ? (JSON.parse(raw) as T) : null;

    } catch (error) {

      logStorageEvent('getItem', {

        ...summarizeStorageKey(key),

        error: error instanceof Error ? error.message : String(error),

        callerStack: captureStorageCallerStack(),

      });

      return null;

    }

  },



  async setItem<T>(key: string, value: T): Promise<void> {

    try {

      assertStorageKeyLength(key, 'setItem');

      const serialized = serializeValue(value);

      if (!assertValueSize(key, serialized, 'setItem')) return;



      if (__DEV__ && shouldVerboseLogKey(key, serialized.length)) {

        logStorageEvent('setItem', {

          ...summarizeStorageKey(key),

          valueBytes: serialized.length,

          callerStack: captureStorageCallerStack(),

        });

      }

      await AsyncStorage.setItem(key, serialized);

    } catch (error) {

      logStorageEvent('setItem', {

        ...summarizeStorageKey(key),

        error: error instanceof Error ? error.message : String(error),

        callerStack: captureStorageCallerStack(),

      });

    }

  },



  async removeItem(key: string): Promise<void> {

    try {

      assertStorageKeyLength(key, 'removeItem');

      await AsyncStorage.removeItem(key);

    } catch (error) {

      logStorageEvent('removeItem', {

        ...summarizeStorageKey(key),

        error: error instanceof Error ? error.message : String(error),

        callerStack: captureStorageCallerStack(),

      });

    }

  },

};


