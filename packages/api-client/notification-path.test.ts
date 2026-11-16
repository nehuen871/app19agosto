import { test } from 'node:test';
import assert from 'node:assert/strict';
import { notificationPath } from '../../apps/mobile/services/notification-path';
test('push navigation accepts news paths and rejects external or malformed targets', () => {
  assert.equal(notificationPath('/news/noticia-123'), '/news/noticia-123');
  for (const value of ['https://attacker.test', '//attacker.test', '/admin', '/news/../admin', '/news/%2fadmin', null, {}]) assert.equal(notificationPath(value), '/');
});
