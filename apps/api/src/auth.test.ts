import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import request from 'supertest';
import { db } from './db';
import { createApp } from './app';
import { hashToken } from './auth';
import { readEnvironment } from './env';

const prefix = 'oauth-test-' + randomUUID();
let googleIdentity = { sub: prefix, email: 'reader@example.edu', email_verified: true, name: 'Lectura' };
let calls = 0, googleFails = false;
const states: string[] = [];
const fetcher: typeof fetch = async (input, init) => {
  calls++;
  if (String(input) === 'https://oauth2.googleapis.com/token') {
    assert.ok(String(init?.body).includes('code_verifier='));
    return googleFails ? new Response(null, { status: 400 }) : Response.json({ access_token: 'google-secret-test-only' });
  }
  assert.equal(String(input), 'https://openidconnect.googleapis.com/v1/userinfo');
  return Response.json(googleIdentity);
};
const app = () => createApp(db, { adminAccessToken: 'k'.repeat(32), googleFetch: fetcher });
before(() => {
  Object.assign(process.env, { GOOGLE_LOGIN_ENABLED: 'true', GOOGLE_CLIENT_ID: 'test-client', GOOGLE_CLIENT_SECRET: 'test-secret', APP_PUBLIC_URL: 'http://localhost:8081', ADMIN_PUBLIC_URL: 'http://localhost:3001', GOOGLE_APP_ACCESS: 'institutional', ALLOWED_EMAIL_DOMAINS: 'example.edu', ADMIN_GOOGLE_EMAILS: 'admin@example.edu' });
});
after(async () => {
  const accounts = await db.account.findMany({ where: { googleSubject: { startsWith: prefix } } });
  await db.auditLog.deleteMany({ where: { entityId: { in: accounts.map(v => v.id) } } });
  await db.account.deleteMany({ where: { id: { in: accounts.map(v => v.id) } } });
  await db.oAuthAttempt.deleteMany({ where: { stateHash: { in: states } } });
  await db.$disconnect();
});
async function start(target = app(), purpose = 'app', extra = '') {
  const response = await request(target).get('/api/v1/auth/google/start?purpose=' + purpose + extra).expect(302);
  const url = new URL(response.headers.location), state = url.searchParams.get('state')!;
  states.push(hashToken(state));
  return { target, state, cookie: response.headers['set-cookie'][0].split(';')[0], url, response, purpose };
}
async function finish(flow: Awaited<ReturnType<typeof start>>, extra = '') {
  return request(flow.target).get('/api/v1/auth/google/callback?purpose=' + flow.purpose + '&state=' + flow.state + '&code=test&scope=openid%20email%20profile' + extra).set('Cookie', flow.cookie).expect(302);
}
const sessionToken = (response: { headers: Record<string, unknown> }, name: string) => (response.headers['set-cookie'] as string[]).find(v => v.startsWith(name + '='))!.split(';')[0].slice(name.length + 1);
test('config is explicit, disabled admin fails closed, startup rejects unsafe config', async () => {
  const result = await request(app()).get('/api/v1/auth/config').expect(200); assert.equal(result.body.enabled, true);
  process.env.ADMIN_GOOGLE_EMAILS = '';
  assert.equal((await request(app()).get('/api/v1/auth/config?purpose=admin')).body.enabled, false);
  await request(app()).get('/api/v1/auth/google/start?purpose=admin').expect(503);
  process.env.ADMIN_GOOGLE_EMAILS = 'admin@example.edu';
  const base = { DATABASE_URL: 'postgresql://u:p@db/app', ADMIN_ACCESS_TOKEN: 'k'.repeat(32) };
  for (const values of [{ GOOGLE_LOGIN_ENABLED: 'true' }, { ADMIN_PUBLIC_URL: 'https://attacker.invalid/admin' }, { ADMIN_GOOGLE_EMAILS: 'invalid' }, { ALLOWED_EMAIL_DOMAINS: '*.example.edu' }]) assert.throws(() => readEnvironment({ ...base, ...values }));
});
test('authorization uses PKCE, browser state, fixed callback and minimal login scopes', async () => {
  const flow = await start();
  assert.equal(flow.url.origin, 'https://accounts.google.com');
  assert.equal(flow.url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(flow.url.searchParams.get('scope'), 'openid email profile');
  assert.equal(flow.url.searchParams.get('redirect_uri'), 'http://localhost:8081/api/v1/auth/google/callback');
  assert.match(flow.response.headers['set-cookie'][0], /HttpOnly/); assert.match(flow.response.headers['set-cookie'][0], /SameSite=Lax/);
  assert.ok(!flow.url.href.includes('test-secret'));
  await request(app()).get('/api/v1/auth/google/start?redirect=https://attacker.invalid').expect(400);
});
test('state must match browser, purpose and expiry; callbacks cannot be reused', async () => {
  const flow = await start(), before = calls;
  const wrong = await request(flow.target).get('/api/v1/auth/google/callback?state=' + flow.state + '&code=test').expect(302);
  assert.equal(new URL(wrong.headers.location).searchParams.get('authResult'), 'invalid'); assert.equal(calls, before);
  await request(flow.target).get('/api/v1/auth/google/callback?purpose=admin&state=' + flow.state + '&code=test').set('Cookie', flow.cookie).expect(302);
  assert.equal(calls, before);
  const result = await finish(flow, '&redirect=https://attacker.invalid');
  assert.equal(new URL(result.headers.location).origin, 'http://localhost:8081');
  const count = calls; const replay = await finish(flow);
  assert.equal(new URL(replay.headers.location).searchParams.get('authResult'), 'invalid'); assert.equal(calls, count);
  const expired = await start(); await db.oAuthAttempt.update({ where: { stateHash: hashToken(expired.state) }, data: { expiresAt: new Date(0) } });
  assert.equal(new URL((await finish(expired)).headers.location).searchParams.get('authResult'), 'invalid');
});
test('web login persists identity without exposing tokens; app sessions cannot administer', async () => {
  const result = await finish(await start()), token = sessionToken(result, 'utn_app_session');
  assert.match(token, /^utn_s_/); assert.ok(!result.headers.location.includes(token)); assert.ok(!result.text.includes('google-secret'));
  const me = await request(app()).get('/api/v1/auth/me').set('Cookie', 'utn_app_session=' + token).expect(200);
  assert.equal(me.body.user.email, 'reader@example.edu'); assert.equal(me.body.user.role, 'USER'); assert.equal(me.body.token, undefined);
  await request(app()).get('/api/v1/admin/news').set('Authorization', 'Bearer ' + token).expect(401);
  await request(app()).get('/api/v1/auth/admin/me').set('Authorization', 'Bearer ' + token).expect(401);
  assert.equal((await db.authSession.findUnique({ where: { tokenHash: hashToken(token) } }))?.purpose, 'APP');
});
test('denies unverified emails, exact domain mismatches and unauthorized administrators', async () => {
  for (const values of [{ email_verified: false }, { email: 'reader@evil-example.edu' }, { email: 'reader@example.edu.attacker.invalid' }]) {
    googleIdentity = { sub: prefix, email: 'reader@example.edu', email_verified: true, name: 'Lectura', ...values };
    const result = await finish(await start()); assert.ok(['denied', 'failed'].includes(new URL(result.headers.location).searchParams.get('authResult')!)); assert.ok(!(result.headers['set-cookie'] as unknown as string[]).some(v => v.startsWith('utn_app_session=')));
  }
  googleIdentity = { sub: prefix, email: 'reader@example.edu', email_verified: true, name: 'Lectura' };
  const result = await finish(await start(app(), 'admin')); assert.equal(new URL(result.headers.location).searchParams.get('authResult'), 'denied');
});
test('admin allowlist is checked on every request, roles and blocked accounts are enforced', async () => {
  googleIdentity = { sub: prefix + '-admin', email: 'admin@example.edu', email_verified: true, name: 'Admin' };
  const flow = await start(app(), 'admin'); assert.equal(flow.url.searchParams.get('redirect_uri'), 'http://localhost:3001/admin/oauth/callback');
  const result = await finish(flow), token = sessionToken(result, 'utn_admin_oauth');
  assert.equal(new URL(result.headers.location).pathname, '/admin');
  await request(app()).get('/api/v1/admin/news').set('Authorization', 'Bearer ' + token).expect(200);
  const session = await db.authSession.findUniqueOrThrow({ where: { tokenHash: hashToken(token) } });
  await db.account.update({ where: { id: session.accountId }, data: { role: 'USER' } });
  await request(app()).get('/api/v1/admin/news').set('Authorization', 'Bearer ' + token).expect(401);
  await db.account.update({ where: { id: session.accountId }, data: { role: 'ADMIN', blocked: true } });
  await request(app()).get('/api/v1/admin/news').set('Authorization', 'Bearer ' + token).expect(401);
  assert.equal(new URL((await finish(await start(app(), 'admin'))).headers.location).searchParams.get('authResult'), 'denied');
  await db.account.update({ where: { id: session.accountId }, data: { blocked: false } });
  process.env.ADMIN_GOOGLE_EMAILS = 'different@example.edu';
  await request(app()).get('/api/v1/admin/news').set('Authorization', 'Bearer ' + token).expect(401);
  process.env.ADMIN_GOOGLE_EMAILS = 'admin@example.edu';
  await request(app()).post('/api/v1/auth/admin/logout').set('Authorization', 'Bearer ' + token).send({}).expect(204);
  await request(app()).get('/api/v1/admin/news').set('Authorization', 'Bearer ' + token).expect(401);
  googleIdentity = { sub: prefix, email: 'reader@example.edu', email_verified: true, name: 'Lectura' };
});
test('web logout rejects cross-origin CSRF and revokes the session; expired sessions fail', async () => {
  const token = sessionToken(await finish(await start()), 'utn_app_session');
  await request(app()).post('/api/v1/auth/logout').set('Cookie', 'utn_app_session=' + token).set('Origin', 'https://attacker.invalid').send({}).expect(403);
  await request(app()).get('/api/v1/auth/me').set('Authorization', 'Bearer ' + token).expect(200);
  await request(app()).post('/api/v1/auth/logout').set('Cookie', 'utn_app_session=' + token).set('Origin', 'http://localhost:8081').send({}).expect(204);
  await request(app()).get('/api/v1/auth/me').set('Authorization', 'Bearer ' + token).expect(401);
  const expired = sessionToken(await finish(await start()), 'utn_app_session');
  await db.authSession.update({ where: { tokenHash: hashToken(expired) }, data: { expiresAt: new Date(0) } });
  await request(app()).get('/api/v1/auth/me').set('Authorization', 'Bearer ' + expired).expect(401);
});
test('native handoff uses a fixed scheme, one-use ticket and a device PKCE verifier', async () => {
  const verifier = randomBytes(32).toString('base64url'), nativeState = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const flow = await start(app(), 'app', '&nativeChallenge=' + challenge + '&nativeState=' + nativeState);
  const result = await finish(flow), url = new URL(result.headers.location);
  assert.equal(url.protocol, 'utnfrba:'); assert.equal(url.hostname, 'account'); assert.equal(url.searchParams.get('nativeState'), nativeState);
  assert.equal(url.searchParams.has('token'), false); const ticket = url.searchParams.get('ticket')!;
  await request(app()).post('/api/v1/auth/native/exchange').send({ ticket, verifier: randomBytes(32).toString('base64url') }).expect(401);
  const exchange = await request(app()).post('/api/v1/auth/native/exchange').send({ ticket, verifier }).expect(200);
  await request(app()).post('/api/v1/auth/native/exchange').send({ ticket, verifier }).expect(401);
  await request(app()).get('/api/v1/auth/me').set('Authorization', 'Bearer ' + exchange.body.token).expect(200);
  await request(app()).get('/api/v1/admin/news').set('Authorization', 'Bearer ' + exchange.body.token).expect(401);
  await request(app()).post('/api/v1/auth/logout').set('Authorization', 'Bearer ' + exchange.body.token).send({}).expect(204);
  await request(app()).get('/api/v1/auth/me').set('Authorization', 'Bearer ' + exchange.body.token).expect(401);
});
test('cancelled consent and Google failures do not issue sessions or leak secrets', async () => {
  const flow = await start(); const before = calls;
  const cancelled = await request(flow.target).get('/api/v1/auth/google/callback?state=' + flow.state + '&error=access_denied').set('Cookie', flow.cookie).expect(302);
  assert.equal(new URL(cancelled.headers.location).searchParams.get('authResult'), 'cancelled'); assert.equal(calls, before);
  googleFails = true; const failed = await finish(await start()); googleFails = false;
  assert.equal(new URL(failed.headers.location).searchParams.get('authResult'), 'failed'); assert.ok(!failed.text.includes('test-secret'));
});
test('limits repeated login attempts', async () => {
  const target = app();
  for (let i = 0; i < 60; i++) await request(target).get('/api/v1/auth/google/start?redirect=https://attacker.invalid').expect(400);
  await request(target).get('/api/v1/auth/google/start?redirect=https://attacker.invalid').expect(429);
});
