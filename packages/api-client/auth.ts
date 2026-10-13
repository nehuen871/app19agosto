import type { AuthSessionInfo, GoogleLoginConfig } from '@utn/types';
export type { AuthUser, AuthSessionInfo, GoogleLoginConfig } from '@utn/types';
export class AuthRequestError extends Error {
  constructor(public status: number) { super(status === 401 ? 'Tu sesión venció. Volvé a ingresar.' : 'No pudimos conectar. Revisá tu conexión e intentá nuevamente.'); }
}
export function createAuthApiClient(baseUrl: string) {
  async function request<T>(path: string, token?: string | null, body?: unknown): Promise<T> {
    const response = await fetch(baseUrl + '/auth' + path, { method: body ? 'POST' : 'GET', credentials: 'include', cache: 'no-store', headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new AuthRequestError(response.status);
    return response.status === 204 ? undefined as T : response.json() as Promise<T>;
  }
  return {
    config: () => request<GoogleLoginConfig>('/config'),
    me: (token?: string | null) => request<AuthSessionInfo>('/me', token),
    logout: (token?: string | null) => request<void>('/logout', token, {}),
    exchange: (ticket: string, verifier: string) => request<AuthSessionInfo & { token: string }>('/native/exchange', null, { ticket, verifier }),
  };
}
