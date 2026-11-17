import { Router } from 'express';
import { z } from 'zod';
import { categoryInput, notificationQuery } from '@utn/validation';
import { adminAuth } from './admin-auth';
import type { PrismaClient } from './generated/prisma/client';

export function adminCategoriesRouter(db: PrismaClient) {
  const router = Router();
  router.use(adminAuth(db));
  router.get('/', async (req, res) => {
    const { page, limit } = notificationQuery.parse(req.query);
    const [items, total] = await db.$transaction([
      db.category.findMany({ include: { _count: { select: { news: true, children: true } } }, orderBy: [{ name: 'asc' }, { id: 'asc' }], skip: (page - 1) * limit, take: limit }),
      db.category.count(),
    ]);
    res.json({ items, total, page, limit });
  });
  for (const method of ['post', 'patch'] as const) router[method](method === 'post' ? '/' : '/:id', async (req, res, next) => {
    const id = method === 'patch' ? z.object({ id: z.cuid() }).parse(req.params).id : null;
    const { name, parentId } = categoryInput.parse(req.body);
    const slug = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    try {
      const item = await db.$transaction(async tx => {
        // Serialize tree changes so two concurrent reparentings cannot form a cycle.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(19112026)`;
        if (id && !await tx.category.findUnique({ where: { id }, select: { id: true } })) throw new MissingCategory();
        if (parentId) {
          const ancestors = await tx.$queryRaw<{ id: string }[]>`
            WITH RECURSIVE ancestry AS (
              SELECT "id", "parentId" FROM "Category" WHERE "id" = ${parentId}
              UNION
              SELECT parent."id", parent."parentId" FROM "Category" parent JOIN ancestry ON parent."id" = ancestry."parentId"
            ) SELECT "id" FROM ancestry
          `;
          if (!ancestors.length || ancestors.some(ancestor => ancestor.id === id)) throw new InvalidParent();
        }
        const category = id ? await tx.category.update({ where: { id }, data: { name, slug, ...(parentId !== undefined ? { parentId } : {}) } }) : await tx.category.create({ data: { name, slug, parentId } });
        await tx.auditLog.create({ data: { actor: res.locals.actor, action: id ? 'CATEGORY_UPDATED' : 'CATEGORY_CREATED', entityId: category.id } });
        return category;
      });
      res.status(id ? 200 : 201).json(item);
    } catch (error) { handleError(error, res, next); }
  });
  router.delete('/:id', async (req, res, next) => {
    const id = z.cuid().parse(req.params.id);
    try {
      await db.$transaction(async tx => {
        await tx.category.delete({ where: { id } });
        await tx.auditLog.create({ data: { actor: res.locals.actor, action: 'CATEGORY_DELETED', entityId: id } });
      });
      res.json({ deleted: true });
    } catch (error) { handleError(error, res, next); }
  });
  return router;
}
function handleError(error: unknown, res: import('express').Response, next: import('express').NextFunction) {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : '';
  if (code === 'P2002') { res.status(409).json({ error: { code: 'CATEGORY_EXISTS', message: 'Ya existe una categoría con ese nombre.', details: [] } }); return; }
  if (error instanceof InvalidParent) { res.status(400).json({ error: { code: 'INVALID_PARENT', message: 'La categoría superior no existe o generaría un ciclo.', details: [] } }); return; }
  if (code === 'P2003') { res.status(409).json({ error: { code: 'CATEGORY_IN_USE', message: 'Esta categoría tiene noticias o subcategorías asociadas. Reasignalas antes de eliminarla.', details: [] } }); return; }
  if (code === 'P2025' || error instanceof MissingCategory) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Categoría no encontrada.', details: [] } }); return; }
  next(error);
}
class InvalidParent extends Error {}
class MissingCategory extends Error {}
