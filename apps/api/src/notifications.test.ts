import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { db } from './db';
import { createApp } from './app';
const token = randomUUID();
const app = createApp(db, { adminAccessToken: token });
const auth = `Bearer ${token}`;
const prefix = `test-${randomUUID()}`;
const created: string[] = [];
let categoryId: string, newsId: string, draftId: string;
before(async () => {
  const category = await db.category.create({ data: { name: 'Test', slug: prefix } });
  categoryId = category.id;
  for (const status of ['PUBLISHED', 'DRAFT'] as const) {
    const news = await db.news.create({ data: { title: 'Test', slug: `${prefix}-${status.toLowerCase()}`, summary: 'Test', content: 'Test', status, publishedAt: status === 'PUBLISHED' ? new Date('2020-01-01') : null, categoryId } });
    if (status === 'PUBLISHED') newsId = news.id; else draftId = news.id;
  }
});
after(async () => {
  await db.auditLog.deleteMany({ where: { entityId: { in: created } } });
  await db.notification.deleteMany({ where: { id: { in: created } } });
  if (categoryId) { await db.news.deleteMany({ where: { categoryId } }); await db.category.delete({ where: { id: categoryId } }); }
  await db.$disconnect();
});
test('requires admin credentials for reading and creating notifications', async () => {
  await request(app).get('/api/v1/admin/notifications').expect(401);
  await request(app).post('/api/v1/admin/notifications').send({ title: 'Test', body: 'Test' }).expect(401);
  await request(app).get('/api/v1/admin/notifications').set('Authorization', 'Bearer wrong').expect(401);
  await request(createApp(db, { adminAccessToken: undefined })).get('/api/v1/admin/notifications').expect(503);
});
test('saves drafts and audit atomically, links published news and never sends implicitly', async () => {
  const response = await request(app).post('/api/v1/admin/notifications').set('Authorization', auth).send({ title: '  Aviso  ', body: ' Mensaje ', newsId }).expect(201);
  created.push(response.body.id);
  assert.equal(response.body.title, 'Aviso');
  assert.equal(response.body.status, 'DRAFT');
  assert.equal(response.body.sentCount, 0);
  assert.equal(response.body.sentAt, null);
  const audit = await db.auditLog.findFirstOrThrow({ where: { entityId: response.body.id } });
  assert.equal(audit.action, 'NOTIFICATION_CREATED');
  assert.equal(audit.actor, 'local-admin');
  const page = await request(app).get('/api/v1/admin/notifications?limit=100').set('Authorization', auth).expect(200);
  assert.ok(page.body.items.some((item: { id: string }) => item.id === response.body.id));
});
test('rejects blank, excessive, forged status and unpublished or nonexistent news', async () => {
  for (const data of [
    { title: ' ', body: 'Test' }, { title: 'Test', body: 'x'.repeat(501) },
    { title: 'Test', body: 'Test', status: 'SENT' },
    { title: 'Test', body: 'Test', newsId: draftId },
    { title: 'Test', body: 'Test', newsId: 'missing' },
  ]) await request(app).post('/api/v1/admin/notifications').set('Authorization', auth).send(data).expect(400);
  await request(app).get('/api/v1/admin/notifications?page=0').set('Authorization', auth).expect(400);
});
test('supports notifications without a news link', async () => {
  const response = await request(app).post('/api/v1/admin/notifications').set('Authorization', auth).send({ title: 'Aviso general', body: 'Mensaje' }).expect(201);
  created.push(response.body.id);
  assert.equal(response.body.newsId, null);
});
