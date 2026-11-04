import { Platform } from 'react-native';

// Expo replaces each EXPO_PUBLIC variable at build time. Never read secrets here.
export const apiUrl = (Platform.OS === 'web'
  ? process.env.EXPO_PUBLIC_WEB_API_URL ?? '/api/v1'
  : process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1').replace(/\/+$/, '');
