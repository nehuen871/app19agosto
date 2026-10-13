import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import type { PrismaClient } from './generated/prisma/client';
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const cookieName = 'utn_google_state';
export function googleCalendarConfigured() { return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI); }
export function googleCalendarRouter(db: PrismaClient, fetcher: typeof fetch = fetch) {
  const router = Router();
  const states = new Map<string, { eventId: string; month: string; verifier: string; expiresAt: number }>();
  router.get('/config', (_req, res) => res.json({ enabled: googleCalendarConfigured(), startUrl: googleCalendarConfigured() ? new URL('/api/v1/google-calendar/start', process.env.APP_PUBLIC_URL ?? 'http://localhost:8081').href : null }));
  router.use(rateLimit({ windowMs: 60000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false }));
  const cookieOptions = () => ({ httpOnly: true, sameSite: 'lax' as const, secure: process.env.GOOGLE_REDIRECT_URI?.startsWith('https://') ?? false, path: '/api/v1/google-calendar' });
  const resultUrl = (result: string, month?: string) => { const url = new URL('/calendar', process.env.APP_PUBLIC_URL ?? 'http://localhost:8081'); url.searchParams.set('googleResult', result); if (month) url.searchParams.set('month', month); return url.href; };
  router.get('/start', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!googleCalendarConfigured()) { res.status(503).json({ error: { code: 'GOOGLE_UNAVAILABLE', message: 'Falta configurar la conexión con Google Calendar.', details: [] } }); return; }
    const eventId = z.uuid().parse(req.query.eventId);
    const event = await db.calendarEvent.findFirst({ where: { id: eventId, status: 'PUBLISHED', endsAt: { gt: new Date() } } });
    if (!event) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Evento no disponible.', details: [] } }); return; }
    for (const [key, value] of states) if (value.expiresAt < Date.now()) states.delete(key);
    if (states.size >= 1000) { res.sendStatus(503); return; }
    const state = randomBytes(32).toString('base64url'), verifier = randomBytes(32).toString('base64url');
    const month = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).format(event.startsAt).slice(0, 7);
    states.set(hash(state), { eventId, month, verifier, expiresAt: Date.now() + 600000 });
    res.cookie(cookieName, state, { ...cookieOptions(), maxAge: 600000 });
    const authorization = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authorization.search = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      response_type: 'code', scope: 'openid https://www.googleapis.com/auth/calendar.events',
      state, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256',
      access_type: 'online', prompt: 'consent select_account',
    }).toString();
    res.redirect(authorization.href);
  });
  router.get('/callback', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!googleCalendarConfigured()) { res.redirect(resultUrl('unavailable')); return; }
    const query = z.object({ state: z.string().regex(/^[A-Za-z0-9_-]{43}$/), code: z.string().min(1).max(4096).optional(), error: z.string().max(200).optional() }).safeParse(req.query);
    const cookie = req.headers.cookie?.split(';').map(item => item.trim()).find(item => item.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
    if (!query.success || !cookie || !/^[A-Za-z0-9_-]{43}$/.test(cookie) || !timingSafeEqual(Buffer.from(cookie), Buffer.from(query.data.state))) { res.redirect(resultUrl('invalid')); return; }
    const stateKey = hash(query.data.state), state = states.get(stateKey);
    if (!state || state.expiresAt < Date.now()) { states.delete(stateKey); res.redirect(resultUrl('invalid')); return; }
    states.delete(stateKey); res.clearCookie(cookieName, cookieOptions());
    if (query.data.error || !query.data.code) { res.redirect(resultUrl('cancelled', state.month)); return; }
    try {
      const tokenResponse = await fetcher('https://oauth2.googleapis.com/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: AbortSignal.timeout(10000),
        body: new URLSearchParams({ code: query.data.code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, redirect_uri: process.env.GOOGLE_REDIRECT_URI!, grant_type: 'authorization_code', code_verifier: state.verifier }),
      });
      if (!tokenResponse.ok) throw new Error('GOOGLE_TOKEN');
      const token = z.object({ access_token: z.string().min(1) }).parse(await tokenResponse.json());
      const authorization = { Authorization: `Bearer ${token.access_token}` };
      const identityResponse = await fetcher('https://openidconnect.googleapis.com/v1/userinfo', { headers: authorization, signal: AbortSignal.timeout(10000) });
      if (!identityResponse.ok) throw new Error('GOOGLE_IDENTITY');
      const identity = z.object({ sub: z.string().min(1).max(255) }).parse(await identityResponse.json());
      const event = await db.calendarEvent.findFirst({ where: { id: state.eventId, status: 'PUBLISHED', endsAt: { gt: new Date() } } });
      if (!event) { res.redirect(resultUrl('unavailable', state.month)); return; }
      // Stable Google IDs make repeated acceptance/recovery idempotent per account.
      const googleId = hash(`${process.env.APP_PUBLIC_URL ?? 'http://localhost:8081'}:${event.id}:${identity.sub}`);
      const inserted = await fetcher('https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=none', {
        method: 'POST', headers: { ...authorization, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(10000),
        body: JSON.stringify({ id: googleId, summary: event.title, description: event.description, location: event.location,
          start: { dateTime: event.startsAt.toISOString(), timeZone: 'America/Argentina/Buenos_Aires' },
          end: { dateTime: event.endsAt.toISOString(), timeZone: 'America/Argentina/Buenos_Aires' },
        }),
      });
      if (!inserted.ok && inserted.status !== 409) throw new Error('GOOGLE_INSERT');
      await db.auditLog.create({ data: { actor: 'google:' + hash(identity.sub).slice(0, 16), action: 'EVENT_GOOGLE_SAVED', entityId: event.id } });
      res.redirect(resultUrl(inserted.status === 409 ? 'exists' : 'saved', state.month));
    } catch { res.redirect(resultUrl('failed', state.month)); }
    // Access tokens remain only in this request; refresh tokens are never requested.
  });
  return router;
}
