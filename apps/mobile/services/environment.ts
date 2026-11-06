import { Platform } from 'react-native';

// Expo replaces each EXPO_PUBLIC variable at build time. Never read secrets here.
export const apiUrl = (Platform.OS === 'web'
  ? process.env.EXPO_PUBLIC_WEB_API_URL ?? '/api/v1'
  : process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1').replace(/\/+$/, '');

const relativeWebApi = Platform.OS === 'web' && apiUrl.startsWith('/') && !apiUrl.startsWith('//');
if (!relativeWebApi) {
  const url = new URL(apiUrl);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash || url.search) throw new Error('La URL de la API no es válida.');
  if (!__DEV__ && url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('La API debe usar HTTPS fuera del desarrollo local.');
}
