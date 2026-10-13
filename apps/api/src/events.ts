import { Router } from 'express';
import { z } from 'zod';
import { eventInput, eventQuery, notificationQuery } from '@utn/validation';
import { adminAuth } from './admin-auth';
import type { PrismaClient } from './generated/prisma/client';
export function eventsRouter(db: PrismaClient, token: string | undefined) {
  const router = Router();
  router.get('/events', async (req, res) => {
    const { month, page, limit } = eventQuery.parse(req.query);
    const [year, number] = month.split('-').map(Number);
    const from = new Date(`${month}-01T00:00:00-03:00`);
    const to = new Date(Date.UTC(year, number, 1, 3));
    const where = { status: 'PUBLISHED' as const, startsAt: { lt: to }, endsAt: { gt: from } };
    const [items, total] = await db.$transaction([
      db.calendarEvent.findMany({ where, orderBy: [{ startsAt: 'asc' }, { id: 'asc' }], skip: (page - 1) * limit, take: limit }),
      db.calendarEvent.count({ where }),
    ]);
    res.json({ items, total, page, limit });
  });
  router.use('/admin/events', adminAuth(token, db));
  router.get('/admin/events', async (req, res) => {
    const { page, limit } = notificationQuery.parse(req.query);
    const [items, total] = await db.$transaction([
      db.calendarEvent.findMany({ orderBy: [{ startsAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * limit, take: limit }),
      db.calendarEvent.count(),
    ]);
    res.json({ items, total, page, limit });
  });
  router.post('/admin/events', async (req, res) => {
    const input = eventInput.parse(req.body);
    const data = { ...input, startsAt: new Date(input.startsAt), endsAt: new Date(input.endsAt) };
    const event = await db.$transaction(async tx => {
      const item = await tx.calendarEvent.create({ data });
      await tx.auditLog.create({ data: { actor: res.locals.actor, action: 'EVENT_CREATED', entityId: item.id } });
      return item;
    });
    res.status(201).json(event);
  });
  router.patch('/admin/events/:id', async (req, res) => {
    const id = z.uuid().parse(req.params.id), input = eventInput.parse(req.body);
    const event = await db.$transaction(async tx => {
      if (!await tx.calendarEvent.findUnique({ where: { id }, select: { id: true } })) return null;
      const item = await tx.calendarEvent.update({ where: { id }, data: { ...input, startsAt: new Date(input.startsAt), endsAt: new Date(input.endsAt) } });
      await tx.auditLog.create({ data: { actor: res.locals.actor, action: 'EVENT_UPDATED', entityId: id } });
      return item;
    });
    if (!event) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Evento no encontrado.', details: [] } }); return; }
    res.json(event);
  });
  return router;
}
