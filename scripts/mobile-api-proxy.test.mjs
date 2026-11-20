import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createMobileApiProxy } from './mobile-api-proxy.mjs';
async function listen(handler) {
  const server = createServer(handler); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}
test('web proxy preserves OAuth redirects/cookies, callback and profile requests, and denies admin routes', async t => {
  const seen = [];
  const upstream = await listen((req, res) => {
    seen.push({ url: req.url, cookie: req.headers.cookie, origin: req.headers.origin, method: req.method });
    if (req.url.includes('/google/start')) { res.writeHead(302, { Location: 'https://accounts.google.com/o/oauth2/v2/auth', 'Set-Cookie': ['oauth=test; HttpOnly; Path=/api/v1/auth', 'second=test; HttpOnly; Path=/api/v1/auth'] }); res.end(); }
    else if (req.url.includes('/google/callback')) { res.writeHead(302, { Location: '/account?authResult=signed-in', 'Set-Cookie': 'session=test; HttpOnly; Path=/api/v1' }); res.end(); }
    else { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ enabled: true })); }
  });
  const proxy = await listen(createMobileApiProxy(upstream.url));
  t.after(() => { proxy.server.closeAllConnections(); proxy.server.close(); upstream.server.closeAllConnections(); upstream.server.close(); });
  assert.equal((await fetch(proxy.url + '/api/v1/auth/config')).headers.get('content-type'), 'application/json; charset=utf-8');
  const start = await fetch(proxy.url + '/api/v1/auth/google/start', { redirect: 'manual' });
  assert.equal(start.status, 302); assert.equal(start.headers.get('location'), 'https://accounts.google.com/o/oauth2/v2/auth'); assert.equal(start.headers.getSetCookie().length, 2);
  const callback = await fetch(proxy.url + '/api/v1/auth/google/callback?state=test&code=test', { redirect: 'manual', headers: { Cookie: 'oauth=test' } });
  assert.equal(callback.status, 302); assert.equal(callback.headers.get('location'), '/account?authResult=signed-in'); assert.match(callback.headers.get('set-cookie'), /session=test/); assert.equal(seen.at(-1).cookie, 'oauth=test');
  await fetch(proxy.url + '/api/v1/auth/me', { method: 'PATCH', headers: { Cookie: 'session=test', Origin: proxy.url, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Test' }) });
  assert.equal(seen.at(-1).origin, proxy.url); assert.equal(seen.at(-1).cookie, 'session=test'); assert.equal(seen.at(-1).method, 'PATCH');
  await fetch(proxy.url + '/api/v1/student', { headers: { Cookie: 'session=test' } });
  assert.equal(seen.at(-1).url, '/api/v1/student'); assert.equal(seen.at(-1).cookie, 'session=test');
  await fetch(proxy.url + '/api/v1/useful-links?page=2', { headers: { Cookie: 'session=test' } });
  assert.equal(seen.at(-1).url, '/api/v1/useful-links?page=2'); assert.equal(seen.at(-1).cookie, 'session=test');
  for (const [path, method] of [['/api/v1/student/plan', 'PUT'], ['/api/v1/student/courses/frba-sistemas-2023%3A1', 'PATCH']]) {
    await fetch(proxy.url + path, { method, headers: { Cookie: 'session=test', Origin: proxy.url, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'REGULAR' }) });
    assert.equal(seen.at(-1).method, method); assert.equal(seen.at(-1).origin, proxy.url); assert.equal(seen.at(-1).cookie, 'session=test'); assert.equal(seen.at(-1).url, path);
    const before = seen.length;
    assert.equal((await fetch(proxy.url + path, { method: 'POST' })).status, 405);
    assert.equal(seen.length, before);
  }
  const count = seen.length;
  for (const path of ['/api/v1/auth/admin/me', '/api/v1/admin/news', '/api/v1/auth/google/start?purpose=admin', '/api/unknown']) assert.equal((await fetch(proxy.url + path)).status, 404);
  assert.equal(seen.length, count);
});
