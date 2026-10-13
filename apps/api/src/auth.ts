import { createHash, randomBytes } from 'node:crypto';
import { Router, type Request } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import type { PrismaClient } from './generated/prisma/client';

type Purpose = 'APP' | 'ADMIN';
const opaque = () => randomBytes(32).toString('base64url');
export const hashToken = (value: string) => createHash('sha256').update(value).digest('hex');
const challenge = (value: string) => createHash('sha256').update(value).digest('base64url');
const list = (value?: string) => (value ?? '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
export const adminEmailAllowed = (email: string) => list(process.env.ADMIN_GOOGLE_EMAILS).includes(email.toLowerCase());
export function appEmailAllowed(email: string) {
  return process.env.GOOGLE_APP_ACCESS === 'verified' || list(process.env.ALLOWED_EMAIL_DOMAINS).includes(email.toLowerCase().split('@')[1]);
}
const appOrigin = () => process.env.APP_PUBLIC_URL ?? 'http://localhost:8081';
const adminOrigin = () => process.env.ADMIN_PUBLIC_URL ?? 'http://localhost:3001';
const callback = (purpose: Purpose) => new URL(purpose === 'ADMIN' ? '/admin/oauth/callback' : '/api/v1/auth/google/callback', purpose === 'ADMIN' ? adminOrigin() : appOrigin()).href;
const stateCookie = (purpose: Purpose) => purpose === 'ADMIN' ? 'utn_admin_google_state' : 'utn_app_google_state';
const cookieOptions = (purpose: Purpose) => ({ httpOnly: true, sameSite: 'lax' as const, secure: (purpose === 'ADMIN' ? adminOrigin() : appOrigin()).startsWith('https:'), path: purpose === 'ADMIN' ? '/admin/oauth' : '/api/v1/auth', maxAge: 600000 });
export function cookieValue(req: Request, name: string) {
  return (req.get('cookie') ?? '').split(';').map(v => v.trim()).find(v => v.startsWith(name + '='))?.slice(name.length + 1);
}
function configured(purpose: Purpose) {
  return process.env.GOOGLE_LOGIN_ENABLED === 'true' && Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) && (purpose === 'ADMIN' ? list(process.env.ADMIN_GOOGLE_EMAILS).length > 0 : process.env.GOOGLE_APP_ACCESS === 'verified' || list(process.env.ALLOWED_EMAIL_DOMAINS).length > 0);
}
export async function findSession(db: PrismaClient, token: string | undefined, purpose: Purpose) {
  if (!token || !/^utn_s_[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const session = await db.authSession.findUnique({ where: { tokenHash: hashToken(token) }, include: { account: true } });
  if (!session || session.purpose !== purpose || session.expiresAt <= new Date() || session.account.blocked || (purpose === 'ADMIN' ? session.account.role !== 'ADMIN' || !adminEmailAllowed(session.account.email) : !appEmailAllowed(session.account.email))) return null;
  return session;
}
const bearer = (req: Request) => req.get('authorization')?.match(/^Bearer (utn_s_[A-Za-z0-9_-]{43})$/)?.[1];
function identity(account: { id: string; name: string; email: string; role: string }) {
  return { id: account.id, name: account.name, email: account.email, role: account.role };
}
async function issueSession(db: PrismaClient, accountId: string, purpose: Purpose) {
  const token = 'utn_s_' + opaque(), expiresAt = new Date(Date.now() + (purpose === 'ADMIN' ? 8 : 24 * 7) * 3600000);
  await db.authSession.create({ data: { tokenHash: hashToken(token), accountId, purpose, expiresAt } });
  return { token, expiresAt };
}
export function authRouter(db: PrismaClient, fetcher: typeof fetch = fetch) {
  const router = Router();
  router.use((_req, res, next) => { res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' }); next(); });
  router.use(rateLimit({ windowMs: 60000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false }));
  router.get('/config', (req, res) => {
    const purpose = req.query.purpose === 'admin' ? 'ADMIN' : 'APP';
    res.json({ enabled: configured(purpose), startUrl: configured(purpose) ? new URL(purpose === 'ADMIN' ? '/admin/oauth/start' : '/api/v1/auth/google/start', purpose === 'ADMIN' ? adminOrigin() : appOrigin()).href : null });
  });
  router.get('/google/start', async (req, res) => {
    const query = z.object({ purpose: z.enum(['app', 'admin']).default('app'), nativeChallenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/).optional(), nativeState: z.string().regex(/^[A-Za-z0-9_-]{43}$/).optional() }).strict().parse(req.query);
    const purpose: Purpose = query.purpose === 'admin' ? 'ADMIN' : 'APP';
    if (Boolean(query.nativeChallenge) !== Boolean(query.nativeState) || (purpose === 'ADMIN' && query.nativeChallenge)) { res.sendStatus(400); return; }
    if (!configured(purpose)) { res.status(503).json({ error: { code: 'OAUTH_UNAVAILABLE', message: 'El login con Google todavía no está configurado.', details: [] } }); return; }
    await db.oAuthAttempt.deleteMany({ where: { expiresAt: { lte: new Date() } } });
    await db.nativeLoginTicket.deleteMany({ where: { expiresAt: { lte: new Date() } } });
    await db.authSession.deleteMany({ where: { expiresAt: { lte: new Date() } } });
    const state = opaque(), browser = opaque(), verifier = opaque();
    await db.oAuthAttempt.create({ data: { stateHash: hashToken(state), browserHash: hashToken(browser), verifier, purpose, nativeChallenge: query.nativeChallenge, nativeState: query.nativeState, expiresAt: new Date(Date.now() + 600000) } });
    res.cookie(stateCookie(purpose), browser, cookieOptions(purpose));
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: callback(purpose), response_type: 'code', scope: 'openid email profile', state, code_challenge: challenge(verifier), code_challenge_method: 'S256', prompt: 'select_account' }).toString();
    res.redirect(url.href);
  });
  router.get('/google/callback', async (req, res) => {
    const query = z.object({ state: z.string().regex(/^[A-Za-z0-9_-]{43}$/), code: z.string().min(1).max(4096).optional(), error: z.string().max(200).optional(), purpose: z.enum(['app', 'admin']).default('app') }).safeParse(req.query);
    const purpose: Purpose = req.query.purpose === 'admin' ? 'ADMIN' : 'APP';
    const target = new URL(purpose === 'ADMIN' ? '/admin/login' : '/account', purpose === 'ADMIN' ? adminOrigin() : appOrigin());
    const finish = (result: string) => { target.searchParams.set('authResult', result); res.redirect(target.href); };
    if (!query.success) { finish('invalid'); return; }
    const attempt = await db.oAuthAttempt.findUnique({ where: { stateHash: hashToken(query.data.state) } });
    const browser = cookieValue(req, stateCookie(purpose));
    if (!attempt || attempt.purpose !== purpose || attempt.expiresAt <= new Date() || !browser || !/^[A-Za-z0-9_-]{43}$/.test(browser) || hashToken(browser) !== attempt.browserHash) { finish('invalid'); return; }
    const consumed = await db.oAuthAttempt.deleteMany({ where: { stateHash: attempt.stateHash, expiresAt: { gt: new Date() } } });
    res.clearCookie(stateCookie(purpose), { ...cookieOptions(purpose), maxAge: undefined });
    if (!consumed.count) { finish('invalid'); return; }
    if (attempt.nativeChallenge) { target.href = 'utnfrba://account'; target.searchParams.set('nativeState', attempt.nativeState!); }
    if (query.data.error || !query.data.code) { finish('cancelled'); return; }
    if (!configured(purpose)) { finish('unavailable'); return; }
    try {
      const tokenResponse = await fetcher('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, redirect_uri: callback(purpose), code: query.data.code, grant_type: 'authorization_code', code_verifier: attempt.verifier }), signal: AbortSignal.timeout(10000) });
      if (!tokenResponse.ok) throw new Error('token');
      const tokens = z.object({ access_token: z.string().min(1).max(4096) }).parse(await tokenResponse.json());
      const infoResponse = await fetcher('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${tokens.access_token}` }, signal: AbortSignal.timeout(10000) });
      if (!infoResponse.ok) throw new Error('identity');
      // Userinfo is obtained only with the token issued by our server-side code + PKCE exchange.
      const info = z.object({ sub: z.string().min(1).max(255), email: z.email().max(320), email_verified: z.literal(true), name: z.string().max(200).optional() }).parse(await infoResponse.json());
      const email = info.email.toLowerCase();
      if (purpose === 'ADMIN' ? !adminEmailAllowed(email) : !appEmailAllowed(email)) { finish('denied'); return; }
      const account = await db.account.upsert({ where: { googleSubject: info.sub }, create: { googleSubject: info.sub, email, name: info.name ?? email, role: purpose === 'ADMIN' ? 'ADMIN' : 'USER' }, update: { email, name: info.name ?? email } });
      if (account.blocked) { finish('denied'); return; }
      if (purpose === 'ADMIN' && account.role !== 'ADMIN') await db.account.update({ where: { id: account.id }, data: { role: 'ADMIN' } });
      if (attempt.nativeChallenge) {
        const ticket = opaque();
        await db.nativeLoginTicket.create({ data: { tokenHash: hashToken(ticket), accountId: account.id, challenge: attempt.nativeChallenge, expiresAt: new Date(Date.now() + 60000) } });
        target.searchParams.set('ticket', ticket);
      } else {
        const session = await issueSession(db, account.id, purpose);
        res.cookie(purpose === 'ADMIN' ? 'utn_admin_oauth' : 'utn_app_session', session.token, { httpOnly: true, secure: (purpose === 'ADMIN' ? adminOrigin() : appOrigin()).startsWith('https:'), sameSite: 'lax', path: purpose === 'ADMIN' ? '/admin' : '/api/v1/auth', maxAge: session.expiresAt.getTime() - Date.now() });
        if (purpose === 'ADMIN') target.pathname = '/admin';
      }
      await db.auditLog.create({ data: { actor: account.id, action: purpose === 'ADMIN' ? 'ADMIN_GOOGLE_LOGIN' : 'APP_GOOGLE_LOGIN', entityId: account.id } });
      finish('signed-in');
    } catch { finish('failed'); }
  });
  router.post('/native/exchange', async (req, res) => {
    const input = z.object({ ticket: z.string().regex(/^[A-Za-z0-9_-]{43}$/), verifier: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }).strict().parse(req.body);
    const ticket = await db.nativeLoginTicket.findUnique({ where: { tokenHash: hashToken(input.ticket) }, include: { account: true } });
    if (!ticket || ticket.expiresAt <= new Date() || challenge(input.verifier) !== ticket.challenge || ticket.account.blocked || !appEmailAllowed(ticket.account.email)) { res.sendStatus(401); return; }
    const consumed = await db.nativeLoginTicket.deleteMany({ where: { tokenHash: ticket.tokenHash, expiresAt: { gt: new Date() } } });
    if (!consumed.count) { res.sendStatus(401); return; }
    const session = await issueSession(db, ticket.accountId, 'APP');
    res.json({ token: session.token, expiresAt: session.expiresAt.toISOString(), user: identity(ticket.account) });
  });
  for (const purpose of ['APP', 'ADMIN'] as const) {
    const prefix = purpose === 'ADMIN' ? '/admin' : '';
    router.get(prefix + '/me', async (req, res) => {
      const session = await findSession(db, bearer(req) ?? (purpose === 'APP' ? cookieValue(req, 'utn_app_session') : undefined), purpose);
      if (!session) { res.sendStatus(401); return; }
      res.json({ user: identity(session.account), expiresAt: session.expiresAt.toISOString() });
    });
    router.post(prefix + '/logout', async (req, res) => {
      const token = bearer(req) ?? (purpose === 'APP' ? cookieValue(req, 'utn_app_session') : undefined);
      if (!bearer(req) && req.get('origin') !== appOrigin()) { res.sendStatus(403); return; }
      if (token && /^utn_s_[A-Za-z0-9_-]{43}$/.test(token)) await db.authSession.deleteMany({ where: { tokenHash: hashToken(token), purpose } });
      if (purpose === 'APP') res.clearCookie('utn_app_session', { path: '/api/v1/auth', httpOnly: true, sameSite: 'lax', secure: appOrigin().startsWith('https:') });
      res.sendStatus(204);
    });
  }
  return router;
}
