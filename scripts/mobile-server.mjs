import express from 'express';
import { createMobileApiProxy } from './mobile-api-proxy.mjs';
const app = createMobileApiProxy(process.env.API_INTERNAL_URL ?? 'http://api:4000');
app.use(express.static('/app/public'));
app.get('/news/:slug', (_req, res) => res.sendFile('/app/public/index.html'));
app.get('/account', (_req, res) => res.sendFile('/app/public/index.html'));
app.get('/calendar', (_req, res) => res.sendFile('/app/public/index.html'));
const server = app.listen(Number(process.env.PORT ?? 8081), '0.0.0.0');
process.on('SIGTERM', () => { server.close(() => process.exit(0)); server.closeIdleConnections(); setTimeout(() => process.exit(1), 10000).unref(); });
