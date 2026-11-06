import { apiUrl } from './environment';
import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createAdminApiClient } from '@utn/api-client';

import { AdminSessionExpired, authenticateAdminSession } from './admin-authentication';

export async function endAdminSession() {
  const token = (await cookies()).get('utn_admin_oauth')?.value;
  if (token && /^utn_s_[A-Za-z0-9_-]{43}$/.test(token)) {
    const response = await fetch(`${apiUrl}/auth/admin/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}', cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!response.ok && response.status !== 401) throw new Error('No pudimos cerrar la sesión. Intentá nuevamente.');
  }
  (await cookies()).set('utn_admin_oauth', '', { httpOnly: true, path: '/admin', maxAge: 0 });
}
export async function requireAdmin(mode: 'page' | 'action' = 'page') {
  const jar = await cookies();
  let token: string;
  try {
    token = await authenticateAdminSession(jar.get('utn_admin_oauth')?.value, apiUrl);
  } catch (error) {
    if (mode === 'page' && error instanceof AdminSessionExpired) redirect('/admin/login?authResult=expired');
    throw error;
  }
  return createAdminApiClient(apiUrl, token);
}
