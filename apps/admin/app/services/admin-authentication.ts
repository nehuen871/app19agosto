
export class AdminSessionExpired extends Error {
  constructor() { super('Tu sesión venció. Volvé a ingresar en otra pestaña y luego reintentá guardar.'); }
}
export async function authenticateAdminSession(
  token: string | undefined,
  apiUrl: string,
  fetcher: typeof fetch = fetch,
) {
  if (token) {
    if (!/^utn_s_[A-Za-z0-9_-]{43}$/.test(token)) throw new AdminSessionExpired();
    let response: Response;
    try {
      response = await fetcher(`${apiUrl}/auth/admin/me`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(10000) });
    } catch { throw new Error('No pudimos comprobar tu sesión. Intentá guardar nuevamente.'); }
    if (response.status === 401 || response.status === 403) throw new AdminSessionExpired();
    if (!response.ok) throw new Error(response.status === 429 ? 'Hay demasiadas solicitudes. Esperá un minuto y volvé a guardar.' : 'No pudimos comprobar tu sesión. Intentá guardar nuevamente.');
    return token;
  }
  throw new AdminSessionExpired();
}
