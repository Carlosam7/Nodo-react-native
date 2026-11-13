import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
}

const memoryStore = new Map<string, string>();

/**
 * Almacén seguro para tokens de autenticación de Roble.
 * Usa `expo-secure-store` en Android e iOS y cookies en Web.
 * Las cookies son accesibles desde JavaScript: Roble entrega los tokens al cliente.
 */
const cookieName = (key: string) => encodeURIComponent(key);
const cookieOptions = () =>
  `Path=/; SameSite=Strict${typeof window !== 'undefined' && window.location?.protocol === 'https:' ? '; Secure' : ''}`;

export const TokenStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        if (typeof document !== 'undefined') {
          const prefix = `${cookieName(key)}=`;
          const cookie = document.cookie.split('; ').find((item) => item.startsWith(prefix));
          if (cookie) return decodeURIComponent(cookie.slice(prefix.length));
        }
        const legacy = typeof window !== 'undefined' ? window.localStorage?.getItem(key) : null;
        if (legacy) {
          await TokenStorage.setItem(key, legacy);
          return legacy;
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
        if (typeof document !== 'undefined') {
          document.cookie = `${cookieName(key)}=${encodeURIComponent(value)}; Max-Age=2592000; ${cookieOptions()}`;
        }
        if (typeof window !== 'undefined') {
          window.localStorage?.removeItem(key);
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
        if (typeof document !== 'undefined') {
          document.cookie = `${cookieName(key)}=; Max-Age=0; ${cookieOptions()}`;
        }
        if (typeof window !== 'undefined') {
          window.localStorage?.removeItem(key);
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
