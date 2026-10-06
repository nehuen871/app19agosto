import express from 'express';
const app = express();
app.disable('x-powered-by');
app.get('/health/live', (_req, res) => res.json({ status: 'ok' }));
// Only expose the existing public read API. Browser traffic uses the same origin.
app.get(['/api/v1/news', '/api/v1/news/:slug', '/api/v1/categories'], async (req, res) => {
  try {
    const upstream = await fetch(`${process.env.API_INTERNAL_URL ?? 'http://api:4000'}${req.originalUrl}`, { signal: AbortSignal.timeout(10000) });
    res.status(upstream.status).type('application/json').send(await upstream.text());
  } catch { res.status(503).json({ error: { code: 'UNAVAILABLE', message: 'El servicio no está disponible.', details: [] } }); }
});
app.get('/api/v1/push/config', async (_req, res) => {
  try { const upstream = await fetch(`${process.env.API_INTERNAL_URL ?? 'http://api:4000'}/api/v1/push/config`, { signal: AbortSignal.timeout(10000) }); res.status(upstream.status).type('application/json').send(await upstream.text()); }
  catch { res.sendStatus(503); }
});
app.use(express.json({ limit: '8kb' }));
app.post(['/api/v1/push/subscriptions', '/api/v1/push/unsubscribe'], async (req, res) => {
  try {
    const upstream = await fetch(`${process.env.API_INTERNAL_URL ?? 'http://api:4000'}${req.path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req.body), signal: AbortSignal.timeout(10000) });
    res.status(upstream.status); if (upstream.status === 204) res.end(); else res.type('application/json').send(await upstream.text());
  } catch { res.sendStatus(503); }
});
app.use('/api', (_req, res) => res.sendStatus(404));
app.use(express.static('/app/public'));
app.get('/news/:slug', (_req, res) => res.sendFile('/app/public/index.html'));
const server = app.listen(Number(process.env.PORT ?? 8081), '0.0.0.0');
process.on('SIGTERM', () => { server.close(() => process.exit(0)); server.closeIdleConnections(); setTimeout(() => process.exit(1), 10000).unref(); });
