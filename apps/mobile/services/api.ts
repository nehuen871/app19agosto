import { Platform } from 'react-native';
import { session } from './session';
import { apiUrl } from './environment';
import { createApiClient } from '@utn/api-client';
export const api = createApiClient(apiUrl, { fetcher: session.fetch });

export function mediaSource(uri: string) {
  return { uri, ...(Platform.OS !== 'web' && uri.startsWith(apiUrl + '/media/') ? { headers: session.headersFor(uri) } : {}) };
}
