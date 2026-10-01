import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { db } from './db';
import { createApp } from './app';
import { newsQuery } from '@utn/validation';
const app = createApp(db);
const prefix = `test-${randomUUID()}`;
let categoryId: string;
before(async () => {
  const category = await db.category.create({ data: { name: 'Test', slug: prefix } });
  categoryId = category.id;
  for (const [suffix, status, date] of [
    ['published', 'PUBLISHED', new Date('2020-01-01')],
    ['draft', 'DRAFT', null],
    ['archived', 'ARCHIVED', new Date('2020-01-01')],
    ['future', 'PUBLISHED', new Date('2099-01-01')],
  ] as const) await db.news.create({ data: { title: suffix, slug: `${prefix}-${suffix}`, summary: 'Summary', content: 'Content', categoryId, status, publishedAt: date } });
});
after(async () => {
  if (categoryId) { await db.news.deleteMany({ where: { categoryId } }); await db.category.delete({ where: { id: categoryId } }); }
  await db.$disconnect();
});
test('validates bounds and boolean filters', () => {
  for (const input of [{ page: 0 }, { limit: 101 }, { featured: 'yes' }, { page: 1.5 }]) assert.equal(newsQuery.safeParse(input).success, false);
  assert.equal(newsQuery.parse({ featured: 'false' }).featured, false);
});
test('lists only published, non-future news with pagination and category filter', async () => {
  const response = await request(app).get(`/api/v1/news?category=${prefix}&limit=1`).expect(200);
  assert.equal(response.body.total, 1);
  assert.equal(response.body.items[0].slug, `${prefix}-published`);
  const second = await request(app).get(`/api/v1/news?category=${prefix}&limit=1&page=2`).expect(200);
  assert.deepEqual(second.body.items, []);
});
test('hides drafts, archived and future news by slug', async () => {
  for (const suffix of ['draft', 'archived', 'future', 'missing']) await request(app).get(`/api/v1/news/${prefix}-${suffix}`).expect(404);
  await request(app).get(`/api/v1/news/${prefix}-published`).expect(200);
});
test('returns normalized validation and not-found errors', async () => {
  const response = await request(app).get('/api/v1/news?limit=200').expect(400);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  const missing = await request(app).get('/api/v1/admin/users').expect(404);
  assert.equal(missing.body.error.code, 'NOT_FOUND');
});
test('health checks the database', async () => { await request(app).get('/health').expect(200); });
