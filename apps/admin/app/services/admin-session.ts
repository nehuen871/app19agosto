import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createAdminApiClient } from '@utn/api-client';

const cookieName = 'utn_admin';
const lifetime = 60 * 60 * 8;
function accessKey() {
  const key = process.env.ADMIN_ACCESS_TOKEN;
  if (!key || key.length < 32) throw new Error('El acceso administrativo no está configurado.');
  return key;
}
function equal(a: string, b: string) {
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
function sign(value: string) { return createHmac('sha256', accessKey()).update(value).digest('base64url'); }
export async function startAdminSession(supplied: string) {
  if (!equal(supplied, accessKey())) return false;
  (await cookies()).set('utn_admin_oauth', '', { path: '/admin', maxAge: 0 });
  const expires = String(Math.floor(Date.now() / 1000) + lifetime);
  (await cookies()).set(cookieName, `${expires}.${sign(expires)}`, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict',
    path: '/admin', maxAge: lifetime,
  });
  return true;
}
export async function endAdminSession() {
  const token = (await cookies()).get('utn_admin_oauth')?.value;
  if (token && /^utn_s_[A-Za-z0-9_-]{43}$/.test(token)) {
    const response = await fetch(`${process.env.API_URL ?? 'http://api:4000/api/v1'}/auth/admin/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}', cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('No pudimos cerrar la sesión. Intentá nuevamente.');
  }
  (await cookies()).set('utn_admin_oauth', '', { httpOnly: true, path: '/admin', maxAge: 0 });
  (await cookies()).set(cookieName, '', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/admin', maxAge: 0 });
}
export async function requireAdmin() {
  const oauthToken = (await cookies()).get('utn_admin_oauth')?.value;
  if (oauthToken) {
    const response = await fetch(`${process.env.API_URL ?? 'http://api:4000/api/v1'}/auth/admin/me`, { headers: { Authorization: `Bearer ${oauthToken}` }, cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!response.ok) redirect('/admin/login?authResult=expired');
    return createAdminApiClient(process.env.API_URL ?? 'http://api:4000/api/v1', oauthToken);
  }
  const value = (await cookies()).get(cookieName)?.value;
  const [expires, signature] = value?.split('.') ?? [];
  if (!expires || !signature || !/^\d+$/.test(expires) || Number(expires) <= Date.now() / 1000 || !equal(signature, sign(expires))) redirect('/admin/login');
  return createAdminApiClient(process.env.API_URL ?? 'http://api:4000/api/v1', accessKey());
}
