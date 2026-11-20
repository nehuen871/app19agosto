import { Platform } from 'react-native';
import { session } from './session';
import { apiUrl } from './environment';
import { createApiClient } from '@utn/api-client';
export const api = createApiClient(apiUrl, { fetcher: session.fetch });

export function mediaSource(uri: string) {
  // Protected web images use the same-origin proxy, including when JSON requests
  // target a separate API port. This preserves cookies and media isolation.
  if (Platform.OS === 'web' && /^https?:\/\//.test(apiUrl)) {
    const mediaBase = new URL(apiUrl + '/media/');
    const image = new URL(uri, apiUrl);
    if (image.origin === mediaBase.origin && image.pathname.startsWith(mediaBase.pathname)) uri = image.pathname;
  }
  return { uri, ...(Platform.OS !== 'web' && uri.startsWith(apiUrl + '/media/') ? { headers: session.headersFor(uri) } : {}) };
}
