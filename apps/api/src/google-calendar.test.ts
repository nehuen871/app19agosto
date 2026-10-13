import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { db } from './db';
import { createApp } from './app';
let eventId: string;
const calls: { url: string; body?: unknown }[] = [];
let insertStatus = 200;
const fetcher: typeof fetch = async (input, init) => {
  const url = String(input); calls.push({ url, body: init?.body });
  if (url === 'https://oauth2.googleapis.com/token') return Response.json({ access_token: 'test-token-only' });
  if (url === 'https://openidconnect.googleapis.com/v1/userinfo') return Response.json({ sub: 'test-google-account' });
  assert.ok(url.startsWith('https://www.googleapis.com/calendar/v3/calendars/primary/events'));
  return Response.json({}, { status: insertStatus });
};
const app = createApp(db, { adminAccessToken: randomUUID(), googleFetch: fetcher });
before(async () => {
  process.env.GOOGLE_CLIENT_ID = 'test-client'; process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
  process.env.GOOGLE_REDIRECT_URI = 'http://localhost:8081/api/v1/google-calendar/callback'; process.env.APP_PUBLIC_URL = 'http://localhost:8081';
  eventId = (await db.calendarEvent.create({ data: { title: 'OAuth event', description: 'Test', location: 'Campus', startsAt: new Date('2035-01-01T15:00:00Z'), endsAt: new Date('2035-01-01T16:00:00Z'), status: 'PUBLISHED' } })).id;
});
after(async () => { await db.auditLog.deleteMany({ where: { entityId: eventId } }); await db.calendarEvent.delete({ where: { id: eventId } }); await db.$disconnect(); });
async function start() {
  const response = await request(app).get('/api/v1/google-calendar/start?eventId=' + eventId).expect(302);
  const url = new URL(response.headers.location);
  return { response, url, state: url.searchParams.get('state')!, cookie: response.headers['set-cookie'][0].split(';')[0] };
}
test('Google OAuth start uses PKCE, a browser-bound expiring HttpOnly cookie and a fixed redirect', async () => {
  const config = await request(app).get('/api/v1/google-calendar/config').expect(200);
  assert.equal(config.body.startUrl, 'http://localhost:8081/api/v1/google-calendar/start');
  const { response, url } = await start();
  assert.equal(url.origin, 'https://accounts.google.com'); assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(url.searchParams.get('redirect_uri'), process.env.GOOGLE_REDIRECT_URI); assert.ok(!url.searchParams.has('client_secret'));
  assert.match(response.headers['set-cookie'][0], /HttpOnly/); assert.match(response.headers['set-cookie'][0], /SameSite=Lax/);
  await request(app).get('/api/v1/google-calendar/start?eventId=' + randomUUID()).expect(404);
});
test('rejects callback without the matching browser state and performs no Google calls', async () => {
  const { state } = await start();
  const response = await request(app).get('/api/v1/google-calendar/callback?state=' + state + '&code=test').expect(302);
  assert.equal(new URL(response.headers.location).searchParams.get('googleResult'), 'invalid'); assert.equal(calls.length, 0);
});
test('authorized acceptance creates a Google event once with correct dates and no token leakage', async () => {
  const { state, cookie } = await start();
  const response = await request(app).get('/api/v1/google-calendar/callback?state=' + state + '&code=test').set('Cookie', cookie).expect(302);
  assert.equal(new URL(response.headers.location).searchParams.get('googleResult'), 'saved');
  const payload = JSON.parse(String(calls.at(-1)?.body));
  assert.equal(payload.summary, 'OAuth event'); assert.equal(payload.start.dateTime, '2035-01-01T15:00:00.000Z');
  assert.match(payload.id, /^[a-f0-9]{64}$/); assert.ok(!response.text.includes('test-token-only'));
  const count = calls.length;
  const replay = await request(app).get('/api/v1/google-calendar/callback?state=' + state + '&code=test').set('Cookie', cookie).expect(302);
  assert.equal(new URL(replay.headers.location).searchParams.get('googleResult'), 'invalid'); assert.equal(calls.length, count);
  const next = await start(); insertStatus = 409;
  const repeated = await request(app).get('/api/v1/google-calendar/callback?state=' + next.state + '&code=test').set('Cookie', next.cookie).expect(302);
  assert.equal(new URL(repeated.headers.location).searchParams.get('googleResult'), 'exists');
  assert.equal(JSON.parse(String(calls.at(-1)?.body)).id, payload.id);
});
test('denied consent never creates an event and returns to a fixed app URL', async () => {
  const { state, cookie } = await start(), count = calls.length;
  const response = await request(app).get('/api/v1/google-calendar/callback?state=' + state + '&error=access_denied&redirect=https://attacker.invalid').set('Cookie', cookie).expect(302);
  const url = new URL(response.headers.location); assert.equal(url.origin, 'http://localhost:8081'); assert.equal(url.searchParams.get('googleResult'), 'cancelled'); assert.equal(calls.length, count);
});
