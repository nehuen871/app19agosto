import { requireAdmin } from '../services/admin-session';
import { NewsForm } from './news/form';
export const dynamic = 'force-dynamic';
export default async function Dashboard({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const api = await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, Math.min(10000, Number(params.page) || 1));
  let data;
  try { data = await api.news(page); }
  catch { return <section className="state" role="alert"><h1>No pudimos cargar las noticias</h1><p>Revisá la conexión e intentá nuevamente.</p><a href="/admin">Reintentar</a></section>; }
  return <>
    <div className="page-intro"><p className="eyebrow">Administración</p><h1>Noticias de la facultad</h1><p>Creá una noticia, guardala como borrador o publicala en la app.</p></div>
    <div className="notification-columns"><section><h2>Nueva noticia</h2><NewsForm /></section>
      <section><h2>Noticias guardadas</h2><div className="notification-list">{data.items.length === 0 ? <p>Todavía no hay noticias guardadas.</p> : data.items.map(news => <article className="news-card" key={news.id}><div className="badges"><span className="badge">{news.status === 'PUBLISHED' ? 'Publicada' : news.status === 'DRAFT' ? 'Borrador' : 'Archivada'}</span><span className="badge">{news.category.name}</span></div><h3>{news.title}</h3><p>{news.summary}</p></article>)}</div><nav className="pagination" aria-label="Páginas de noticias">{page > 1 && <a href={`/admin?page=${page - 1}`}>Anterior</a>}{page * data.limit < data.total && <a href={`/admin?page=${page + 1}`}>Siguiente</a>}</nav></section>
    </div>
  </>;
}
