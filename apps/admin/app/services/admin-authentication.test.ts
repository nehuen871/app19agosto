import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AdminSessionExpired, authenticateAdminSession } from './admin-authentication';
const url = 'http://api:4000/api/v1';
const oauth = 'utn_s_' + 'a'.repeat(43);
const response = (status: number): typeof fetch => async () => new Response(null, { status });
test('rejects absent sessions and legacy shared keys without calling the API', async () => {
  for (const value of [undefined, 'k'.repeat(32), '9999999999.legacy-signature', 'invalid']) {
    await assert.rejects(authenticateAdminSession(value, url, async () => { assert.fail('Must reject locally'); }), AdminSessionExpired);
  }
});
test('only accepts API-validated OAuth admin sessions', async () => {
  assert.equal(await authenticateAdminSession(oauth, url, response(200)), oauth);
  for (const status of [401, 403]) await assert.rejects(authenticateAdminSession(oauth, url, response(status)), AdminSessionExpired);
});
test('temporary failures are not treated as expired sessions', async () => {
  for (const status of [429, 500, 503]) await assert.rejects(authenticateAdminSession(oauth, url, response(status)), error => error instanceof Error && !(error instanceof AdminSessionExpired));
  await assert.rejects(authenticateAdminSession(oauth, url, async () => { throw new Error('secret'); }), error => error instanceof Error && !(error instanceof AdminSessionExpired) && !error.message.includes('secret'));
});
