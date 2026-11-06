import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSessionClient, type SessionCredentials } from './session';
const old = { token: 'utn_s_' + 'a'.repeat(43), refreshToken: 'utn_r_' + 'a'.repeat(43) };
const fresh = { token: 'utn_s_' + 'b'.repeat(43), refreshToken: 'utn_r_' + 'b'.repeat(43) };
const baseUrl = 'https://api.example.test/api/v1';
function storage() {
  let value: SessionCredentials | null = old;
  return { load: async () => value, save: async (next: SessionCredentials) => { value = next; }, clear: async () => { value = null; } };
}
test('simultaneous API failures share a renewal, persist rotated credentials and retry with the new bearer', async () => {
  let renewals = 0;
  const client = createSessionClient({ baseUrl, storage: storage(), fetcher: async (input, options) => {
    if (String(input).endsWith('/auth/refresh')) { renewals++; await new Promise(resolve => setTimeout(resolve, 10)); return Response.json(fresh); }
    return new Headers(options?.headers).get('Authorization') === 'Bearer ' + fresh.token ? Response.json({ ok: true }) : new Response(null, { status: 401 });
  } });
  const results = await Promise.all(['/news', '/events'].map(path => client.fetch(baseUrl + path)));
  assert.deepEqual(results.map(result => result.status), [200, 200]); assert.equal(renewals, 1);
  assert.deepEqual(await client.credentials(), fresh);
  assert.deepEqual(client.headersFor(baseUrl + '/media/example'), { Authorization: 'Bearer ' + fresh.token });
  assert.equal(client.headersFor('https://external.example/image.jpg'), undefined);
});
test('temporary renewal failures retain credentials while invalid refresh clears the session', async () => {
  let status = 503, expired = 0;
  const client = createSessionClient({ baseUrl, storage: storage(), fetcher: async input => new Response(null, { status: String(input).endsWith('/auth/refresh') ? status : 401 }) });
  client.subscribe(() => { expired++; });
  await assert.rejects(client.fetch(baseUrl + '/news'));
  assert.deepEqual(await client.credentials(), old); assert.equal(expired, 0);
  status = 401; assert.equal((await client.fetch(baseUrl + '/news')).status, 401);
  assert.equal(await client.credentials(), null); assert.equal(expired, 1);
});
test('a response arriving after logout cannot restore the old session; credentials never go to another origin', async () => {
  let release: (() => void) | undefined;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const client = createSessionClient({ baseUrl, storage: storage(), fetcher: async input => {
    if (String(input).endsWith('/auth/refresh')) { await gate; return Response.json(fresh); }
    return new Response(null, { status: 401 });
  } });
  await assert.rejects(client.fetch('https://attacker.test/news'));
  const result = client.fetch(baseUrl + '/news'); await new Promise(resolve => setTimeout(resolve, 5)); await client.clear(); release!(); await result;
  assert.equal(await client.credentials(), null);
});

test('browser tabs serialize cookie renewal and never persist or expose cookie tokens', async () => {
  let cookieFresh = false, renewals = 0;
  let queue = Promise.resolve();
  const exclusive = (action: () => Promise<boolean>) => {
    const next = queue.then(action);
    queue = next.then(() => undefined, () => undefined); return next;
  };
  const fetcher: typeof fetch = async input => {
    if (String(input).endsWith('/auth/refresh')) { renewals++; await new Promise(resolve => setTimeout(resolve, 10)); cookieFresh = true; return Response.json({}); }
    return new Response(null, { status: cookieFresh ? 200 : 401 });
  };
  const browserStorage = { load: async () => null, save: async () => { assert.fail('Browser must not persist tokens in JavaScript'); }, clear: async () => {} };
  const tabs = [1, 2].map(() => createSessionClient({ baseUrl, storage: browserStorage, fetcher, exclusive }));
  assert.deepEqual((await Promise.all(tabs.map(tab => tab.fetch(baseUrl + '/news')))).map(result => result.status), [200, 200]);
  assert.equal(renewals, 1);
});
