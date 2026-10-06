import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = await readFile(new URL('../apps/mobile/public/push-sw.js', import.meta.url), 'utf8');
function worker(clients = []) {
  const handlers = {}, notifications = [], opened = [];
  const self = {
    location: { origin: 'https://app.example' },
    addEventListener: (name, handler) => { handlers[name] = handler; },
    registration: { showNotification: async (title, options) => { notifications.push({ title, options }); } },
    clients: { matchAll: async () => clients, openWindow: async url => { opened.push(url); } },
  };
  vm.runInNewContext(source, { self, URL });
  return { handlers, notifications, opened };
}
test('push displays the payload and allows only published-news-shaped local links', async () => {
  const { handlers, notifications } = worker();
  for (const url of ['/news/noticia-publicada', 'https://attacker.example', '//attacker.example', '/admin']) {
    let pending;
    handlers.push({ data: { json: () => ({ title: 'Alerta', body: 'Contenido', url }) }, waitUntil: promise => { pending = promise; } });
    await pending;
    assert.equal(notifications.at(-1).options.data.url, url.startsWith('/news/') ? url : '/');
  }
  assert.equal(notifications[0].title, 'Alerta');
  assert.equal(notifications[0].options.body, 'Contenido');
  handlers.push({ data: { json: () => null } });
  handlers.push({ data: { json: () => { throw new Error('Malformed payload'); } } });
  assert.equal(notifications.length, 4);
});
test('notification click opens the local news and focuses an existing app window', async () => {
  const navigated = []; let focused = false, closed = false, pending;
  const client = { url: 'https://app.example/', navigate: async url => { navigated.push(url); }, focus: async () => { focused = true; } };
  const { handlers, opened } = worker([client]);
  handlers.notificationclick({ notification: { data: { url: '/news/noticia-publicada' }, close: () => { closed = true; } }, waitUntil: promise => { pending = promise; } });
  await pending;
  assert.deepEqual(navigated, ['https://app.example/news/noticia-publicada']);
  assert.equal(focused && closed, true); assert.equal(opened.length, 0);
});
test('notification click cannot navigate to an external origin', async () => {
  const { handlers, opened } = worker(); let pending;
  handlers.notificationclick({ notification: { data: { url: '//attacker.example/path' }, close() {} }, waitUntil: promise => { pending = promise; } });
  await pending;
  assert.deepEqual(opened, ['https://app.example/']);
});
