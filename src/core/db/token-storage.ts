import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
}

const memoryStore = new Map<string, string>();

/**
 * Almacén seguro para tokens de autenticación de Roble.
 * Usa `expo-secure-store` en Android e iOS, y `localStorage` en Web.
 */
export const TokenStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
      } catch {
        // Fallback a memoria
      }
      return memoryStore.get(key) ?? null;
    }

    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return memoryStore.get(key) ?? null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    memoryStore.set(key, value);

    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
      } catch {
        // Error silencioso en web
      }
      return;
    }

    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Si falla SecureStore, se mantiene en memoria
    }
  },

  async removeItem(key: string): Promise<void> {
    memoryStore.delete(key);

    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } catch {
        // Error silencioso en web
      }
      return;
    }

    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Ignorar si no existe
    }
  },
};
