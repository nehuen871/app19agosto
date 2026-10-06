import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import webPush from 'web-push';
import request from 'supertest';
import { db } from './db';
import { createApp } from './app';
import { processPushQueue } from './push';
const token = randomUUID();
const app = createApp(db, { adminAccessToken: token });
const notificationIds: string[] = [], subscriptionIds: string[] = [];
const subscription = (suffix: string) => ({ endpoint: `https://fcm.googleapis.com/fcm/send/test-${randomUUID()}-${suffix}`, keys: { p256dh: 'a'.repeat(87), auth: 'b'.repeat(22) } });
before(() => { const keys = webPush.generateVAPIDKeys(); process.env.PUSH_VAPID_PUBLIC_KEY = keys.publicKey; process.env.PUSH_VAPID_PRIVATE_KEY = keys.privateKey; process.env.PUSH_VAPID_SUBJECT = 'mailto:push@example.invalid'; });
after(async () => {
  await db.auditLog.deleteMany({ where: { entityId: { in: notificationIds } } });
  await db.notification.deleteMany({ where: { id: { in: notificationIds } } });
  await db.pushSubscription.deleteMany({ where: { id: { in: subscriptionIds } } });
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
