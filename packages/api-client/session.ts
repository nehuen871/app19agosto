export interface SessionCredentials { token: string; refreshToken: string }
interface SessionStorage {
  load(): Promise<SessionCredentials | null>;
  save(value: SessionCredentials): Promise<void>;
  clear(): Promise<void>;
}
export function createSessionClient({ baseUrl, storage, fetcher = fetch, exclusive = async action => action() }: {
  baseUrl: string; storage: SessionStorage; fetcher?: typeof fetch;
  exclusive?: (action: () => Promise<boolean>) => Promise<boolean>;
}) {
  let credentials: SessionCredentials | null = null, epoch = 0;
  let loading: Promise<void> | undefined, renewal: Promise<boolean> | undefined;
  const listeners = new Set<() => void>();
  async function ready() {
    if (!loading) {
      const initialEpoch = epoch;
      loading = storage.load().then(value => { if (epoch === initialEpoch) credentials = value; }).catch(error => { loading = undefined; throw error; });
    }
    await loading;
  }
  async function clear() {
    epoch++; credentials = null;
    try { await storage.clear(); } finally { for (const listener of listeners) listener(); }
  }
  async function renew() {
    if (!renewal) {
      const initialEpoch = epoch;
      renewal = exclusive(async () => {
        if (epoch !== initialEpoch) return false;
        if (!credentials) {
          const current = await fetcher(baseUrl + '/auth/me', { credentials: 'include', cache: 'no-store', signal: AbortSignal.timeout(15000) });
          if (current.ok) return true;
          if (current.status !== 401) throw new Error('No pudimos comprobar la sesión. Intentá nuevamente.');
        }
        const response = await fetcher(baseUrl + '/auth/refresh', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials ? { refreshToken: credentials.refreshToken } : {}), cache: 'no-store', signal: AbortSignal.timeout(15000) });
        if (epoch !== initialEpoch) return false;
        if (response.status === 401 || response.status === 403) { await clear(); return false; }
        if (!response.ok) throw new Error('No pudimos renovar la sesión. Intentá nuevamente.');
        if (credentials) {
          const value = await response.json() as SessionCredentials;
          if (!/^utn_s_[A-Za-z0-9_-]{43}$/.test(value.token) || !/^utn_r_[A-Za-z0-9_-]{43}$/.test(value.refreshToken)) throw new Error('No pudimos renovar la sesión.');
          const next = { token: value.token, refreshToken: value.refreshToken };
          await storage.save(next);
          if (epoch !== initialEpoch) return false;
          credentials = next;
        }
        return true;
      }).finally(() => { renewal = undefined; });
    }
    return renewal;
  }
  const authenticatedFetch: typeof fetch = async (input, options = {}) => {
    await ready();
    const url = String(input);
    if (!url.startsWith(baseUrl + '/')) throw new Error('La sesión solo se puede utilizar con la API configurada.');
    const initialEpoch = epoch, sentToken = credentials?.token;
    const send = () => {
      const headers = new Headers(options.headers);
      if (credentials) headers.set('Authorization', 'Bearer ' + credentials.token);
      return fetcher(input, { ...options, headers, credentials: 'include' });
    };
    let response = await send();
    if (response.status !== 401 || epoch !== initialEpoch || /\/auth\/(config|native\/exchange|logout)(?:\?|$)/.test(url)) return response;
    const changed = credentials?.token !== sentToken;
    if (changed || await renew()) response = await send();
    if (response.status === 401 && epoch === initialEpoch) await clear();
    return response;
  };
  return {
    fetch: authenticatedFetch,
    headersFor(url: string): Record<string, string> | undefined { return url.startsWith(baseUrl + '/') && credentials ? { Authorization: 'Bearer ' + credentials.token } : undefined; },
    ready,
    credentials: async () => { await ready(); return credentials; },
    setCredentials: async (value: SessionCredentials) => { await ready(); await storage.save(value); epoch++; credentials = value; },
    clear,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
}
