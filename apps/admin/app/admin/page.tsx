import { createApiClient } from '@utn/api-client';
export const dynamic = 'force-dynamic';
export default async function Dashboard() {
  const api = createApiClient(process.env.API_URL ?? 'http://api:4000/api/v1');
  let data;
  try { data = await api.news(); } catch { return <section><h1>No pudimos cargar las noticias</h1><p>El servicio puede estar sin conexión. Volvé a intentar en unos instantes.</p><a href="/admin">Reintentar</a></section>; }
  return <><p className="eyebrow">Panel · Primera etapa</p><h1>Noticias de la facultad</h1><p>Consultá las últimas publicaciones. Las herramientas de edición estarán disponibles próximamente.</p><section aria-label="Noticias publicadas"><h2>Publicadas ({data.total})</h2>{data.items.length === 0 ? <p>Todavía no hay noticias publicadas.</p> : data.items.map(news => <article key={news.id}><span>{news.category.name}{news.featured ? ' · Destacada' : ''}</span><h2>{news.title}</h2><p>{news.summary}</p><details><summary>Ver contenido</summary><p>{news.content}</p></details></article>)}</section></>;
}
