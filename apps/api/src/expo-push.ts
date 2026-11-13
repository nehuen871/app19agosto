import { z } from 'zod';

export const expoSubscriptionSchema = z.object({
  provider: z.literal('expo'),
  token: z.string().regex(/^(?:Expo|Exponent)PushToken\[[A-Za-z0-9_-]{1,200}\]$/),
  projectId: z.uuid(),
}).strict();
const ticketSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('ok'), id: z.string().min(1).max(200) }),
  z.object({ status: z.literal('error'), details: z.object({ error: z.string() }).optional() }),
]);
const receiptSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('ok') }),
  z.object({ status: z.literal('error'), details: z.object({ error: z.string() }).optional() }),
]);
export function expoPushConfigured() {
  return process.env.EXPO_PUSH_ENABLED === 'true' && z.uuid().safeParse(process.env.EXPO_PROJECT_ID).success;
}
export function expoPushError(code?: string) {
  return Object.assign(new Error('Expo push failed'), { expoRejected: true, statusCode: code === 'DeviceNotRegistered' ? 410 : undefined });
}
export function createExpoTransport(fetcher: typeof fetch = fetch) {
  async function request(path: string, body: unknown) {
    const response = await fetcher('https://exp.host/--/api/v2/push/' + path, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: 'Bearer ' + process.env.EXPO_ACCESS_TOKEN } : {}) },
      body: JSON.stringify(body), signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('Expo push unavailable');
    return response.json() as Promise<unknown>;
  }
  return {
    async send(subscription: z.infer<typeof expoSubscriptionSchema>, payload: { title: string; body: string; url: string; tag: string }) {
      if (!expoPushConfigured() || subscription.projectId !== process.env.EXPO_PROJECT_ID) throw new Error('Expo project unavailable');
      const result = z.object({ data: ticketSchema }).parse(await request('send', {
        to: subscription.token, title: payload.title, body: payload.body, sound: 'default', channelId: 'news', ttl: 86400,
        data: { url: payload.url, notificationId: payload.tag },
      }));
      if (result.data.status === 'error') throw expoPushError(result.data.details?.error);
      return result.data.id;
    },
    async receipt(id: string) {
      const result = z.object({ data: z.record(z.string(), receiptSchema) }).parse(await request('getReceipts', { ids: [id] }));
      const receipt = result.data[id];
      if (receipt?.status === 'error') throw expoPushError(receipt.details?.error);
      return receipt?.status === 'ok';
    },
  };
}
