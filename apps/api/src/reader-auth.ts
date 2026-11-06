import type { RequestHandler } from 'express';
import type { PrismaClient } from './generated/prisma/client';
import { cookieValue, findSession } from './auth';
export function readerAuth(db: PrismaClient): RequestHandler {
  return async (req, res, next) => {
    res.set('Cache-Control', 'private, no-store');
    const header = req.get('authorization');
    const token = header ? header.match(/^Bearer (utn_s_[A-Za-z0-9_-]{43})$/)?.[1] : cookieValue(req, 'utn_app_session');
    const session = await findSession(db, token, 'APP') ?? (header ? await findSession(db, token, 'ADMIN') : null);
    if (!session) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Volvé a ingresar para acceder.', details: [] } }); return; }
    res.locals.accountId = session.accountId; res.locals.sessionPurpose = session.purpose;
    next();
  };
}
