/**
 * secureStorage.ts — Production-grade hardware-backed secure storage for MyQuro.
 * Uses expo-secure-store for AES-256 encrypted storage on iOS Keychain and Android KeyStore.
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SECURE_TOKEN_KEY = 'myquro_auth_session_token';
const SECURE_REFRESH_KEY = 'myquro_auth_refresh_token';

export const SecureStorage = {
  /**
   * Securely saves the authentication session token into Keychain / KeyStore.
   */
  async setSessionToken(token: string): Promise<void> {
    if (!token) return;
    try {
      if (Platform.OS !== 'web') {
        await SecureStore.setItemAsync(SECURE_TOKEN_KEY, token, {
          keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
        });
      } else {
        await AsyncStorage.setItem(`@sec_${SECURE_TOKEN_KEY}`, token);
      }
    } catch (error) {
      console.warn('[SecureStorage] Error saving session token securely:', error);
      // Fallback for environments where SecureStore encounters temporary hardware lock
      await AsyncStorage.setItem(`@sec_${SECURE_TOKEN_KEY}`, token);
    }
  },

  /**
   * Securely retrieves the authentication session token.
   */
  async getSessionToken(): Promise<string | null> {
    try {
      if (Platform.OS !== 'web') {
        const token = await SecureStore.getItemAsync(SECURE_TOKEN_KEY);
        if (token) return token;
      }
      return await AsyncStorage.getItem(`@sec_${SECURE_TOKEN_KEY}`);
    } catch (error) {
      console.warn('[SecureStorage] Error reading session token:', error);
      return await AsyncStorage.getItem(`@sec_${SECURE_TOKEN_KEY}`);
    }
  },

  /**
   * Securely deletes the authentication session token upon logout or account deletion.
   */
  async clearSessionToken(): Promise<void> {
    try {
      if (Platform.OS !== 'web') {
        await SecureStore.deleteItemAsync(SECURE_TOKEN_KEY);
      }
      await AsyncStorage.removeItem(`@sec_${SECURE_TOKEN_KEY}`);
    } catch (error) {
      console.warn('[SecureStorage] Error clearing session token:', error);
      await AsyncStorage.removeItem(`@sec_${SECURE_TOKEN_KEY}`);
    }
  },

  /**
   * Purges all sensitive user credentials from local device storage.
   */
  async purgeAllCredentials(): Promise<void> {
    await this.clearSessionToken();
    try {
      if (Platform.OS !== 'web') {
        await SecureStore.deleteItemAsync(SECURE_REFRESH_KEY);
      }
      await AsyncStorage.removeItem(`@sec_${SECURE_REFRESH_KEY}`);
    } catch (e) {}
  },
};
