import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createExpoTransport, expoSubscriptionSchema } from './expo-push';
const projectId = '10000000-0000-4000-8000-000000000001';
const subscription = { provider: 'expo' as const, token: 'ExpoPushToken[test-token]', projectId };
const payload = { title: 'Aviso', body: 'Mensaje', url: '/news/prueba', tag: 'notification-1' };
test('Expo sends only to the fixed provider and awaits receipts instead of treating tickets as delivery', async () => {
  process.env.EXPO_PUSH_ENABLED = 'true'; process.env.EXPO_PROJECT_ID = projectId;
  const transport = createExpoTransport(async (url, options) => {
    assert.ok(String(url).startsWith('https://exp.host/--/api/v2/push/'));
    const body = JSON.parse(String(options?.body));
    if (String(url).endsWith('/send')) {
      assert.equal(body.to, subscription.token); assert.deepEqual(body.data, { url: payload.url, notificationId: payload.tag });
      return Response.json({ data: { status: 'ok', id: 'ticket-1' } });
    }
    assert.deepEqual(body, { ids: ['ticket-1'] });
    return Response.json({ data: { 'ticket-1': { status: 'ok' } } });
  });
  assert.equal(await transport.send(subscription, payload), 'ticket-1');
  assert.equal(await transport.receipt('ticket-1'), true);
  await assert.rejects(transport.send({ ...subscription, projectId: '20000000-0000-4000-8000-000000000002' }, payload));
});
test('invalid tokens, arbitrary endpoints and unknown fields are rejected', () => {
  for (const input of [{ ...subscription, token: 'https://attacker.test' }, { ...subscription, enabled: true }, { ...subscription, projectId: 'invalid' }]) assert.equal(expoSubscriptionSchema.safeParse(input).success, false);
});
test('Expo ticket and receipt errors invalidate unregistered devices; unavailable receipts remain pending', async () => {
  process.env.EXPO_PUSH_ENABLED = 'true'; process.env.EXPO_PROJECT_ID = projectId;
  const transport = createExpoTransport(async url => Response.json({ data: String(url).endsWith('/send') ? { status: 'error', details: { error: 'DeviceNotRegistered' } } : { 'ticket-1': { status: 'error', details: { error: 'DeviceNotRegistered' } } } }));
  for (const action of [() => transport.send(subscription, payload), () => transport.receipt('ticket-1')]) await assert.rejects(action, error => typeof error === 'object' && error !== null && 'statusCode' in error && error.statusCode === 410);
  assert.equal(await createExpoTransport(async () => Response.json({ data: {} })).receipt('not-ready'), false);
  await assert.rejects(createExpoTransport(async () => new Response(null, { status: 503 })).receipt('ticket-1'));
});
