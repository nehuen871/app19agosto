import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { db } from './db';
import { createApp } from './app';
import { createTestAdmin, removeTestAdmin, testAdminToken } from './test-admin';
const token = testAdminToken(), prefix = 'tree-' + randomUUID(), auth = { Authorization: `Bearer ${token}` };
const categoryIds: string[] = [], newsIds: string[] = [];
before(async () => { await createTestAdmin(db, token); });
after(async () => {
  await db.news.deleteMany({ where: { id: { in: newsIds } } });
  await db.category.updateMany({ where: { id: { in: categoryIds } }, data: { parentId: null } });
  await db.category.deleteMany({ where: { id: { in: categoryIds } } });
  await db.auditLog.deleteMany({ where: { entityId: { in: [...categoryIds, ...newsIds] } } });
  await removeTestAdmin(db, token); await db.$disconnect();
});
test('nested categories filter all descendants without including sibling branches', async () => {
  const app = createApp(db), endpoint = '/api/v1/admin/categories';
  async function category(suffix: string, parentId: string | null = null) {
    const response = await request(app).post(endpoint).set(auth).send({ name: prefix + suffix, parentId }).expect(201);
    categoryIds.push(response.body.id); return response.body;
  }
  const root = await category('-root'), child = await category('-child', root.id), leaf = await category('-leaf', child.id), sibling = await category('-sibling', root.id);
  for (const category of [root, child, leaf, sibling]) {
    const result = await request(app).post('/api/v1/admin/news').set(auth).send({ title: category.name, category: category.slug, summary: 'Resumen', content: 'Contenido', status: 'PUBLISHED' }).expect(201);
    newsIds.push(result.body.id);
  }
  for (const [category, expected] of [[root, 4], [child, 2], [leaf, 1], [sibling, 1]] as const) {
    const response = await request(app).get('/api/v1/news?category=' + category.slug).set(auth).expect(200);
    assert.equal(response.body.total, expected);
  }
  const failed = await request(app).patch(`${endpoint}/${root.id}`).set(auth).send({ name: root.name, parentId: leaf.id }).expect(400);
  assert.equal(failed.body.error.code, 'INVALID_PARENT');
  await request(app).patch(`${endpoint}/${child.id}`).set(auth).send({ name: child.name, parentId: child.id }).expect(400);
  await request(app).post(endpoint).set(auth).send({ name: prefix + '-missing', parentId: 'c' + 'a'.repeat(24) }).expect(400);
  await request(app).delete(`${endpoint}/${root.id}`).set(auth).expect(409);
  await request(app).patch(`${endpoint}/${leaf.id}`).set(auth).send({ name: leaf.name, parentId: sibling.id }).expect(200);
  const moved = await request(app).get('/api/v1/news?category=' + sibling.slug + '&featured=false').set(auth).expect(200);
  assert.equal(moved.body.total, 2);
  const preserved = await request(app).get('/api/v1/news/' + (await db.news.findUniqueOrThrow({ where: { id: newsIds[2] } })).slug).set(auth).expect(200);
  assert.equal(preserved.body.category.parentId, sibling.id);
});
test('concurrent reciprocal reparenting cannot create a category cycle', async () => {
  const app = createApp(db), endpoint = '/api/v1/admin/categories';
  const nodes = await Promise.all(['-a', '-b'].map(async suffix => {
    const response = await request(app).post(endpoint).set(auth).send({ name: prefix + suffix }).expect(201); categoryIds.push(response.body.id); return response.body;
  }));
  const results = await Promise.all(nodes.map((node, index) => request(app).patch(`${endpoint}/${node.id}`).set(auth).send({ name: node.name, parentId: nodes[1 - index].id })));
  assert.deepEqual(results.map(result => result.status).sort(), [200, 400]);
});
