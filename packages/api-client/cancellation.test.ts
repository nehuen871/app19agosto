import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApiClient } from './index';

test('public requests propagate cancellation to fetch and release listeners', async () => {
  const original = globalThis.fetch;
  let requestSignal: AbortSignal | undefined;
  globalThis.fetch = async (_url, options) => {
    requestSignal = options?.signal ?? undefined;
    return new Promise((_resolve, reject) => {
      const abort = () => reject(new DOMException('Cancelled', 'AbortError'));
      if (requestSignal?.aborted) abort();
      else requestSignal?.addEventListener('abort', abort, { once: true });
    });
  };
  try {
    const client = createApiClient('https://example.test/api/v1');
    for (const request of [(signal: AbortSignal) => client.news(1, signal), (signal: AbortSignal) => client.detail('test', signal), (signal: AbortSignal) => client.events('2026-11', 1, signal), (signal: AbortSignal) => client.googleCalendarConfig(signal)]) {
      const controller = new AbortController();
      const pending = request(controller.signal);
      controller.abort();
      await assert.rejects(pending, { name: 'AbortError' });
      assert.equal(requestSignal?.aborted, true);
    }
    const cancelled = new AbortController(); cancelled.abort();
    await assert.rejects(client.news(1, cancelled.signal), { name: 'AbortError' });
  } finally { globalThis.fetch = original; }
});
