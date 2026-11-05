import { Router } from 'express';
import { z } from 'zod';
import { newsInput, newsUpdateInput, newsQuery } from '@utn/validation';
import { adminAuth } from './admin-auth';
import type { PrismaClient } from './generated/prisma/client';
export function adminNewsRouter(db: PrismaClient) {
  const router = Router();
  router.use(adminAuth(db));
  router.get('/', async (req, res) => {
    const { page, limit } = newsQuery.parse(req.query);
    const [items, total] = await db.$transaction([
      db.news.findMany({ include: { category: true }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * limit, take: limit }),
      db.news.count(),
    ]);
    res.json({ items, total, page, limit });
  });
  router.post('/', async (req, res, next) => {
    const { category: name, coverImageId, ...data } = newsInput.parse(req.body);
    if (coverImageId && !await db.mediaImage.findUnique({ where: { id: coverImageId }, select: { id: true } })) {
      res.status(400).json({ error: { code: 'INVALID_IMAGE', message: 'Volvé a subir la imagen elegida.', details: [] } }); return;
    }
    const categorySlug = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    try {
      const item = await db.$transaction(async tx => {
        const category = await tx.category.upsert({ where: { slug: categorySlug }, create: { name, slug: categorySlug }, update: {} });
        const news = await tx.news.create({ data: { ...data, coverImageId, ...(coverImageId ? { coverImageUrl: `/api/v1/media/${coverImageId}` } : {}), categoryId: category.id, publishedAt: data.status === 'PUBLISHED' ? new Date() : null }, include: { category: true } });
        await tx.auditLog.create({ data: { actor: res.locals.actor, action: 'NEWS_CREATED', entityId: news.id } });
        if (data.status === 'PUBLISHED') await tx.auditLog.create({ data: { actor: res.locals.actor, action: 'NEWS_PUBLISHED', entityId: news.id } });
        return news;
      });
      res.status(201).json(item);
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        res.status(409).json({ error: { code: 'SLUG_EXISTS', message: 'Ya existe una noticia con ese identificador.', details: [] } }); return;
      }
      next(error);
    }
  });
  router.patch('/:id/visibility', async (req, res) => {
    const id = z.cuid().parse(req.params.id);
    const { published } = z.object({ published: z.boolean() }).strict().parse(req.body);
    const status = published ? 'PUBLISHED' : 'ARCHIVED';
    const item = await db.$transaction(async tx => {
      const previous = await tx.news.findUnique({ where: { id }, include: { category: true } });
      if (!previous || previous.status === status) return previous;
      const news = await tx.news.update({ where: { id }, data: { status, publishedAt: published ? previous.publishedAt ?? new Date() : previous.publishedAt }, include: { category: true } });
      await tx.auditLog.create({ data: { actor: res.locals.actor, action: published ? 'NEWS_PUBLISHED' : 'NEWS_ARCHIVED', entityId: id } });
      return news;
    });
    if (!item) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Noticia no encontrada.', details: [] } }); return; }
    res.json(item);
  });
  router.patch('/:id', async (req, res, next) => {
    const id = z.cuid().parse(req.params.id);
    const { category: name, coverImageId, ...data } = newsUpdateInput.parse(req.body);
    if (coverImageId && !await db.mediaImage.findUnique({ where: { id: coverImageId }, select: { id: true } })) {
      res.status(400).json({ error: { code: 'INVALID_IMAGE', message: 'Volvé a subir la imagen elegida.', details: [] } }); return;
    }
    const categorySlug = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    try {
      const item = await db.$transaction(async tx => {
        const previous = await tx.news.findUnique({ where: { id } });
        if (!previous) return null;
        const category = await tx.category.upsert({ where: { slug: categorySlug }, create: { name, slug: categorySlug }, update: {} });
        const news = await tx.news.update({ where: { id }, data: {
          ...data, coverImageId,
          ...(coverImageId ? { coverImageUrl: `/api/v1/media/${coverImageId}` } : {}),
          categoryId: category.id,
          publishedAt: data.status === 'PUBLISHED' ? previous.publishedAt ?? new Date() : data.status === 'ARCHIVED' ? previous.publishedAt : null,
        }, include: { category: true } });
        await tx.auditLog.create({ data: { actor: res.locals.actor, action: 'NEWS_UPDATED', entityId: id } });
        if (data.status === 'PUBLISHED' && previous.status !== 'PUBLISHED') await tx.auditLog.create({ data: { actor: res.locals.actor, action: 'NEWS_PUBLISHED', entityId: id } });
        if (data.status === 'ARCHIVED' && previous.status !== 'ARCHIVED') await tx.auditLog.create({ data: { actor: res.locals.actor, action: 'NEWS_ARCHIVED', entityId: id } });
        return news;
      });
      if (!item) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Noticia no encontrada.', details: [] } }); return; }
      res.json(item);
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        res.status(409).json({ error: { code: 'SLUG_EXISTS', message: 'Ya existe una noticia con ese identificador.', details: [] } }); return;
      }
      next(error);
    }
  });
  return router;
}
