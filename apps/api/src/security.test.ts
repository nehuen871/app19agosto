import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from './app';
import { readEnvironment } from './env';
import type { PrismaClient } from './generated/prisma/client';

const unavailable = { $queryRaw: async () => { throw new Error('database-secret'); } } as unknown as PrismaClient;
const token = 'a'.repeat(32);
function app() { return createApp(unavailable, { adminAccessToken: token }); }

test('liveness survives unavailable database and readiness fails without leaking errors', async () => {
  await request(app()).get('/health/live').expect(200);
  const ready = await request(app()).get('/health/ready').expect(503);
  assert.deepEqual(ready.body, { status: 'unavailable' });
});
test('protects administrative endpoints before database access', async () => {
  for (const header of ['', 'Bearer invalid', 'Bearer ' + token + 'extra']) {
    await request(app()).get('/api/v1/admin/notifications').set('Authorization', header).expect(401);
  }
});
test('rejects malformed, oversized and unsupported request bodies', async () => {
  const endpoint = '/api/v1/admin/notifications';
  await request(app()).post(endpoint).set('Content-Type', 'application/json').send('{').expect(400);
  await request(app()).post(endpoint).send({ body: 'x'.repeat(33000) }).expect(413);
  await request(app()).post(endpoint).set('Content-Type', 'text/plain').send('test').expect(415);
});
test('provides security headers and does not grant CORS access to unknown origins', async () => {
  const response = await request(app()).get('/health/live').set('Origin', 'https://attacker.invalid').expect(200);
  assert.equal(response.headers['access-control-allow-origin'], undefined);
  assert.equal(response.headers['x-powered-by'], undefined);
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.match(response.headers['x-request-id'], /^[a-f0-9-]{36}$/);
  const allowed = await request(app()).get('/health/live').set('Origin', 'http://localhost:3001');
  assert.equal(allowed.headers['access-control-allow-origin'], 'http://localhost:3001');
});
test('limits brute-force attempts on administrative routes', async () => {
  const target = app();
  for (let i = 0; i < 30; i++) await request(target).get('/api/v1/admin/notifications').expect(401);
  const response = await request(target).get('/api/v1/admin/notifications').expect(429);
  assert.equal(response.body.error.code, 'RATE_LIMIT');
});
test('rejects pagination abuse and injection values', async () => {
  for (const query of ['limit=100000', 'page=-1', 'page=1%20OR%201=1', 'featured=yes']) {
    await request(app()).get('/api/v1/news?' + query).expect(400);
  }
});
test('validates startup settings without echoing secret values', () => {
  assert.throws(() => readEnvironment({ DATABASE_URL: 'secret-invalid', ADMIN_ACCESS_TOKEN: 'secret-short' }), error => error instanceof Error && !error.message.includes('secret-'));
  const env = readEnvironment({ DATABASE_URL: 'postgresql://user:pass@db:5432/app', ADMIN_ACCESS_TOKEN: token });
  assert.equal(env.PORT, 4000);
  assert.equal(env.DB_POOL_MAX, 10);
  for (const values of [{ PORT: '0' }, { DB_POOL_MAX: '101' }, { CORS_ORIGINS: '*' }]) {
    assert.throws(() => readEnvironment({ DATABASE_URL: 'postgresql://user:pass@db:5432/app', ADMIN_ACCESS_TOKEN: token, ...values }));
  }
});
