import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from './app';
import { db } from './db';
import { hashToken } from './auth';
import { createTestAdmin, removeTestAdmin, testAdminToken } from './test-admin';
const token = testAdminToken(), userToken = testAdminToken(), prefix = 'news-edit-' + randomUUID();
const ids: string[] = [], images: string[] = [];
const input = { title: 'Noticia original', slug: prefix, summary: 'Resumen original', content: 'Contenido original', category: prefix, featured: false, status: 'DRAFT' };
before(async () => {
  await createTestAdmin(db, token);
  const user = await db.account.create({ data: { googleSubject: hashToken(userToken), email: 'reader@example.test', name: 'Reader', role: 'USER' } });
  await db.authSession.create({ data: { tokenHash: hashToken(userToken), accountId: user.id, purpose: 'APP', expiresAt: new Date(Date.now() + 3600000) } });
});
after(async () => {
  await db.auditLog.deleteMany({ where: { entityId: { in: ids } } });
  await db.news.deleteMany({ where: { id: { in: ids } } });
  await db.category.deleteMany({ where: { slug: prefix } });
  await db.mediaImage.deleteMany({ where: { id: { in: images } } });
  await removeTestAdmin(db, token); await removeTestAdmin(db, userToken); await db.$disconnect();
});
test('news editing requires an admin session and rejects invalid IDs and mass assignment', async () => {
  const app = createApp(db), endpoint = '/api/v1/admin/news/' + 'c' + 'a'.repeat(24);
  await request(app).patch(endpoint).send(input).expect(401);
  await request(app).patch(endpoint).set('Authorization', 'Bearer invalid').send(input).expect(401);
  await request(app).patch(endpoint).set('Authorization', `Bearer ${userToken}`).send(input).expect(401);
  await request(app).patch('/api/v1/admin/news/invalid').set('Authorization', `Bearer ${token}`).send(input).expect(400);
  for (const extra of [{ createdById: 'forged' }, { status: 'DELETED' }, { coverImageUrl: 'javascript:alert(1)' }]) {
    await request(app).patch(endpoint).set('Authorization', `Bearer ${token}`).send({ ...input, ...extra }).expect(400);
  }
  await request(app).patch(endpoint).set('Authorization', `Bearer ${token}`).send(input).expect(404);
});
test('editing updates the existing news, preserves images/publication time, validates conflicts and audits changes', async () => {
  const app = createApp(db);
  const image = await db.mediaImage.create({ data: { mimeType: 'image/png', data: Buffer.from('test'), byteSize: 4 } }); images.push(image.id);
  const created = await request(app).post('/api/v1/admin/news').set('Authorization', `Bearer ${token}`).send({ ...input, coverImageId: image.id }).expect(201); ids.push(created.body.id);
  const endpoint = '/api/v1/admin/news/' + created.body.id;
  const updated = { ...input, title: 'Noticia editada', content: '<script>Texto literal</script>', featured: true, status: 'PUBLISHED', coverImageId: image.id };
  const published = await request(app).patch(endpoint).set('Authorization', `Bearer ${token}`).send(updated).expect(200);
  assert.equal(published.body.id, created.body.id); assert.equal(published.body.coverImageUrl, `/api/v1/media/${image.id}`);
  const again = await request(app).patch(endpoint).set('Authorization', `Bearer ${token}`).send({ ...updated, summary: 'Nuevo resumen' }).expect(200);
  assert.equal(again.body.publishedAt, published.body.publishedAt);
  const detail = await request(app).get('/api/v1/news/' + prefix).set('Authorization', `Bearer ${token}`).expect(200);
  assert.equal(detail.body.title, updated.title); assert.equal(detail.body.content, updated.content);
  await request(app).patch(endpoint).set('Authorization', `Bearer ${token}`).send({ ...updated, coverImageId: randomUUID() }).expect(400);
  const other = await request(app).post('/api/v1/admin/news').set('Authorization', `Bearer ${token}`).send({ ...input, slug: prefix + '-other' }).expect(201); ids.push(other.body.id);
  await request(app).patch(endpoint).set('Authorization', `Bearer ${token}`).send({ ...updated, slug: prefix + '-other' }).expect(409);
  const archived = await request(app).patch(endpoint).set('Authorization', `Bearer ${token}`).send({ ...updated, status: 'ARCHIVED' }).expect(200);
  assert.equal(archived.body.publishedAt, published.body.publishedAt);
  await request(app).get('/api/v1/news/' + prefix).set('Authorization', `Bearer ${token}`).expect(404);
  const audit = await db.auditLog.findMany({ where: { entityId: created.body.id } });
  assert.ok(audit.some(item => item.action === 'NEWS_UPDATED'));
  assert.equal(audit.filter(item => item.action === 'NEWS_PUBLISHED').length, 1);
  assert.ok(audit.some(item => item.action === 'NEWS_ARCHIVED'));
});
test('visibility actions are protected, change only visibility, preserve publication dates and never send push', async () => {
  const app = createApp(db);
  const created = await request(app).post('/api/v1/admin/news').set('Authorization', `Bearer ${token}`).send({ ...input, slug: prefix + '-visibility' }).expect(201); ids.push(created.body.id);
  const endpoint = '/api/v1/admin/news/' + created.body.id + '/visibility';
  await request(app).patch(endpoint).send({ published: true }).expect(401);
  await request(app).patch(endpoint).set('Authorization', `Bearer ${userToken}`).send({ published: true }).expect(401);
  for (const body of [{ published: 'true' }, { published: true, title: 'forged' }, {}]) await request(app).patch(endpoint).set('Authorization', `Bearer ${token}`).send(body).expect(400);
  const published = await request(app).patch(endpoint).set('Authorization', `Bearer ${token}`).send({ published: true }).expect(200);
  await request(app).get('/api/v1/news/' + input.slug + '-visibility').set('Authorization', `Bearer ${token}`).expect(200);
  const hidden = await request(app).patch(endpoint).set('Authorization', `Bearer ${token}`).send({ published: false }).expect(200);
  assert.equal(hidden.body.status, 'ARCHIVED'); assert.equal(hidden.body.title, input.title); assert.equal(hidden.body.content, input.content);
  assert.equal(hidden.body.publishedAt, published.body.publishedAt);
  await request(app).get('/api/v1/news/' + input.slug + '-visibility').set('Authorization', `Bearer ${token}`).expect(404);
  await request(app).patch(endpoint).set('Authorization', `Bearer ${token}`).send({ published: false }).expect(200);
  assert.equal(await db.auditLog.count({ where: { entityId: created.body.id, action: 'NEWS_ARCHIVED' } }), 1);
  const republished = await request(app).patch(endpoint).set('Authorization', `Bearer ${token}`).send({ published: true }).expect(200);
  assert.equal(republished.body.publishedAt, published.body.publishedAt);
  assert.equal(await db.notification.count({ where: { newsId: created.body.id } }), 0);
  await request(app).patch('/api/v1/admin/news/' + 'c' + 'a'.repeat(24) + '/visibility').set('Authorization', `Bearer ${token}`).send({ published: true }).expect(404);
});
