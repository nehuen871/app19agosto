import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { db } from './db';
import { createApp } from './app';
import { hashToken } from './auth';
import { createTestAdmin, removeTestAdmin, testAdminToken } from './test-admin';
const app = createApp(db), adminToken = testAdminToken(), prefix = 'renewal-' + randomUUID();
let accountId: string;
async function family() {
  const token = testAdminToken(), refreshToken = 'utn_r_' + testAdminToken().slice(6), familyId = randomUUID();
  const expiresAt = new Date(Date.now() + 86400000);
  await db.authSession.create({ data: { tokenHash: hashToken(token), accountId, purpose: 'APP', familyId, expiresAt: new Date(Date.now() - 1000) } });
  await db.authRefreshToken.create({ data: { tokenHash: hashToken(refreshToken), accountId, familyId, expiresAt } });
  return { token, refreshToken, familyId, expiresAt };
}
before(async () => {
  process.env.GOOGLE_APP_ACCESS = 'verified'; process.env.APP_PUBLIC_URL = 'http://localhost:8081';
  await createTestAdmin(db, adminToken);
  accountId = (await db.account.create({ data: { googleSubject: prefix, email: 'reader@example.test', name: 'Lectura' } })).id;
});
after(async () => { await db.account.deleteMany({ where: { googleSubject: prefix } }); await removeTestAdmin(db, adminToken); await db.$disconnect(); });
test('content endpoints reject missing credentials; app sessions cannot access administration', async () => {
  for (const path of ['/news', '/news/test', '/categories', '/events?month=2030-01', '/media/00000000-0000-4000-8000-000000000001']) {
    await request(app).get('/api/v1' + path).expect(401);
    await request(app).get('/api/v1' + path).set('Authorization', 'Bearer forged').expect(401);
  }
  const f = await family();
  await request(app).get('/api/v1/news').set('Authorization', `Bearer ${f.token}`).expect(401);
  const renewed = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: f.refreshToken }).expect(200);
  assert.ok(new Date(renewed.body.expiresAt).getTime() <= Date.now() + 15 * 60000);
  assert.equal(new Date(renewed.body.refreshExpiresAt).getTime(), f.expiresAt.getTime());
  for (const path of ['/news', '/categories', '/events?month=2030-01']) {
    const result = await request(app).get('/api/v1' + path).set('Authorization', `Bearer ${renewed.body.token}`).expect(200);
    assert.equal(result.headers['cache-control'], 'private, no-store');
  }
  await request(app).get('/api/v1/admin/news').set('Authorization', `Bearer ${renewed.body.token}`).expect(401);
  await request(app).get('/api/v1/news').set('Authorization', `Bearer ${adminToken}`).expect(200);
});
test('rotation rejects old refresh tokens and revokes the whole affected family on reuse', async () => {
  const f = await family();
  const first = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: f.refreshToken }).expect(200);
  assert.notEqual(first.body.refreshToken, f.refreshToken);
  await request(app).post('/api/v1/auth/refresh').send({ refreshToken: f.refreshToken }).expect(401);
  await request(app).get('/api/v1/news').set('Authorization', `Bearer ${first.body.token}`).expect(401);
  await request(app).post('/api/v1/auth/refresh').send({ refreshToken: first.body.refreshToken }).expect(401);
});
test('browser refresh is CSRF protected, returns HttpOnly cookies and does not expose tokens in JSON', async () => {
  const f = await family(), cookie = 'utn_app_refresh=' + f.refreshToken;
  await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie).set('Origin', 'https://attacker.invalid').send({}).expect(403);
  await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie).send({}).expect(403);
  const result = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie).set('Origin', 'http://localhost:8081').send({}).expect(200);
  assert.equal(result.body.token, undefined); assert.equal(result.body.refreshToken, undefined);
  const cookies = result.headers['set-cookie'] as unknown as string[];
  assert.ok(cookies.some(value => value.startsWith('utn_app_refresh=') && value.includes('HttpOnly') && value.includes('Path=/api/v1/auth')));
  const accessCookie = cookies.slice().reverse().find(value => value.startsWith('utn_app_session='))!.split(';')[0];
  await request(app).get('/api/v1/events?month=2030-01').set('Cookie', accessCookie).expect(200);
});
test('blocked, expired, forged and mass-assigned refresh requests fail closed', async () => {
  const f = await family();
  await request(app).post('/api/v1/auth/refresh').send({ refreshToken: f.refreshToken, accountId, role: 'ADMIN' }).expect(400);
  await request(app).post('/api/v1/auth/refresh').send({ refreshToken: 'forged' }).expect(400);
  await db.account.update({ where: { id: accountId }, data: { blocked: true } });
  await request(app).post('/api/v1/auth/refresh').send({ refreshToken: f.refreshToken }).expect(401);
  await db.account.update({ where: { id: accountId }, data: { blocked: false } });
  const expired = await family(); await db.authRefreshToken.update({ where: { tokenHash: hashToken(expired.refreshToken) }, data: { expiresAt: new Date(0) } });
  await request(app).post('/api/v1/auth/refresh').send({ refreshToken: expired.refreshToken }).expect(401);
});
test('concurrent reuse allows one rotation only and logout revokes the refresh family', async () => {
  const f = await family();
  const responses = await Promise.all([1, 2].map(() => request(app).post('/api/v1/auth/refresh').send({ refreshToken: f.refreshToken })));
  assert.deepEqual(responses.map(value => value.status).sort(), [200, 401]);
  const own = await family();
  const fresh = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: own.refreshToken }).expect(200);
  await request(app).post('/api/v1/auth/logout').set('Authorization', `Bearer ${fresh.body.token}`).send({ refreshToken: fresh.body.refreshToken }).expect(204);
  await request(app).post('/api/v1/auth/refresh').send({ refreshToken: fresh.body.refreshToken }).expect(401);
});
