import 'server-only';
// Fixed upstream routes: this is not a general authenticated API proxy.
export async function googleOAuth(request: Request, route: 'config' | 'start' | 'callback') {
  const url = new URL(`${process.env.API_URL ?? 'http://api:4000/api/v1'}/auth/${route === 'config' ? 'config' : 'google/' + route}`);
  url.searchParams.set('purpose', 'admin');
  if (route === 'callback') {
    const incoming = new URL(request.url);
    for (const key of ['state', 'code', 'error']) {
      const value = incoming.searchParams.get(key);
      if (value !== null) url.searchParams.set(key, value);
    }
  }
  try {
    const upstream = await fetch(url, { redirect: 'manual', cache: 'no-store', headers: request.headers.get('cookie') ? { Cookie: request.headers.get('cookie')! } : {}, signal: AbortSignal.timeout(35000) });
    const headers = new Headers({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'Content-Type': upstream.headers.get('content-type') ?? 'text/plain' });
    const location = upstream.headers.get('location'); if (location) headers.set('Location', location);
    for (const cookie of upstream.headers.getSetCookie()) headers.append('Set-Cookie', cookie);
    return new Response(await upstream.text(), { status: upstream.status, headers });
  } catch { return Response.json({ error: 'El login con Google no está disponible. Intentá nuevamente.' }, { status: 503 }); }
}
