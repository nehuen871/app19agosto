/* global self, URL */
self.addEventListener('push', event => {
  let data;
  try { data = event.data.json(); } catch { return; }
  if (!data || typeof data !== 'object') return;
  const url = typeof data.url === 'string' && /^\/news\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.url) ? data.url : '/';
  event.waitUntil(self.registration.showNotification(data.title || '19 de Agosto', {
    body: data.body || '', tag: data.tag, data: { url }, icon: '/favicon.ico',
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const path = event.notification.data?.url;
  const url = new URL(typeof path === 'string' && /^\/news\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path) ? path : '/', self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async clients => {
    const existing = clients.find(client => new URL(client.url).origin === self.location.origin);
    if (existing) { await existing.navigate(url); return existing.focus(); }
    return self.clients.openWindow(url);
  }));
});
