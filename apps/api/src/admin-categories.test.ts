import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from './app';
import { db } from './db';
import { hashToken } from './auth';
import { createTestAdmin, removeTestAdmin, testAdminToken } from './test-admin';
const token = testAdminToken(), userToken = testAdminToken(), prefix = 'categories-' + randomUUID();
const ids: string[] = [], newsIds: string[] = [];
const auth = { Authorization: `Bearer ${token}` };
const app = () => createApp(db);
before(async () => {
  await createTestAdmin(db, token);
  const user = await db.account.create({ data: { googleSubject: hashToken(userToken), email: 'reader@example.test', name: 'Reader', role: 'USER' } });
  await db.authSession.create({ data: { tokenHash: hashToken(userToken), accountId: user.id, purpose: 'APP', expiresAt: new Date(Date.now() + 3600000) } });
});
after(async () => {
  await db.news.deleteMany({ where: { id: { in: newsIds } } });
  await db.category.deleteMany({ where: { id: { in: ids } } });
  await db.auditLog.deleteMany({ where: { entityId: { in: [...ids, ...newsIds] } } });
  await removeTestAdmin(db, token); await removeTestAdmin(db, userToken); await db.$disconnect();
});
test('all category operations require an admin session', async () => {
  for (const authorization of ['', 'Bearer invalid', `Bearer ${userToken}`]) {
    const target = app(), endpoint = '/api/v1/admin/categories', id = 'c' + 'a'.repeat(24);
    await request(target).get(endpoint).set('Authorization', authorization).expect(401);
    await request(target).post(endpoint).set('Authorization', authorization).send({ name: prefix }).expect(401);
    await request(target).patch(`${endpoint}/${id}`).set('Authorization', authorization).send({ name: prefix }).expect(401);
    await request(target).delete(`${endpoint}/${id}`).set('Authorization', authorization).expect(401);
  }
});
test('category CRUD validates names, duplicates, pagination, missing IDs and audits changes', async () => {
  const target = app(), endpoint = '/api/v1/admin/categories';
  for (const body of [{ name: '' }, { name: '---' }, { name: 'x'.repeat(101) }, { name: prefix, role: 'ADMIN' }]) await request(target).post(endpoint).set(auth).send(body).expect(400);
  const created = await request(target).post(endpoint).set(auth).send({ name: prefix }).expect(201); ids.push(created.body.id);
  await request(target).post(endpoint).set(auth).send({ name: prefix.toUpperCase() }).expect(409);
  const list = await request(target).get(endpoint + '?limit=1').set(auth).expect(200);
  assert.equal(list.body.items.length, 1); assert.ok(list.body.total >= 1);
  await request(target).get(endpoint + '?limit=101').set(auth).expect(400);
  await request(target).patch(endpoint + '/invalid').set(auth).send({ name: prefix }).expect(400);
  await request(target).patch(endpoint + '/c' + 'a'.repeat(24)).set(auth).send({ name: prefix }).expect(404);
  await request(target).patch(`${endpoint}/${created.body.id}`).set(auth).send({ name: prefix + ' editada' }).expect(200);
  await request(target).delete(`${endpoint}/${created.body.id}`).set(auth).expect(200);
  await request(target).delete(`${endpoint}/${created.body.id}`).set(auth).expect(404);
  assert.deepEqual((await db.auditLog.findMany({ where: { entityId: created.body.id }, orderBy: { createdAt: 'asc' } })).map(item => item.action), ['CATEGORY_CREATED', 'CATEGORY_UPDATED', 'CATEGORY_DELETED']);
});
test('news can only choose existing categories; categories in use cannot be deleted', async () => {
  const target = app(), endpoint = '/api/v1/admin/categories';
  const created = await request(target).post(endpoint).set(auth).send({ name: prefix + ' noticias' }).expect(201); ids.push(created.body.id);
  const input = { title: 'Prueba de categorías', category: created.body.slug, summary: 'Resumen', content: 'Contenido', status: 'DRAFT' };
  const categoryScope = { slug: { startsWith: prefix } };
  const categoriesBefore = await db.category.count({ where: categoryScope });
  await request(target).post('/api/v1/admin/news').set(auth).send({ ...input, category: prefix + '-inexistente' }).expect(400);
  const news = await request(target).post('/api/v1/admin/news').set(auth).send(input).expect(201); newsIds.push(news.body.id);
  await request(target).patch('/api/v1/admin/news/' + news.body.id).set(auth).send({ ...input, category: prefix + '-inexistente' }).expect(400);
  assert.equal((await db.news.findUniqueOrThrow({ where: { id: news.body.id } })).categoryId, created.body.id);
  assert.equal(await db.category.count({ where: categoryScope }), categoriesBefore);
  const conflict = await request(target).delete(`${endpoint}/${created.body.id}`).set(auth).expect(409);
  assert.equal(conflict.body.error.code, 'CATEGORY_IN_USE');
  const renamed = await request(target).patch(`${endpoint}/${created.body.id}`).set(auth).send({ name: prefix + ' nueva' }).expect(200);
  const saved = await request(target).patch('/api/v1/admin/news/' + news.body.id).set(auth).send({ ...input, category: renamed.body.slug }).expect(200);
  assert.equal(saved.body.category.name, prefix + ' nueva');
  const categories = await request(target).get(endpoint + '?limit=100').set(auth).expect(200);
  assert.equal(categories.body.items.find((item: { id: string }) => item.id === created.body.id)._count.news, 1);
});
