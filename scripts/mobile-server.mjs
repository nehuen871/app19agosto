import express from 'express';
const app = express();
app.disable('x-powered-by');
app.get('/health/live', (_req, res) => res.json({ status: 'ok' }));
// Public reads and explicit OAuth endpoints use the same origin. Browser traffic uses the same origin.
app.get(['/api/v1/news', '/api/v1/news/:slug', '/api/v1/categories', '/api/v1/events'], async (req, res) => {
  try {
    const upstream = await fetch(`${process.env.API_INTERNAL_URL ?? 'http://api:4000'}${req.originalUrl}`, { signal: AbortSignal.timeout(10000) });
    res.status(upstream.status).type('application/json').send(await upstream.text());
  } catch { res.status(503).json({ error: { code: 'UNAVAILABLE', message: 'El servicio no está disponible.', details: [] } }); }
});
app.get('/api/v1/media/:id', async (req, res) => {
  if (!/^[a-f0-9-]{36}$/.test(req.params.id)) { res.sendStatus(404); return; }
  try {
    const response = await fetch(`${process.env.API_INTERNAL_URL ?? 'http://api:4000'}${req.path}`, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) { res.sendStatus(response.status); return; }
    const type = response.headers.get('Content-Type');
    if (!['image/png', 'image/jpeg'].includes(type)) { res.sendStatus(502); return; }
    res.set({ 'Content-Type': type, 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' }).send(Buffer.from(await response.arrayBuffer()));
  } catch { res.sendStatus(503); }
});
app.get('/api/v1/push/config', async (_req, res) => {
  try { const upstream = await fetch(`${process.env.API_INTERNAL_URL ?? 'http://api:4000'}/api/v1/push/config`, { signal: AbortSignal.timeout(10000) }); res.status(upstream.status).type('application/json').send(await upstream.text()); }
  catch { res.sendStatus(503); }
});
app.get(['/api/v1/google-calendar/config', '/api/v1/google-calendar/start', '/api/v1/google-calendar/callback'], async (req, res) => {
  try {
    const response = await fetch(`${process.env.API_INTERNAL_URL ?? 'http://api:4000'}${req.originalUrl}`, { redirect: 'manual', headers: req.headers.cookie ? { Cookie: req.headers.cookie } : {}, signal: AbortSignal.timeout(35000) });
    res.status(response.status).set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
    const location = response.headers.get('Location'); if (location) res.set('Location', location);
    const cookies = response.headers.getSetCookie(); if (cookies.length) res.set('Set-Cookie', cookies);
    res.type(response.headers.get('Content-Type') ?? 'text/plain').send(await response.text());
  } catch { res.sendStatus(503); }
});
app.get(['/api/v1/auth/config', '/api/v1/auth/google/start', '/api/v1/auth/google/callback', '/api/v1/auth/me'], async (req, res) => {
  try {
    // Admin authentication is only exposed through the admin origin.
    if (req.query.purpose && req.query.purpose !== 'app') { res.sendStatus(404); return; }
    const response = await fetch(`${process.env.API_INTERNAL_URL ?? 'http://api:4000'}${req.originalUrl}`, { redirect: 'manual', headers: req.headers.cookie ? { Cookie: req.headers.cookie } : {}, signal: AbortSignal.timeout(35000) });
    res.status(response.status).set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
    const location = response.headers.get('Location'); if (location) res.set('Location', location);
    const cookies = response.headers.getSetCookie(); if (cookies.length) res.set('Set-Cookie', cookies);
    res.type(response.headers.get('Content-Type') ?? 'text/plain').send(await response.text());
  } catch { res.sendStatus(503); }
});
app.use(express.json({ limit: '8kb' }));
app.post('/api/v1/auth/logout', async (req, res) => {
  try {
    const response = await fetch(`${process.env.API_INTERNAL_URL ?? 'http://api:4000'}${req.path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(req.headers.cookie ? { Cookie: req.headers.cookie } : {}), ...(req.headers.origin ? { Origin: req.headers.origin } : {}) }, body: '{}', signal: AbortSignal.timeout(10000) });
    res.status(response.status).set('Cache-Control', 'no-store');
    const cookies = response.headers.getSetCookie(); if (cookies.length) res.set('Set-Cookie', cookies);
    if (response.status === 204) res.end(); else res.type(response.headers.get('Content-Type') ?? 'text/plain').send(await response.text());
  } catch { res.sendStatus(503); }
});
app.post(['/api/v1/push/subscriptions', '/api/v1/push/unsubscribe'], async (req, res) => {
  try {
    const upstream = await fetch(`${process.env.API_INTERNAL_URL ?? 'http://api:4000'}${req.path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req.body), signal: AbortSignal.timeout(10000) });
    res.status(upstream.status); if (upstream.status === 204) res.end(); else res.type('application/json').send(await upstream.text());
  } catch { res.sendStatus(503); }
});
app.use('/api', (_req, res) => res.sendStatus(404));
app.use(express.static('/app/public'));
app.get('/news/:slug', (_req, res) => res.sendFile('/app/public/index.html'));
app.get('/account', (_req, res) => res.sendFile('/app/public/index.html'));
app.get('/calendar', (_req, res) => res.sendFile('/app/public/index.html'));
const server = app.listen(Number(process.env.PORT ?? 8081), '0.0.0.0');
process.on('SIGTERM', () => { server.close(() => process.exit(0)); server.closeIdleConnections(); setTimeout(() => process.exit(1), 10000).unref(); });
