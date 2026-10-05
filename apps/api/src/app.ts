import { randomUUID } from 'node:crypto';
import { notificationsRouter } from './notifications';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { ZodError } from 'zod';
import { newsQuery, slugParam } from '@utn/validation';
import type { PrismaClient } from './generated/prisma/client';
export function createApp(db: PrismaClient, options = { adminAccessToken: process.env.ADMIN_ACCESS_TOKEN }) {
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    const requestId = randomUUID();
    res.setHeader('X-Request-Id', requestId);
    const started = performance.now();
    res.on('finish', () => process.stdout.write(JSON.stringify({ event: 'request', requestId, method: req.method, status: res.statusCode, durationMs: Math.round(performance.now() - started) }) + '\n'));
    next();
  });
  app.use(helmet());
  app.use(cors({ origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3001,http://localhost:8081').split(',').map(origin => origin.trim()) }));
  app.use(rateLimit({ windowMs: 60000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: { code: 'RATE_LIMIT', message: 'Demasiadas solicitudes', details: [] } } }));
  app.use('/api/v1/admin', rateLimit({ windowMs: 60000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: { code: 'RATE_LIMIT', message: 'Demasiadas solicitudes', details: [] } } }));
  app.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.is('application/json')) {
      res.status(415).json({ error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Usá application/json', details: [] } }); return;
    }
    next();
  });
  app.use(express.json({ limit: '32kb' }));
  app.use('/api/v1/admin/notifications', notificationsRouter(db, options.adminAccessToken));
  app.get('/health/live', (_req, res) => { res.json({ status: 'ok' }); });
  app.get(['/health', '/health/ready'], async (_req, res) => {
    try { await db.$queryRaw`SELECT 1`; res.json({ status: 'ok' }); }
    catch { res.status(503).json({ status: 'unavailable' }); }
  });
  app.get('/api/v1/categories', async (_req, res) => { res.json(await db.category.findMany({ orderBy: { name: 'asc' } })); });
  app.get('/api/v1/news', async (req, res) => {
    const { page, limit, category, featured } = newsQuery.parse(req.query);
    const where = { status: 'PUBLISHED' as const, publishedAt: { lte: new Date() }, ...(category ? { category: { slug: category } } : {}), ...(featured !== undefined ? { featured } : {}) };
    const [items, total] = await db.$transaction([db.news.findMany({ where, include: { category: true }, orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * limit, take: limit }), db.news.count({ where })]);
    res.json({ items, total, page, limit });
  });
  app.get('/api/v1/news/:slug', async (req, res) => {
    const slug = slugParam.parse(req.params.slug);
    const item = await db.news.findFirst({ where: { slug, status: 'PUBLISHED', publishedAt: { lte: new Date() } }, include: { category: true } });
    if (!item) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Noticia no encontrada', details: [] } }); return; }
    res.json(item);
  });
  app.use((_req, res) => { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Recurso no encontrado', details: [] } }); });
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.too.large') { res.status(413).json({ error: { code: 'BODY_TOO_LARGE', message: 'Solicitud demasiado grande', details: [] } }); return; }
    if (error instanceof ZodError) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Los datos ingresados no son válidos', details: error.issues } }); return; }
    if (error instanceof SyntaxError) { res.status(400).json({ error: { code: 'INVALID_JSON', message: 'JSON inválido', details: [] } }); return; }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'No se pudo completar la solicitud', details: [] } });
  });
  return app;
}
