import { createTestAdmin, removeTestAdmin, testAdminToken } from './test-admin';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { db } from './db';
import { createApp } from './app';
const token = testAdminToken();
const app = createApp(db);
const prefix = `test-${randomUUID()}`;
const ids: string[] = [];
const input = { title: 'Noticia', slug: prefix, summary: 'Resumen', content: '<script>Texto literal</script>', category: prefix };
before(async () => { await createTestAdmin(db, token); });
after(async () => {
  await db.auditLog.deleteMany({ where: { entityId: { in: ids } } });
  await db.news.deleteMany({ where: { id: { in: ids } } });
  await db.category.deleteMany({ where: { slug: prefix } });
  await removeTestAdmin(db, token);
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
  await request(app).get(`/api/v1/news/${prefix}`).set('Authorization', `Bearer ${token}`).expect(404);
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
  const detail = await request(app).get(`/api/v1/news/${prefix}-published`).set('Authorization', `Bearer ${token}`).expect(200);
  assert.equal(detail.body.content, input.content);
  assert.equal(await db.notification.count({ where: { newsId: response.body.id } }), 0);
  const list = await request(app).get('/api/v1/admin/news').set('Authorization', `Bearer ${token}`).expect(200);
  assert.ok(list.body.items.some((news: { id: string }) => news.id === response.body.id));
});

test('Word-style summaries preserve links, indentation and lists through create, edit and read', async () => {
  const doc = { type: 'doc', content: [{ type: 'paragraph', attrs: { indent: 2, textAlign: 'center' }, content: [{ type: 'text', text: 'Inscripciones', marks: [{ type: 'bold' }, { type: 'link', attrs: { href: 'https://frba.utn.edu.ar/', title: null } }] }] }, { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Fechas disponibles' }] }] }] }] };
  const summary = '@utn/rich-text:1:' + JSON.stringify(doc), slug = `${prefix}-rich`;
  const created = await request(app).post('/api/v1/admin/news').set('Authorization', `Bearer ${token}`).send({ ...input, slug, summary, status: 'PUBLISHED' }).expect(201);
  ids.push(created.body.id);
  assert.match(created.body.summary, /noopener noreferrer nofollow/);
  const publicNews = await request(app).get(`/api/v1/news/${slug}`).set('Authorization', `Bearer ${token}`).expect(200);
  assert.equal(publicNews.body.summary, created.body.summary);
  const endpoint = `/api/v1/admin/news/${created.body.id}`;
  await request(app).patch(endpoint).set('Authorization', `Bearer ${token}`).send({ ...input, slug, summary: summary.replace('https://frba.utn.edu.ar/', 'javascript:alert(1)'), status: 'PUBLISHED' }).expect(400);
  const edited = await request(app).patch(endpoint).set('Authorization', `Bearer ${token}`).send({ ...input, slug, summary: summary.replace('Inscripciones', 'Nueva fecha'), status: 'PUBLISHED' }).expect(200);
  assert.match(edited.body.summary, /Nueva fecha/);
});

test('rich content preserves formatting and its 20000 character limit without reducing JSON protection elsewhere', async () => {
  const content = '@utn/rich-text:1:' + JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', attrs: { indent: 1 }, content: [{ type: 'text', text: 'á'.repeat(20000), marks: [{ type: 'bold' }, { type: 'link', attrs: { href: 'https://frba.utn.edu.ar/', title: null } }] }] }] });
  const slug = `${prefix}-content`;
  const response = await request(app).post('/api/v1/admin/news').set('Authorization', `Bearer ${token}`).send({ ...input, slug, content, status: 'PUBLISHED' }).expect(201);
  ids.push(response.body.id);
  const read = await request(app).get(`/api/v1/news/${slug}`).set('Authorization', `Bearer ${token}`).expect(200);
  assert.equal(read.body.content, response.body.content);
  assert.match(read.body.content, /noopener noreferrer nofollow/);
  await request(app).patch(`/api/v1/admin/news/${response.body.id}`).set('Authorization', `Bearer ${token}`).send({ ...input, slug, content: 'a'.repeat(20001), status: 'PUBLISHED' }).expect(400);
  await request(app).post('/api/v1/admin/news').set('Authorization', `Bearer ${token}`).send({ ...input, content: 'a'.repeat(600000) }).expect(413);
});
