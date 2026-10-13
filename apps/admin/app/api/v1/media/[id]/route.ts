export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/.test(id)) return new Response(null, { status: 404 });
  try {
    const response = await fetch(`${process.env.API_URL ?? 'http://api:4000/api/v1'}/media/${id}`, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return new Response(null, { status: response.status });
    const type = response.headers.get('Content-Type');
    if (!type || !['image/png', 'image/jpeg'].includes(type)) return new Response(null, { status: 502 });
    return new Response(await response.arrayBuffer(), { headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' } });
  } catch { return new Response(null, { status: 503 }); }
}
