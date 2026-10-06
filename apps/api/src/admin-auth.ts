import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
export function adminAuth(accessToken: string | undefined): RequestHandler {
  return (req, res, next) => {
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
    next();
  };
}
