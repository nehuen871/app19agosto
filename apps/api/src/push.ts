import { createHash, randomBytes } from 'node:crypto';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import webPush from 'web-push';
import type { PrismaClient } from './generated/prisma/client';
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const endpoint = z.string().url().max(2048).refine(value => {
  const url = new URL(value);
  return url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443') &&
    (['fcm.googleapis.com', 'web.push.apple.com', 'updates.push.services.mozilla.com'].includes(url.hostname) || url.hostname.endsWith('.push.services.mozilla.com') || url.hostname.endsWith('.notify.windows.com'));
}, 'Proveedor push no permitido.');
export const subscriptionSchema = z.object({ endpoint, keys: z.object({ p256dh: z.string().regex(/^[A-Za-z0-9_-]{87}$/), auth: z.string().regex(/^[A-Za-z0-9_-]{22}$/) }).strict(), expirationTime: z.number().nullable().optional() }).strict();
export function pushConfigured() { return Boolean(process.env.PUSH_VAPID_PUBLIC_KEY && process.env.PUSH_VAPID_PRIVATE_KEY && process.env.PUSH_VAPID_SUBJECT); }
export function pushRouter(db: PrismaClient) {
  const router = Router();
  router.get('/config', (_req, res) => res.json({ enabled: pushConfigured(), publicKey: process.env.PUSH_VAPID_PUBLIC_KEY ?? null }));
  router.use(rateLimit({ windowMs: 60000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false }));
  router.post('/subscriptions', async (req, res) => {
    if (!pushConfigured()) { res.status(503).json({ error: { code: 'PUSH_UNAVAILABLE', message: 'Notificaciones no configuradas.', details: [] } }); return; }
    const subscription = subscriptionSchema.parse(req.body);
    const revokeToken = randomBytes(32).toString('base64url');
    const data = { subscription, revokeHash: hash(revokeToken), enabled: true };
    const item = await db.pushSubscription.upsert({ where: { endpointHash: hash(subscription.endpoint) }, create: { ...data, endpointHash: hash(subscription.endpoint) }, update: data });
    res.status(201).json({ id: item.id, revokeToken });
  });
  router.post('/unsubscribe', async (req, res) => {
    const { id, revokeToken } = z.object({ id: z.string().max(100), revokeToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }).strict().parse(req.body);
    await db.pushSubscription.updateMany({ where: { id, revokeHash: hash(revokeToken) }, data: { enabled: false } });
    res.sendStatus(204);
  });
  return router;
}
export type PushSender = (subscription: z.infer<typeof subscriptionSchema>, payload: { title: string; body: string; url: string; tag: string }) => Promise<void>;
export const sendWebPush: PushSender = async (subscription, payload) => {
  if (!pushConfigured()) throw new Error('PUSH_UNAVAILABLE');
  await webPush.sendNotification(subscription, JSON.stringify(payload), {
    vapidDetails: { subject: process.env.PUSH_VAPID_SUBJECT!, publicKey: process.env.PUSH_VAPID_PUBLIC_KEY!, privateKey: process.env.PUSH_VAPID_PRIVATE_KEY! },
    timeout: 5000, TTL: 86400,
  });
};
export async function processPushQueue(db: PrismaClient, send: PushSender = sendWebPush) {
  // An interrupted send has uncertain delivery: fail it rather than duplicate it.
  const stale = await db.pushDelivery.findMany({ where: { status: 'PROCESSING', claimedAt: { lt: new Date(Date.now() - 120000) } }, take: 100 });
  await db.pushDelivery.updateMany({ where: { id: { in: stale.map(item => item.id) }, status: 'PROCESSING' }, data: { status: 'FAILED', errorCode: 'INTERRUPTED' } });
  const queued = await db.pushDelivery.findMany({ where: { status: 'QUEUED' }, take: 5, include: { subscription: true, notification: { include: { news: true } } }, orderBy: { id: 'asc' } });
  await Promise.all(queued.map(async delivery => {
    const claimed = await db.pushDelivery.updateMany({ where: { id: delivery.id, status: 'QUEUED' }, data: { status: 'PROCESSING', claimedAt: new Date() } });
    if (!claimed.count) return;
    let status = 'SENT', errorCode: string | null = null;
    try {
      const current = await db.pushSubscription.findUniqueOrThrow({ where: { id: delivery.subscriptionId } });
      if (!current.enabled) throw new Error('UNSUBSCRIBED');
      const news = delivery.notification.news;
      const url = news?.status === 'PUBLISHED' && news.publishedAt && news.publishedAt <= new Date() ? `/news/${news.slug}` : '/';
      await send(subscriptionSchema.parse(current.subscription), { title: delivery.notification.title, body: delivery.notification.body, url, tag: delivery.notificationId });
    } catch (error) {
      status = 'FAILED';
      const code = typeof error === 'object' && error !== null && 'statusCode' in error ? error.statusCode : undefined;
      errorCode = code === 404 || code === 410 ? 'EXPIRED' : 'SEND_FAILED';
      if (errorCode === 'EXPIRED') await db.pushSubscription.update({ where: { id: delivery.subscriptionId }, data: { enabled: false } });
    }
    await db.pushDelivery.update({ where: { id: delivery.id }, data: { status, errorCode } });
  }));
  const active = await db.notification.findMany({ where: { status: { in: ['QUEUED', 'PROCESSING'] } }, select: { id: true }, take: 100 });
  const ids = [...new Set([...stale, ...queued].map(item => item.notificationId).concat(active.map(item => item.id)))];
  for (const id of ids) {
    await db.$transaction(async tx => {
      const groups = await tx.pushDelivery.groupBy({ by: ['status'], where: { notificationId: id }, _count: true });
      const count = (status: string) => groups.find(group => group.status === status)?._count ?? 0;
      const sentCount = count('SENT'), failedCount = count('FAILED');
      const pending = count('QUEUED') + count('PROCESSING');
      const status = pending ? 'PROCESSING' : sentCount ? failedCount ? 'PARTIAL' : 'SENT' : 'FAILED';
      const updated = await tx.notification.updateMany({ where: { id, status: { in: ['QUEUED', 'PROCESSING'] } }, data: { status, sentCount, failedCount, ...(pending ? {} : { sentAt: sentCount ? new Date() : null }) } });
      if (updated.count && !pending) await tx.auditLog.create({ data: { actor: 'push-worker', action: sentCount ? 'NOTIFICATION_SENT' : 'NOTIFICATION_FAILED', entityId: id } });
    });
  }
}
export function startPushWorker(db: PrismaClient) {
  let stopped = false;
  let pending: Promise<void> | undefined;
  const tick = () => {
    if (stopped || pending || !pushConfigured()) return;
    pending = processPushQueue(db).catch(() => { process.stderr.write(JSON.stringify({ event: 'push_worker_error' }) + '\n'); }).finally(() => { pending = undefined; });
  };
  const timer = setInterval(tick, 1000);
  tick();
  return async () => { stopped = true; clearInterval(timer); await pending; };
}
