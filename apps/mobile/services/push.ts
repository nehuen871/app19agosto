const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
export const pushStorageKey = 'utn-push-subscription';
export interface PushConfig { enabled: boolean; publicKey: string | null }
export interface PushCapability { id: string; revokeToken: string }
async function request(path: string, body?: unknown): Promise<Response> {
  const response = await fetch(`${baseUrl}/push${path}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('No pudimos configurar las notificaciones. Volvé a intentar.');
  return response;
}
export const pushApi = {
  config: async (): Promise<PushConfig> => (await request('/config')).json(),
  subscribe: async (subscription: PushSubscriptionJSON): Promise<PushCapability> => (await request('/subscriptions', subscription)).json(),
  unsubscribe: async (capability: PushCapability): Promise<void> => { await request('/unsubscribe', capability); },
};
