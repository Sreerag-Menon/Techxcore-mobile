/**
 * Storage utilities.
 *
 * secureStorage – wraps expo-secure-store for sensitive data (tokens, credentials).
 * asyncStorage  – wraps AsyncStorage for non-sensitive persisted data (preferences, cache).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// --------------------------------------------------------------------------
// Secure Storage (expo-secure-store)
// --------------------------------------------------------------------------

export const secureStorage = {
  /** Read an item. Returns null if not found or on error. */
  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      if (__DEV__) console.warn(`[SecureStore] getItem failed for "${key}":`, error);
      return null;
    }
  },

  /** Write an item. */
  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      if (__DEV__) console.warn(`[SecureStore] setItem failed for "${key}":`, error);
    }
  },

  /** Delete an item. */
  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      if (__DEV__) console.warn(`[SecureStore] removeItem failed for "${key}":`, error);
    }
  },
};

// --------------------------------------------------------------------------
// Async Storage (non-sensitive data)
// --------------------------------------------------------------------------

export const asyncStorage = {
  /** Read a JSON-serialised value. Returns null if not found. */
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (error) {
      if (__DEV__) console.warn(`[AsyncStorage] getItem failed for "${key}":`, error);
      return null;
    }
  },

  /** Serialise and persist a value. */
  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      if (__DEV__) console.warn(`[AsyncStorage] setItem failed for "${key}":`, error);
    }
  },

  /** Remove a persisted value. */
  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      if (__DEV__) console.warn(`[AsyncStorage] removeItem failed for "${key}":`, error);
    }
  },
};
