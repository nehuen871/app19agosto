import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { notificationDraft, notificationQuery } from '@utn/validation';
import type { PrismaClient } from './generated/prisma/client';

export function notificationsRouter(db: PrismaClient, accessToken: string | undefined) {
  const router = Router();
  router.use((req, res, next) => {
    const supplied = Buffer.from(req.get('authorization') ?? '');
    const expected = Buffer.from(`Bearer ${accessToken ?? ''}`);
    if (!accessToken || accessToken.length < 32) {
      res.status(503).json({ error: { code: 'ADMIN_UNAVAILABLE', message: 'El acceso administrativo no está configurado.', details: [] } });
      return;
    }
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Se requiere acceso administrativo.', details: [] } });
      return;
    }
    next();
  });
  router.get('/', async (req, res) => {
    const { page, limit } = notificationQuery.parse(req.query);
    const [items, total] = await db.$transaction([
      db.notification.findMany({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * limit, take: limit, include: { news: { select: { title: true, slug: true } } } }),
      db.notification.count(),
    ]);
    res.json({ items, total, page, limit });
  });
  router.post('/', async (req, res) => {
    const data = notificationDraft.parse(req.body);
    if (data.newsId) {
      const news = await db.news.findFirst({ where: { id: data.newsId, status: 'PUBLISHED', publishedAt: { lte: new Date() } } });
      if (!news) {
        res.status(400).json({ error: { code: 'INVALID_NEWS', message: 'Elegí una noticia publicada disponible.', details: [] } });
        return;
      }
    }
    const item = await db.$transaction(async tx => {
      const notification = await tx.notification.create({ data, include: { news: { select: { title: true, slug: true } } } });
      await tx.auditLog.create({ data: { actor: 'local-admin', action: 'NOTIFICATION_CREATED', entityId: notification.id } });
      return notification;
    });
    res.status(201).json(item);
  });
  return router;
}
