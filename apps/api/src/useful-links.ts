import { Router } from 'express';
import { z } from 'zod';
import { usefulLinkInput, usefulLinkUpdate, usefulLinkVersion, notificationQuery } from '@utn/validation';
import { adminAuth } from './admin-auth';
import { readerAuth } from './reader-auth';
import type { PrismaClient } from './generated/prisma/client';
const orderBy = [{ featured: 'desc' as const }, { priority: 'asc' as const }, { id: 'asc' as const }];
const present = <T extends { imageId: string }>(item: T) => ({ ...item, imageUrl: `/api/v1/media/${item.imageId}` });
export function usefulLinksRouter(db: PrismaClient) {
  const router = Router();
  router.get('/useful-links', readerAuth(db), async (req, res) => {
    const { page, limit } = notificationQuery.parse(req.query);
    const where = { deletedAt: null, published: true };
    const [items, total] = await db.$transaction([db.usefulLink.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit, omit: { deletedAt: true } }), db.usefulLink.count({ where })]);
    res.json({ items: items.map(present), total, page, limit });
  });
  router.use('/admin/useful-links', adminAuth(db));
  router.get('/admin/useful-links', async (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    const { page, limit } = notificationQuery.parse(req.query);
    const where = { deletedAt: null };
    const [items, total] = await db.$transaction([db.usefulLink.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit, omit: { deletedAt: true } }), db.usefulLink.count({ where })]);
    res.json({ items: items.map(present), total, page, limit });
  });
  for (const method of ['post', 'patch'] as const) router[method](method === 'post' ? '/admin/useful-links' : '/admin/useful-links/:id', async (req, res) => {
    const id = method === 'patch' ? z.object({ id: z.uuid() }).parse(req.params).id : null;
    const update = id ? usefulLinkUpdate.parse(req.body) : null;
    const input = update ?? usefulLinkInput.parse(req.body);
    const { title, description, url, imageId, priority, featured, published } = input;
    if (!await db.mediaImage.findUnique({ where: { id: imageId }, select: { id: true } })) { res.status(400).json({ error: { code: 'INVALID_IMAGE', message: 'Subí una imagen válida.', details: [] } }); return; }
    const item = await db.$transaction(async tx => {
      const data = { title, description, url, imageId, priority, featured, published };
      if (id && update) {
        const expected = new Date(update.expectedUpdatedAt);
        const changed = await tx.usefulLink.updateMany({ where: { id, deletedAt: null, updatedAt: expected }, data: { ...data, updatedAt: new Date(Math.max(Date.now(), expected.getTime() + 1)) } });
        if (!changed.count) return null;
      }
      const saved = id ? await tx.usefulLink.findUniqueOrThrow({ where: { id } }) : await tx.usefulLink.create({ data });
      await tx.auditLog.create({ data: { actor: res.locals.actor, action: id ? 'USEFUL_LINK_UPDATED' : 'USEFUL_LINK_CREATED', entityId: saved.id } });
      return saved;
    });
    if (!item) { res.status(409).json({ error: { code: 'LINK_CONFLICT', message: 'El enlace cambió o fue eliminado. Actualizá el listado.', details: [] } }); return; }
    res.status(id ? 200 : 201).json(present(item));
  });
  router.delete('/admin/useful-links/:id', async (req, res) => {
    const id = z.uuid().parse(req.params.id), { expectedUpdatedAt } = usefulLinkVersion.parse(req.body);
    const count = await db.$transaction(async tx => {
      const changed = await tx.usefulLink.updateMany({ where: { id, deletedAt: null, updatedAt: new Date(expectedUpdatedAt) }, data: { deletedAt: new Date() } });
      if (changed.count) await tx.auditLog.create({ data: { actor: res.locals.actor, action: 'USEFUL_LINK_DELETED', entityId: id } });
      return changed.count;
    });
    if (!count) { res.status(409).json({ error: { code: 'LINK_CONFLICT', message: 'El enlace cambió o ya fue eliminado. Actualizá el listado.', details: [] } }); return; }
    res.json({ deleted: true });
  });
  return router;
}
