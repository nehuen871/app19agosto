import type { AuthSessionInfo, GoogleLoginConfig } from '@utn/types';
export type { AuthUser, AuthSessionInfo, GoogleLoginConfig } from '@utn/types';
export class AuthRequestError extends Error {
  constructor(public status: number) { super(status === 401 ? 'Tu sesión venció. Volvé a ingresar.' : 'No pudimos conectar. Revisá tu conexión e intentá nuevamente.'); }
}
export function createAuthApiClient(baseUrl: string, purpose: 'APP' | 'ADMIN' = 'APP', fetcher: typeof fetch = fetch) {
  async function request<T>(path: string, token?: string | null, body?: unknown, method = body ? 'POST' : 'GET'): Promise<T> {
    const response = await fetcher(baseUrl + '/auth' + path, { method, credentials: 'include', cache: 'no-store', headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new AuthRequestError(response.status);
    return response.status === 204 ? undefined as T : response.json() as Promise<T>;
  }
  const prefix = purpose === 'ADMIN' ? '/admin' : '';
  return {
    config: () => request<GoogleLoginConfig>('/config'),
    me: (token?: string | null) => request<AuthSessionInfo>(prefix + '/me', token),
    updateProfile: (name: string, token?: string | null) => request<AuthSessionInfo>(prefix + '/me', token, { name }, 'PATCH'),
    logout: (token?: string | null, refreshToken?: string) => request<void>(prefix + '/logout', token, refreshToken ? { refreshToken } : {}),
    exchange: (ticket: string, verifier: string) => request<AuthSessionInfo & { token: string; refreshToken: string; refreshExpiresAt: string }>('/native/exchange', null, { ticket, verifier }),
  };
}
