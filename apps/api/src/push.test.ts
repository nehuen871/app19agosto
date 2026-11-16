import { createTestAdmin, removeTestAdmin, testAdminToken } from './test-admin';
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import webPush from 'web-push';
import request from 'supertest';
import { db } from './db';
import { createApp } from './app';
import { processPushQueue } from './push';
import { hashToken } from './auth';
import { expoPushError } from './expo-push';
const token = testAdminToken();
const app = createApp(db);
const notificationIds: string[] = [], subscriptionIds: string[] = [];
const subscription = (suffix: string) => ({ endpoint: `https://fcm.googleapis.com/fcm/send/test-${randomUUID()}-${suffix}`, keys: { p256dh: 'a'.repeat(87), auth: 'b'.repeat(22) } });
before(() => { const keys = webPush.generateVAPIDKeys(); process.env.PUSH_VAPID_PUBLIC_KEY = keys.publicKey; process.env.PUSH_VAPID_PRIVATE_KEY = keys.privateKey; process.env.PUSH_VAPID_SUBJECT = 'mailto:push@example.invalid'; });
before(async () => { await createTestAdmin(db, token); });
after(async () => {
  await db.auditLog.deleteMany({ where: { entityId: { in: notificationIds } } });
  await db.notification.deleteMany({ where: { id: { in: notificationIds } } });
  await db.pushSubscription.deleteMany({ where: { id: { in: subscriptionIds } } });
  await removeTestAdmin(db, token);
  await db.$disconnect();
});
async function draft() {
  const item = await db.notification.create({ data: { title: 'Prueba', body: 'Mensaje' } });
  notificationIds.push(item.id); return item.id;
}
test('push send requires administrative authorization and preserves draft when there are no recipients', async () => {
  const id = await draft();
  await request(app).post(`/api/v1/admin/notifications/${id}/send`).send({}).expect(401);
  const response = await request(app).post(`/api/v1/admin/notifications/${id}/send`).set('Authorization', `Bearer ${token}`).send({}).expect(409);
  assert.equal(response.body.error.code, 'NO_RECIPIENTS');
  assert.equal((await db.notification.findUniqueOrThrow({ where: { id } })).status, 'DRAFT');
});
test('rejects unsafe endpoints and mass assignment; allows revocation only with device capability', async () => {
  for (const input of [{ ...subscription('bad'), endpoint: 'https://127.0.0.1/private' }, { ...subscription('bad'), endpoint: 'https://fcm.googleapis.com.attacker.invalid/push' }, { ...subscription('bad'), enabled: true }]) {
    await request(app).post('/api/v1/push/subscriptions').send(input).expect(400);
  }
  const response = await request(app).post('/api/v1/push/subscriptions').send(subscription('revoked')).expect(201);
  subscriptionIds.push(response.body.id);
  assert.equal(response.body.subscription, undefined);
  await request(app).post('/api/v1/push/unsubscribe').send({ id: response.body.id, revokeToken: 'x'.repeat(43) }).expect(204);
  assert.equal((await db.pushSubscription.findUniqueOrThrow({ where: { id: response.body.id } })).enabled, true);
  await request(app).post('/api/v1/push/unsubscribe').send(response.body).expect(204);
  assert.equal((await db.pushSubscription.findUniqueOrThrow({ where: { id: response.body.id } })).enabled, false);
});
test('queues exactly once, counts partial results, disables expired devices and never resends', async () => {
  for (const suffix of ['first', 'second']) {
    const response = await request(app).post('/api/v1/push/subscriptions').send(subscription(suffix)).expect(201);
    subscriptionIds.push(response.body.id);
  }
  const id = await draft();
  const responses = await Promise.all([1, 2].map(() => request(app).post(`/api/v1/admin/notifications/${id}/send`).set('Authorization', `Bearer ${token}`).send({})));
  assert.deepEqual(responses.map(response => response.status).sort(), [202, 409]);
  assert.equal(await db.pushDelivery.count({ where: { notificationId: id } }), 2);
  let calls = 0;
  await processPushQueue(db, async (_subscription, payload) => {
    assert.equal(payload.url, '/');
    if (++calls === 1) throw Object.assign(new Error('gone'), { statusCode: 410 });
  });
  const item = await db.notification.findUniqueOrThrow({ where: { id } });
  assert.equal(item.status, 'PARTIAL');
  assert.equal(item.requestedRecipients, 2);
  assert.equal(item.sentCount, 1); assert.equal(item.failedCount, 1);
  assert.equal(await db.pushSubscription.count({ where: { id: { in: subscriptionIds }, enabled: true } }), 1);
  await processPushQueue(db, async () => { calls++; });
  assert.equal(calls, 2);
  await request(app).post(`/api/v1/admin/notifications/${id}/send`).set('Authorization', `Bearer ${token}`).send({}).expect(409);
});
test('recovers final counters after interrupted finalization without sending twice', async () => {
  const id = await draft();
  const active = await db.pushSubscription.findFirstOrThrow({ where: { enabled: true } });
  await db.pushDelivery.create({ data: { notificationId: id, subscriptionId: active.id, status: 'SENT' } });
  await db.notification.update({ where: { id }, data: { status: 'PROCESSING', requestedRecipients: 1 } });
  await processPushQueue(db, async () => { assert.fail('Must not resend completed delivery'); });
  assert.equal((await db.notification.findUniqueOrThrow({ where: { id } })).status, 'SENT');
});

test('native registration requires an app session and matching project; Expo receipts finalize the shared queue', async () => {
  const projectId = '10000000-0000-4000-8000-000000000001';
  process.env.EXPO_PUSH_ENABLED = 'true'; process.env.EXPO_PROJECT_ID = projectId;
  process.env.ALLOWED_EMAIL_DOMAINS = 'example.test';
  const appToken = testAdminToken();
  const account = await db.account.create({ data: { googleSubject: randomUUID(), email: 'reader@example.test', name: 'Reader' } });
  const webKey = process.env.PUSH_VAPID_PUBLIC_KEY;
  try {
    await db.authSession.create({ data: { tokenHash: hashToken(appToken), accountId: account.id, purpose: 'APP', expiresAt: new Date(Date.now() + 60000) } });
    const body = { provider: 'expo', token: `ExpoPushToken[${randomUUID()}]`, projectId };
    await request(app).post('/api/v1/push/native/subscriptions').send(body).expect(401);
    await request(app).post('/api/v1/push/native/subscriptions').set('Authorization', `Bearer ${token}`).send(body).expect(403);
    const register = (input: object) => request(app).post('/api/v1/push/native/subscriptions').set('Authorization', `Bearer ${appToken}`).send(input);
    await register({ ...body, projectId: randomUUID() }).expect(400);
    await register({ ...body, enabled: true }).expect(400);
    const registered = await register(body).expect(201); subscriptionIds.push(registered.body.id);
    const again = await register(body).expect(201); assert.equal(registered.body.id, again.body.id);
    await request(app).post('/api/v1/push/unsubscribe').send(registered.body).expect(204);
    assert.equal((await db.pushSubscription.findUniqueOrThrow({ where: { id: again.body.id } })).enabled, true);
    const id = await draft();
    process.env.PUSH_VAPID_PUBLIC_KEY = '';
    await request(app).post(`/api/v1/admin/notifications/${id}/send`).set('Authorization', `Bearer ${token}`).send({}).expect(202);
    assert.equal((await db.notification.findUniqueOrThrow({ where: { id } })).requestedRecipients, 1);
    let sends = 0;
    const transport = { send: async () => { sends++; return 'expo-test-ticket'; }, receipt: async () => true };
    await processPushQueue(db, async () => {}, transport);
    const delivery = await db.pushDelivery.findUniqueOrThrow({ where: { notificationId_subscriptionId: { notificationId: id, subscriptionId: again.body.id } } });
    assert.equal(delivery.status, 'AWAITING_RECEIPT');
    assert.equal((await db.notification.findUniqueOrThrow({ where: { id } })).status, 'PROCESSING');
    await db.pushDelivery.update({ where: { id: delivery.id }, data: { receiptCheckAt: new Date(0) } });
    await processPushQueue(db, async () => {}, transport);
    assert.equal((await db.notification.findUniqueOrThrow({ where: { id } })).status, 'SENT');
    assert.equal(sends, 1);
    const failedId = await draft();
    await request(app).post(`/api/v1/admin/notifications/${failedId}/send`).set('Authorization', `Bearer ${token}`).send({}).expect(202);
    await processPushQueue(db, async () => {}, transport);
    await db.pushDelivery.updateMany({ where: { notificationId: failedId, status: 'AWAITING_RECEIPT' }, data: { receiptCheckAt: new Date(0) } });
    await processPushQueue(db, async () => {}, { ...transport, receipt: async () => { throw expoPushError('DeviceNotRegistered'); } });
    assert.equal((await db.pushSubscription.findUniqueOrThrow({ where: { id: again.body.id } })).enabled, false);
    assert.equal((await db.pushDelivery.findUniqueOrThrow({ where: { notificationId_subscriptionId: { notificationId: failedId, subscriptionId: again.body.id } } })).errorCode, 'EXPIRED');
  } finally { process.env.PUSH_VAPID_PUBLIC_KEY = webKey; await db.account.delete({ where: { id: account.id } }); }
});
