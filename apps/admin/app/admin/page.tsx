import { requireAdmin } from '../services/admin-session';
import { NewsManager } from './news/news-manager';
export const dynamic = 'force-dynamic';
export default async function Dashboard({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const api = await requireAdmin();
  const params = await searchParams;
  const parsed = Number(params.page ?? 1), page = Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 10000 ? parsed : 1;
  let data;
  try { data = await api.news(page); }
  catch { return <section className="state" role="alert"><h1>No pudimos cargar las noticias</h1><p>Revisá la conexión e intentá nuevamente.</p><a href="/admin">Reintentar</a></section>; }
  return <>
    <div className="page-intro"><p className="eyebrow">Administración</p><h1>Noticias de la facultad</h1><p>Creá una noticia, guardala como borrador o publicala en la app.</p></div>
    <NewsManager news={data.items} total={data.total} page={page} limit={data.limit} />
  </>;
}
