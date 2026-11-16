import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadAdminLoginConfig } from './login-config';
import { AdminSessionExpired, authenticateAdminSession } from './admin-authentication';

test('login configuration can be retried after a transient failure', async () => {
  let attempts = 0;
  const fetcher: typeof fetch = async (url, options) => {
    assert.equal(url, '/admin/oauth/config');
    assert.equal(options?.cache, 'no-store');
    assert.ok(options?.signal);
    return ++attempts === 1 ? new Response(null, { status: 503 }) : Response.json({ enabled: true });
  };
  await assert.rejects(loadAdminLoginConfig(fetcher));
  assert.equal(await loadAdminLoginConfig(fetcher), true);
});

test('expired sessions do not prevent querying public login configuration', async () => {
  const fetcher: typeof fetch = async url => String(url).endsWith('/auth/admin/me')
    ? new Response(null, { status: 401 })
    : Response.json({ enabled: true });
  await assert.rejects(authenticateAdminSession('utn_s_' + 'a'.repeat(43), 'http://api:4000/api/v1', fetcher), AdminSessionExpired);
  assert.equal(await loadAdminLoginConfig(fetcher), true);
  assert.equal(await loadAdminLoginConfig(async () => Response.json({ enabled: false })), false);
  for (const config of [null, {}, { enabled: 'true' }]) {
    await assert.rejects(loadAdminLoginConfig(async () => Response.json(config)));
  }
});

test('a timed out configuration request can be retried', async () => {
  await assert.rejects(loadAdminLoginConfig(async () => { throw new DOMException('Timed out', 'TimeoutError'); }));
  assert.equal(await loadAdminLoginConfig(async () => Response.json({ enabled: true })), true);
});
