import { findSession } from './auth';
import type { PrismaClient } from './generated/prisma/client';
import type { RequestHandler } from 'express';
export function adminAuth(db: PrismaClient): RequestHandler {
  return async (req, res, next) => {
    const token = req.get('authorization')?.match(/^Bearer (utn_s_[A-Za-z0-9_-]{43})$/)?.[1];
    const session = token ? await findSession(db, token, 'ADMIN') : null;
    if (!session) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Se requiere acceso administrativo.', details: [] } }); return; }
    res.locals.actor = session.accountId;
    next();
  };
}
