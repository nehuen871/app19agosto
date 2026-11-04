import { apiUrl } from './environment';
import { createApiClient } from '@utn/api-client';
export const api = createApiClient(apiUrl);
