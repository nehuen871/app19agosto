import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createSessionClient, type SessionCredentials } from '@utn/api-client';
import { apiUrl } from './environment';
const key = 'utn.google.session.v2';
export const session = createSessionClient({
  baseUrl: apiUrl,
  storage: {
    async load() {
      if (Platform.OS === 'web') return null;
      const raw = await SecureStore.getItemAsync(key);
      if (!raw) return null;
      try {
        const value = JSON.parse(raw) as SessionCredentials;
        return /^utn_s_[A-Za-z0-9_-]{43}$/.test(value.token) && /^utn_r_[A-Za-z0-9_-]{43}$/.test(value.refreshToken) ? value : null;
      } catch { return null; }
    },
    async save(value) { if (Platform.OS !== 'web') await SecureStore.setItemAsync(key, JSON.stringify(value)); },
    async clear() { if (Platform.OS !== 'web') { await SecureStore.deleteItemAsync(key); await SecureStore.deleteItemAsync('utn.google.session'); } },
  },
  exclusive: async action => Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.locks ? await navigator.locks.request('utn-app-session-renewal', action) : await action(),
});
