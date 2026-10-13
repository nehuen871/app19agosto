import { findSession } from './auth';
import type { PrismaClient } from './generated/prisma/client';
import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
export function adminAuth(accessToken: string | undefined, db?: PrismaClient): RequestHandler {
  return async (req, res, next) => {
    const token = req.get('authorization')?.replace(/^Bearer /, '');
    if (db && token?.startsWith('utn_s_')) {
      const session = await findSession(db, token, 'ADMIN');
      if (!session) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Se requiere acceso administrativo.', details: [] } }); return; }
      res.locals.actor = session.accountId;
      next(); return;
    }
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
    res.locals.actor = 'local-admin';
    next();
  };
}
