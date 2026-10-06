import { pushConfigured } from './push';
import { adminAuth } from './admin-auth';
import { Router } from 'express';
import { notificationDraft, notificationQuery } from '@utn/validation';
import type { PrismaClient } from './generated/prisma/client';

export function notificationsRouter(db: PrismaClient, accessToken: string | undefined) {
  const router = Router();
  router.use(adminAuth(accessToken));
  router.get('/', async (req, res) => {
    const { page, limit } = notificationQuery.parse(req.query);
    const [items, total] = await db.$transaction([
      db.notification.findMany({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * limit, take: limit, include: { news: { select: { title: true, slug: true } } } }),
      db.notification.count(),
    ]);
    res.json({ items, total, page, limit });
  });
  router.post('/:id/send', async (req, res) => {
    if (!pushConfigured()) { res.status(503).json({ error: { code: 'PUSH_UNAVAILABLE', message: 'Envío push no configurado.', details: [] } }); return; }
    const id = String(req.params.id);
    const result = await db.$transaction(async tx => {
      const item = await tx.notification.findUnique({ where: { id } });
      if (!item) return { error: 'NOT_FOUND' };
      if (item.status !== 'DRAFT') return { error: 'ALREADY_SENT' };
      const subscriptions = await tx.pushSubscription.findMany({ where: { enabled: true }, select: { id: true }, take: 5001 });
      if (!subscriptions.length) return { error: 'NO_RECIPIENTS' };
      if (subscriptions.length > 5000) return { error: 'TOO_MANY_RECIPIENTS' };
      const claimed = await tx.notification.updateMany({ where: { id, status: 'DRAFT' }, data: { status: 'QUEUED', requestedRecipients: subscriptions.length } });
      if (!claimed.count) return { error: 'ALREADY_SENT' };
      await tx.pushDelivery.createMany({ data: subscriptions.map(subscription => ({ notificationId: id, subscriptionId: subscription.id })) });
      await tx.auditLog.create({ data: { actor: 'local-admin', action: 'NOTIFICATION_QUEUED', entityId: id } });
      return { item: await tx.notification.findUniqueOrThrow({ where: { id }, include: { news: { select: { title: true, slug: true } } } }) };
    });
    if (result.error) {
      const message = result.error === 'NO_RECIPIENTS' ? 'No hay dispositivos suscriptos. Activá notificaciones desde la app.' : result.error === 'ALREADY_SENT' ? 'Esta notificación ya fue enviada o está en proceso.' : 'No se puede enviar esta notificación.';
      res.status(result.error === 'NOT_FOUND' ? 404 : 409).json({ error: { code: result.error, message, details: [] } }); return;
    }
    res.status(202).json(result.item);
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
