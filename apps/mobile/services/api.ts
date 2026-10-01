import { createApiClient } from '@utn/api-client';
export const api = createApiClient(process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1');
