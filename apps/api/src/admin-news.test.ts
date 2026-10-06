import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { db } from './db';
import { createApp } from './app';
const token = randomUUID();
const app = createApp(db, { adminAccessToken: token });
const prefix = `test-${randomUUID()}`;
const ids: string[] = [];
const input = { title: 'Noticia', slug: prefix, summary: 'Resumen', content: '<script>Texto literal</script>', category: prefix };
after(async () => {
  await db.auditLog.deleteMany({ where: { entityId: { in: ids } } });
  await db.news.deleteMany({ where: { id: { in: ids } } });
  await db.category.deleteMany({ where: { slug: prefix } });
  await db.$disconnect();
});
test('denies unauthenticated news writes and listing', async () => {
  await request(app).post('/api/v1/admin/news').send(input).expect(401);
  await request(app).get('/api/v1/admin/news').expect(401);
});
test('saves draft atomically and keeps it out of public news', async () => {
  const response = await request(app).post('/api/v1/admin/news').set('Authorization', `Bearer ${token}`).send(input).expect(201);
  ids.push(response.body.id);
  assert.equal(response.body.status, 'DRAFT');
  assert.equal(response.body.publishedAt, null);
  assert.equal((await db.auditLog.findFirstOrThrow({ where: { entityId: response.body.id } })).action, 'NEWS_CREATED');
  await request(app).get(`/api/v1/news/${prefix}`).expect(404);
});
test('rejects duplicate slug and tampered or unsafe fields', async () => {
  await request(app).post('/api/v1/admin/news').set('Authorization', `Bearer ${token}`).send(input).expect(409);
  for (const extra of [{ status: 'ARCHIVED' }, { categoryId: 'forged' }, { publishedAt: '2020-01-01' }, { coverImageUrl: 'javascript:alert(1)' }, { title: ' ' }]) {
    await request(app).post('/api/v1/admin/news').set('Authorization', `Bearer ${token}`).send({ ...input, ...extra }).expect(400);
  }
});
test('published news is visible in the app and saving never sends push', async () => {
  const response = await request(app).post('/api/v1/admin/news').set('Authorization', `Bearer ${token}`).send({ ...input, slug: `${prefix}-published`, status: 'PUBLISHED' }).expect(201);
  ids.push(response.body.id);
  const detail = await request(app).get(`/api/v1/news/${prefix}-published`).expect(200);
  assert.equal(detail.body.content, input.content);
  assert.equal(await db.notification.count({ where: { newsId: response.body.id } }), 0);
  const list = await request(app).get('/api/v1/admin/news').set('Authorization', `Bearer ${token}`).expect(200);
  assert.ok(list.body.items.some((news: { id: string }) => news.id === response.body.id));
});
