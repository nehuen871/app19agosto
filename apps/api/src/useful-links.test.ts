import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { db } from './db';
import { createApp } from './app';
import { hashToken } from './auth';
import { createTestAdmin, removeTestAdmin, testAdminToken } from './test-admin';
const admin = testAdminToken(), reader = testAdminToken(), prefix = 'links-' + randomUUID(), endpoint = '/api/v1/admin/useful-links';
let imageId: string, readerId: string;
const ids: string[] = [];
const input = () => ({ title: prefix, description: 'Recursos para estudiantes', url: 'https://frba.utn.edu.ar/', imageId, priority: 100, featured: false, published: false });
before(async () => {
  process.env.GOOGLE_APP_ACCESS = 'verified';
  await createTestAdmin(db, admin);
  readerId = (await db.account.create({ data: { googleSubject: prefix, email: 'reader@example.test', name: 'Lector' } })).id;
  await db.authSession.create({ data: { accountId: readerId, tokenHash: hashToken(reader), purpose: 'APP', expiresAt: new Date(Date.now() + 3600000) } });
  imageId = (await db.mediaImage.create({ data: { mimeType: 'image/png', byteSize: 1, data: Buffer.from([1]) } })).id;
});
after(async () => {
  await db.auditLog.deleteMany({ where: { entityId: { in: ids } } });
  await db.usefulLink.deleteMany({ where: { id: { in: ids } } });
  await db.mediaImage.delete({ where: { id: imageId } });
  await db.account.delete({ where: { id: readerId } }); await removeTestAdmin(db, admin); await db.$disconnect();
});
test('links and mutations require valid sessions; reader sessions cannot administer links', async () => {
  const app = createApp(db);
  await request(app).get('/api/v1/useful-links').expect(401);
  for (const method of ['get', 'post', 'patch', 'delete'] as const) {
    const path = ['get', 'post'].includes(method) ? endpoint : `${endpoint}/${randomUUID()}`;
    await request(app)[method](path).set('Authorization', `Bearer ${reader}`).send(input()).expect(401);
    await request(app)[method](path).send(input()).expect(401);
  }
});
test('strict fields, bounded input, image references and safe external URL schemes are enforced', async () => {
  const app = createApp(db), auth = { Authorization: `Bearer ${admin}` };
  for (const url of ['javascript:alert(1)', 'data:text/html,hi', 'file:///etc/passwd', 'intent://open', 'ftp://example.com', 'https://user:secret@example.com', 'not a URL']) await request(app).post(endpoint).set(auth).send({ ...input(), url }).expect(400);
  for (const fields of [{ id: randomUUID() }, { accountId: readerId }, { title: '' }, { title: 'x'.repeat(121) }, { description: 'x'.repeat(501) }, { priority: 0 }, { priority: 10000 }, { priority: 1.5 }, { imageId: randomUUID() }, { imageId: null }]) await request(app).post(endpoint).set(auth).send({ ...input(), ...fields }).expect(400);
  await request(app).get(endpoint + '?limit=101').set(auth).expect(400);
  await request(app).get('/api/v1/useful-links?page=0').set('Authorization', `Bearer ${reader}`).expect(400);
});
test('featured links come first across pagination, with importance order within each group; drafts stay private', async () => {
  const app = createApp(db), auth = { Authorization: `Bearer ${admin}` };
  for (const [priority, featured, published] of [[1, false, true], [2, true, true], [3, false, true], [1, true, false]] as const) {
    const result = await request(app).post(endpoint).set(auth).send({ ...input(), priority, featured, published }).expect(201); ids.push(result.body.id);
    assert.match(result.body.id, /^[a-f\d-]{36}$/);
  }
  const response = await request(app).get('/api/v1/useful-links?limit=2').set('Authorization', `Bearer ${reader}`).expect(200);
  assert.match(response.headers['cache-control'], /private.*no-store/);
  assert.equal(response.body.total, 3); assert.deepEqual(response.body.items.map((i: { priority: number }) => i.priority), [2, 1]);
  assert.equal(response.body.items[0].featured, true); assert.equal(response.body.items[1].featured, false); assert.equal(response.body.items[0].imageUrl, `/api/v1/media/${imageId}`);
  const featuredPage = await request(app).get('/api/v1/useful-links?limit=1').set('Authorization', `Bearer ${reader}`).expect(200);
  assert.equal(featuredPage.body.items[0].featured, true);
  const second = await request(app).get('/api/v1/useful-links?limit=2&page=2').set('Authorization', `Bearer ${reader}`).expect(200); assert.equal(second.body.items[0].priority, 3);
  assert.equal((await request(app).get(endpoint).set(auth).expect(200)).body.total, 4);
  assert.equal(await db.auditLog.count({ where: { entityId: { in: ids }, action: 'USEFUL_LINK_CREATED' } }), 4);
});
test('updates persist, concurrent stale edits conflict and deletion hides records while keeping an audit trail', async () => {
  const app = createApp(db), auth = { Authorization: `Bearer ${admin}` }, id = ids[0];
  const original = await db.usefulLink.findUniqueOrThrow({ where: { id } });
  const body = { ...input(), published: true, priority: 4, expectedUpdatedAt: original.updatedAt.toISOString() };
  const results = await Promise.all([request(app).patch(`${endpoint}/${id}`).set(auth).send(body), request(app).patch(`${endpoint}/${id}`).set(auth).send({ ...body, title: prefix + ' editado' })]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
  const saved = results.find(r => r.status === 200)!.body;
  await request(app).delete(`${endpoint}/${id}`).set(auth).send({ expectedUpdatedAt: body.expectedUpdatedAt }).expect(409);
  await request(app).delete(`${endpoint}/${id}`).set(auth).send({ expectedUpdatedAt: saved.updatedAt }).expect(200);
  assert.ok((await db.usefulLink.findUniqueOrThrow({ where: { id } })).deletedAt);
  const shown = await request(app).get('/api/v1/useful-links').set('Authorization', `Bearer ${reader}`).expect(200);
  assert.ok(!shown.body.items.some((i: { id: string }) => i.id === id));
  assert.ok(await db.auditLog.findFirst({ where: { entityId: id, action: 'USEFUL_LINK_DELETED' } }));
});
test('blocked and expired readers cannot access the links catalog', async () => {
  const app = createApp(db);
  await db.account.update({ where: { id: readerId }, data: { blocked: true } });
  await request(app).get('/api/v1/useful-links').set('Authorization', `Bearer ${reader}`).expect(401);
  await db.account.update({ where: { id: readerId }, data: { blocked: false } });
  await db.authSession.update({ where: { tokenHash: hashToken(reader) }, data: { expiresAt: new Date(0) } });
  await request(app).get('/api/v1/useful-links').set('Authorization', `Bearer ${reader}`).expect(401);
});
