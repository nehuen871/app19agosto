import { Router } from 'express';
import { newsInput, newsQuery } from '@utn/validation';
import { adminAuth } from './admin-auth';
import type { PrismaClient } from './generated/prisma/client';
export function adminNewsRouter(db: PrismaClient, token: string | undefined) {
  const router = Router();
  router.use(adminAuth(token));
  router.get('/', async (req, res) => {
    const { page, limit } = newsQuery.parse(req.query);
    const [items, total] = await db.$transaction([
      db.news.findMany({ include: { category: true }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * limit, take: limit }),
      db.news.count(),
    ]);
    res.json({ items, total, page, limit });
  });
  router.post('/', async (req, res, next) => {
    const { category: name, ...data } = newsInput.parse(req.body);
    const categorySlug = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    try {
      const item = await db.$transaction(async tx => {
        const category = await tx.category.upsert({ where: { slug: categorySlug }, create: { name, slug: categorySlug }, update: {} });
        const news = await tx.news.create({ data: { ...data, categoryId: category.id, publishedAt: data.status === 'PUBLISHED' ? new Date() : null }, include: { category: true } });
        await tx.auditLog.create({ data: { actor: 'local-admin', action: 'NEWS_CREATED', entityId: news.id } });
        if (data.status === 'PUBLISHED') await tx.auditLog.create({ data: { actor: 'local-admin', action: 'NEWS_PUBLISHED', entityId: news.id } });
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
  return router;
}
